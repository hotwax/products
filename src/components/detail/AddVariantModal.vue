<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Add variant") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('dismiss')">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="selection-help">
        {{ translate("Select a missing feature combination to create.") }}
      </p>

      <p
        v-if="!allowedSelections.length"
        class="empty-text"
      >
        {{ translate("All feature combinations have already been created.") }}
      </p>

      <ion-radio-group
        v-else
        v-model="selectedSelectionIndex"
      >
        <ion-list class="combination-list">
          <ion-item
            v-for="(selection, index) in allowedSelections"
            :key="combinationKey(selection)"
          >
            <ion-radio
              label-placement="end"
              justify="start"
              :value="String(index)"
            >
              <ion-label>
                {{ combinationLabel(selection) }}
                <p>{{ combinationDetails(selection) }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-list>
      </ion-radio-group>

      <ion-input
        v-model="imageUrl"
        :label="translate('Image URL')"
        label-placement="stacked"
        fill="outline"
        type="url"
        clear-input
      />
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button
          expand="block"
          class="ion-margin"
          :disabled="!hasSelection || creating"
          @click="createVariant"
        >
          <ion-spinner
            v-if="creating"
            name="crescent"
          />
          <template v-else>
            {{ translate("Create variant") }}
          </template>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonSpinner,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { computed, ref, watch } from "vue"
import { applyFeature, createAssociation, createProduct, triggerSolrIndex } from "@/api/pim"
import { ASSOC_TYPE } from "@/domain/normalize/association"
import { FEATURE_APPL_TYPE } from "@/domain/normalize/feature"
import type { FeatureAxis } from "@/domain/types/product"

const props = defineProps<{
  isOpen: boolean
  featureAxes: FeatureAxis[]
  parentProductId: string
  allowedSelections: Record<string, string>[]
}>()

const emit = defineEmits<{
  (event: "created", productId: string): void
  (event: "dismiss"): void
}>()

const selectedSelectionIndex = ref("")
const creating = ref(false)
const imageUrl = ref("")

const selectedFeatures = computed(() => {
  if(!selectedSelectionIndex.value) {return undefined}
  const index = Number(selectedSelectionIndex.value)

  return Number.isInteger(index) ? props.allowedSelections[index] : undefined
})

const hasSelection = computed(() => Boolean(selectedFeatures.value))

const applicationFor = (featureTypeId: string, productFeatureId: string) =>
  props.featureAxes
    .find((axis) => axis.featureTypeId === featureTypeId)
    ?.applications.find((application) => application.productFeatureId === productFeatureId)

const combinationLabel = (selection: Record<string, string>) =>
  props.featureAxes
    .map((axis) => applicationFor(axis.featureTypeId, selection[axis.featureTypeId])?.description)
    .filter(Boolean)
    .join(" / ")

const combinationDetails = (selection: Record<string, string>) =>
  props.featureAxes
    .map((axis) => {
      const value = applicationFor(axis.featureTypeId, selection[axis.featureTypeId])?.description

      return value ? `${axis.featureTypeDescription}: ${value}` : ""
    })
    .filter(Boolean)
    .join(" · ")

const combinationKey = (selection: Record<string, string>) =>
  props.featureAxes.map((axis) => selection[axis.featureTypeId]).join(":")

watch(
  () => props.isOpen,
  (open) => {
    if(!open) {return}
    selectedSelectionIndex.value = ""
    imageUrl.value = ""
  }
)

const createVariant = async () => {
  if(!hasSelection.value || creating.value) {return}
  creating.value = true
  try {
    // 1. Create the new variant product (with image URL if provided)
    const { productId } = await createProduct({
      isVariant: "Y",
      detailImageUrl: imageUrl.value.trim() || undefined
    })

    // 2. Link it to the parent as a variant association
    await createAssociation(props.parentProductId, {
      productIdTo: productId,
      productAssocTypeId: ASSOC_TYPE.variant
    })

    triggerSolrIndex(props.parentProductId)

    // 3. Apply each selected feature to the new variant
    const selectedFeatureIds = Object.values(selectedFeatures.value ?? {}).filter(Boolean)
    await Promise.all(selectedFeatureIds.map((productFeatureId) => applyFeature(productId, {
      productFeatureId,
      productFeatureApplTypeId: FEATURE_APPL_TYPE.standard
    })))

    emit("created", productId)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.empty-text {
  color: var(--ion-color-medium);
  font-size: 14px;
}

.selection-help {
  margin-top: 0;
  color: var(--ion-color-medium);
}

.combination-list {
  margin-bottom: 16px;
  padding: 0;
}

</style>
