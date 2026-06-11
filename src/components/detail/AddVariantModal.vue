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

      <!-- Image upload -->
      <div class="image-upload">
        <div
          class="image-preview"
          @click="triggerFilePicker"
        >
          <img
            v-if="imagePreviewUrl"
            :src="imagePreviewUrl"
            alt="Product image preview"
          />
          <div
            v-else
            class="image-placeholder"
          >
            <ion-icon :icon="imageOutline" />
            <p>{{ translate("Tap to upload image") }}</p>
          </div>
        </div>
        <ion-button
          v-if="imagePreviewUrl"
          fill="clear"
          size="small"
          color="danger"
          @click="clearImage"
        >
          {{ translate("Remove image") }}
        </ion-button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onFileChange"
        />
      </div>
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
  IonButton, IonButtons, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonLabel,
  IonModal, IonSpinner, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, reactive, ref, watch } from "vue"
import { checkmarkOutline, imageOutline } from "ionicons/icons"
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

// Image upload
const fileInput = ref<HTMLInputElement | null>(null)
const imageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)

const triggerFilePicker = () => fileInput.value?.click()

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if(!file) {return}
  imageFile.value = file
  imagePreviewUrl.value = URL.createObjectURL(file)
}

const clearImage = () => {
  imageFile.value = null
  if(imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imagePreviewUrl.value = null
  if(fileInput.value) fileInput.value.value = ""
}

/** All axes must have exactly one value selected before the variant can be created */
const hasSelection = computed(
  () => props.featureAxes.length > 0 &&
    props.featureAxes.every((axis) => Boolean(selection[axis.featureTypeId]))
)

// Reset selection and image when modal opens
watch(
  () => props.isOpen,
  (open) => {
    if(!open) {return}
    for(const key of Object.keys(selection)) {
      delete selection[key]
    }
    clearImage()
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
    // 1. Create the new variant product (with image if provided)
    const { productId } = await createProduct({ isVariant: "Y" }, imageFile.value ?? undefined)

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

.image-upload {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.image-preview {
  width: 100%;
  max-width: 240px;
  aspect-ratio: 1;
  border: 2px dashed var(--ion-color-medium);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--ion-color-medium);
}

.image-placeholder ion-icon {
  font-size: 36px;
}

.image-placeholder p {
  margin: 0;
  font-size: 13px;
}
</style>
