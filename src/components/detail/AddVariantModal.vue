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
      <p
        v-if="!featureAxes.length"
        class="empty-text"
      >
        {{ translate("No selectable features defined on this product yet.") }}
      </p>

      <div
        v-for="axis in featureAxes"
        :key="axis.featureTypeId"
        class="axis"
      >
        <p class="axis-label">
          {{ axis.featureTypeDescription }}
        </p>
        <div class="axis-chips">
          <ion-chip
            v-for="appl in axis.applications"
            :key="appl.productFeatureId"
            outline
            class="value-chip"
            :class="{ 'value-chip--selected': selection[axis.featureTypeId] === appl.productFeatureId }"
            @click="toggleSelection(axis.featureTypeId, appl.productFeatureId)"
          >
            <ion-icon
              v-if="selection[axis.featureTypeId] === appl.productFeatureId"
              :icon="checkmarkOutline"
            />
            <ion-label>{{ appl.description }}</ion-label>
          </ion-chip>
        </div>
      </div>

      <ion-list lines="none">
        <ion-item>
          <ion-input
            v-model="imageUrl"
            :label="translate('Image URL')"
            label-placement="stacked"
            fill="outline"
            type="url"
            clear-input
          />
        </ion-item>
      </ion-list>
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
import {
  IonButton, IonButtons, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel,
  IonList, IonModal, IonSpinner, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, reactive, ref, watch } from "vue"
import { checkmarkOutline } from "ionicons/icons"
import { translate } from "@common"
import { createProduct, createAssociation, applyFeature, triggerSolrIndex } from "@/api/pim"
import { ASSOC_TYPE } from "@/domain/normalize/association"
import { FEATURE_APPL_TYPE } from "@/domain/normalize/feature"
import type { FeatureAxis } from "@/domain/types/product"

const props = defineProps<{
  isOpen: boolean
  featureAxes: FeatureAxis[]
  parentProductId: string
}>()

const emit = defineEmits<{
  (event: "created", productId: string): void
  (event: "dismiss"): void
}>()

/** featureTypeId → productFeatureId */
const selection = reactive<Record<string, string>>({})
const creating = ref(false)
const imageUrl = ref("")

/** All axes must have exactly one value selected before the variant can be created */
const hasSelection = computed(
  () => props.featureAxes.length > 0 &&
    props.featureAxes.every((axis) => Boolean(selection[axis.featureTypeId]))
)

// Reset selection and image URL when modal opens
watch(
  () => props.isOpen,
  (open) => {
    if(!open) {return}
    for(const key of Object.keys(selection)) {
      delete selection[key]
    }
    imageUrl.value = ""
  }
)

const toggleSelection = (featureTypeId: string, productFeatureId: string) => {
  if(selection[featureTypeId] === productFeatureId) {
    delete selection[featureTypeId]
  } else {
    selection[featureTypeId] = productFeatureId
  }
}

const createVariant = async () => {
  if(!hasSelection.value || creating.value) {return}
  creating.value = true
  try {
    // 1. Create the new variant product (with image URL if provided)
    const { productId } = await createProduct({
      isVariant: "Y",
      smallImageUrl: imageUrl.value.trim() || undefined
    })

    // 2. Link it to the parent as a variant association
    await createAssociation(props.parentProductId, {
      productIdTo: productId,
      productAssocTypeId: ASSOC_TYPE.variant
    })

    triggerSolrIndex(props.parentProductId)

    // 3. Apply each selected feature to the new variant
    const selectedFeatureIds = Object.values(selection).filter(Boolean)
    await Promise.all(
      selectedFeatureIds.map((productFeatureId) =>
        applyFeature(productId, {
          productFeatureId,
          productFeatureApplTypeId: FEATURE_APPL_TYPE.standard
        })
      )
    )

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

.axis {
  margin-bottom: 16px;
}

.axis-label {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.axis-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.value-chip {
  cursor: pointer;
}

.value-chip--selected {
  --color: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  font-weight: 600;
}

.value-chip--selected ion-icon {
  color: var(--ion-color-primary);
}

</style>
