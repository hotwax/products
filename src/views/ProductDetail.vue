<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/products" />
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Product details") }}</ion-title>
        <ion-progress-bar
          v-if="coreLoading"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ErrorState
        v-if="coreError"
        :title="translate('Product detail failed')"
        :message="coreErrorText"
        @retry="refetchCore"
      />

      <template v-else>
        <ProductHero
          :core="core"
          :parent-link="parentLink"
          :product-types="productTypes"
        >
          <template #side>
            <IdentificationsCard
              :product-id="editingProductId"
              :identifications="identifications"
              :identification-types="identificationTypes"
              @add="onAddIdentification"
              @update-value="onUpdateIdentification"
              @expire="onExpireIdentification"
            />
          </template>
        </ProductHero>

        <FeaturesSection
          :family-axes="familyFeatureAxes"
          :applied-feature-ids="appliedFeatureIds"
          :feature-types="featureTypes"
          @toggle="onToggleFeature"
          @create-value="onCreateFeatureValue"
        />

        <ion-segment
          v-if="hasParent"
          :value="segment"
          class="edit-segment"
          @ion-change="setSegment(($event.detail.value as 'parent' | 'variant') ?? 'variant')"
        >
          <ion-segment-button value="parent">
            <ion-label>{{ translate("Edit parent") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="variant">
            <ion-label>{{ translate("Edit variant") }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <DisplayCard
          :draft="editor.display.draft"
          :product-types="productTypes"
          :dirty="editor.display.dirty.value"
          :saving="editor.saving.value"
          :stale-under-edit="editor.display.staleUnderEdit.value"
          @save="editor.saveDisplay"
          @reset="editor.display.reset"
        />

        <DatesCard
          :draft="editor.dates.draft"
          :can-copy-from-parent="segment === 'variant' && hasParent"
          :dirty="editor.dates.dirty.value"
          :saving="editor.saving.value"
          :stale-under-edit="editor.dates.staleUnderEdit.value"
          @save="editor.saveDates"
          @reset="editor.dates.reset"
          @copy-from-parent="editor.copyFromParent('dates')"
        />

        <ComponentsCard
          v-if="isKit"
          :components="associationGroups.components"
          @add-component="picker = 'component'"
          @expire-component="onExpireAssociation"
          @reactivate-component="onReactivateAssociation"
        />

        <InventoryPolicyCard
          :draft="editor.policy.draft"
          :substitutes="associationGroups.substitutes"
          :dirty="editor.policy.dirty.value"
          :saving="editor.saving.value"
          :stale-under-edit="editor.policy.staleUnderEdit.value"
          @save="editor.savePolicy"
          @reset="editor.policy.reset"
          @add-substitute="picker = 'substitute'"
          @expire-substitute="onExpireAssociation"
          @reactivate-substitute="onReactivateAssociation"
        />

        <ShippingHandlingCard
          :draft="editor.shipping.draft"
          :box-types="boxTypes"
          :can-copy-from-parent="segment === 'variant' && hasParent"
          :dirty="editor.shipping.dirty.value"
          :saving="editor.saving.value"
          :stale-under-edit="editor.shipping.staleUnderEdit.value"
          @save="editor.saveShipping"
          @reset="editor.shipping.reset"
          @copy-from-parent="editor.copyFromParent('shipping')"
        />

        <HistoryCard :entries="audit" />

        <ProductPicker
          :is-open="picker !== null"
          :title="picker === 'component' ? translate('Add components') : translate('Add substitute')"
          :exclude-product-ids="excludedPickerIds"
          @select="onPickProduct"
          @dismiss="picker = null"
        />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonLabel, IonMenuButton, IonPage, IonProgressBar, IonSegment,
  IonSegmentButton, IonTitle, IonToolbar, alertController
} from "@ionic/vue"
import { computed, ref, toRef } from "vue"
import { onBeforeRouteLeave } from "vue-router"
import { useQuery } from "@tanstack/vue-query"
import { translate } from "@common"
import ErrorState from "@/components/ErrorState.vue"
import ProductHero from "@/components/detail/ProductHero.vue"
import IdentificationsCard from "@/components/detail/IdentificationsCard.vue"
import FeaturesSection from "@/components/detail/FeaturesSection.vue"
import DisplayCard from "@/components/detail/DisplayCard.vue"
import DatesCard from "@/components/detail/DatesCard.vue"
import InventoryPolicyCard from "@/components/detail/InventoryPolicyCard.vue"
import ComponentsCard from "@/components/detail/ComponentsCard.vue"
import ShippingHandlingCard from "@/components/detail/ShippingHandlingCard.vue"
import HistoryCard from "@/components/detail/HistoryCard.vue"
import ProductPicker from "@/components/detail/ProductPicker.vue"
import { errorMessage } from "@/api/http"
import { useProductDetailData } from "@/composables/useProductDetailData"
import { useProductEditor } from "@/composables/useProductEditor"
import { useIdentificationMutations } from "@/mutations/useIdentificationMutations"
import { useAssociationMutations } from "@/mutations/useAssociationMutations"
import { useFeatureMutations } from "@/mutations/useFeatureMutations"
import { useToast } from "@/composables/useToast"
import { identificationTypesOptions, featureTypesOptions } from "@/queries/catalog"
import { ASSOC_TYPE } from "@/domain/normalize/association"
import { FEATURE_APPL_TYPE } from "@/domain/normalize/feature"
import { productDisplayName } from "@/domain/normalize/product"
import type { ProductAssociation, ProductSummary, FeatureAxis, ProductFeatureApplication } from "@/domain/types/product"
import type { IdentificationCreate, IdentificationKey } from "@/domain/types/pim"

const props = defineProps<{ productId: string }>()
const toast = useToast()

const detail = useProductDetailData(toRef(props, "productId"))
const {
  editingProductId, parentProductId, segment, setSegment, hasParent,
  routeCore, core, coreLoading, coreError, coreErrorValue, refetchCore,
  identifications, associationGroups,
  familyFeatureAxes, editingFeatureAxes, featureFamilyId,
  audit, productTypes, boxTypes
} = detail

const editor = useProductEditor(editingProductId, core, parentProductId)

const identificationMutations = useIdentificationMutations(() => editingProductId.value)
const associationMutations = useAssociationMutations(() => editingProductId.value)
// feature edits apply to whichever family member is being edited
const featureMutations = useFeatureMutations(() => editingProductId.value)
// "new value" chips extend the family's selectable axes on the parent
const familyFeatureMutations = useFeatureMutations(() => featureFamilyId.value)

const identificationTypesQuery = useQuery(identificationTypesOptions())
const featureTypesQuery = useQuery(featureTypesOptions())
const identificationTypes = computed(() => identificationTypesQuery.data.value ?? [])
const featureTypes = computed(() => featureTypesQuery.data.value ?? [])

const coreErrorText = computed(() => errorMessage(coreErrorValue.value, translate("Could not load this product")))

const parentLink = computed(() => {
  if (!hasParent.value || !routeCore.value?.isVariant) return null
  return { productId: parentProductId.value, name: translate("View parent product") }
})

const isKit = computed(() => (core.value?.productTypeId ?? "").startsWith("MARKETING_PKG"))

// ---------- identifications ----------
const onAddIdentification = (payload: IdentificationCreate) =>
  identificationMutations.add.mutateAsync(payload).catch((error) => toast.error(error, translate("Could not add identification")))
const onUpdateIdentification = (payload: { key: IdentificationKey; idValue: string }) =>
  identificationMutations.update.mutateAsync(payload).catch((error) => toast.error(error, translate("Could not update identification")))
const onExpireIdentification = (key: IdentificationKey) =>
  identificationMutations.expire.mutateAsync(key).catch((error) => toast.error(error, translate("Could not expire identification")))

// ---------- features ----------
const appliedFeatureIds = computed(
  () => new Set(editingFeatureAxes.value.flatMap((axis: FeatureAxis) => axis.applications.map((appl) => appl.productFeatureId)))
)

const onToggleFeature = (payload: { axis: FeatureAxis; application: ProductFeatureApplication; applied: boolean }) => {
  const editingParent = segment.value === "parent" || !hasParent.value
  const applType = editingParent ? FEATURE_APPL_TYPE.selectable : FEATURE_APPL_TYPE.standard
  if (payload.applied) {
    const existing = editingFeatureAxes.value
      .flatMap((axis: FeatureAxis) => axis.applications)
      .find((appl: ProductFeatureApplication) => appl.productFeatureId === payload.application.productFeatureId)
    if (!existing) return
    featureMutations.remove
      .mutateAsync({ productFeatureId: existing.productFeatureId, fromDate: existing.fromDate })
      .catch((error) => toast.error(error, translate("Could not remove feature")))
  } else {
    featureMutations.apply
      .mutateAsync({
        productFeatureId: payload.application.productFeatureId,
        productFeatureApplTypeId: applType,
        description: payload.application.description,
        featureTypeId: payload.axis.featureTypeId,
        featureTypeDescription: payload.axis.featureTypeDescription
      })
      .catch((error) => toast.error(error, translate("Could not apply feature")))
  }
}

const onCreateFeatureValue = (payload: { featureTypeId: string; description: string }) =>
  familyFeatureMutations.createAndApply
    .mutateAsync({
      productFeatureTypeId: payload.featureTypeId,
      description: payload.description,
      productFeatureApplTypeId: FEATURE_APPL_TYPE.selectable
    })
    .then(() => toast.success(`${payload.description} ${translate("added")}`))
    .catch((error) => toast.error(error, translate("Could not add feature")))

// ---------- associations (substitutes + kit components) ----------
const picker = ref<null | "substitute" | "component">(null)

const excludedPickerIds = computed(() => [
  editingProductId.value,
  ...associationGroups.value.substitutes.map((assoc: ProductAssociation) => assoc.relatedProductId),
  ...associationGroups.value.components.map((assoc: ProductAssociation) => assoc.relatedProductId)
])

const onPickProduct = (product: ProductSummary) => {
  const typeId = picker.value === "component" ? ASSOC_TYPE.component : ASSOC_TYPE.substitute
  picker.value = null
  associationMutations.add
    .mutateAsync({
      productIdTo: product.productId,
      productAssocTypeId: typeId,
      quantity: typeId === ASSOC_TYPE.component ? 1 : undefined,
      relatedName: productDisplayName(product),
      relatedSku: product.sku,
      relatedImageUrl: product.imageUrl
    })
    .then(() => toast.success(translate("Link added")))
    .catch((error) => toast.error(error, translate("Could not add link")))
}

const assocKey = (assoc: ProductAssociation) => ({
  productIdTo: assoc.productIdTo,
  productAssocTypeId: assoc.productAssocTypeId,
  fromDate: assoc.fromDate
})

const onExpireAssociation = (assoc: ProductAssociation) =>
  associationMutations.expire
    .mutateAsync({ key: assocKey(assoc) })
    .catch((error) => toast.error(error, translate("Could not expire link")))

const onReactivateAssociation = (assoc: ProductAssociation) =>
  associationMutations.reactivate
    .mutateAsync(assocKey(assoc))
    .catch((error) => toast.error(error, translate("Could not reactivate link")))

// ---------- unsaved-changes guard ----------
onBeforeRouteLeave(async () => {
  if (!editor.anyDirty.value) return true
  const alert = await alertController.create({
    header: translate("Discard changes?"),
    message: translate("You have unsaved edits on this product."),
    buttons: [
      { text: translate("Keep editing"), role: "cancel" },
      { text: translate("Discard"), role: "destructive" }
    ]
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  return role === "destructive"
})
</script>

<style scoped>
.edit-segment {
  max-width: 320px;
  margin: 8px 16px;
}
</style>
