<template>
  <div class="hero">
    <div
      class="hero-image"
      role="button"
      tabindex="0"
      :aria-label="translate('Edit image URL')"
      @click="$emit('editImage')"
      @keyup.enter="$emit('editImage')"
      @keyup.space.prevent="$emit('editImage')"
    >
      <DxpShopifyImg
        :src="core?.imageUrl ?? ''"
        size="grande"
      />
    </div>

    <div class="hero-main">
      <div class="hero-main-head">
        <div>
          <p class="hero-overline">
            {{ familyAnchor ? translate("Parent product") : translate("Product") }} · {{ core?.productId }}
          </p>
          <h2 class="hero-title">
            {{ translate("Product information") }}
          </h2>
        </div>
      </div>

      <div class="hero-form">
        <ion-input
          v-model="draft.productName"
          :label="translate('Name')"
          label-placement="stacked"
          :disabled="!canEdit"
          fill="outline"
        />
        <ion-input
          v-model="draft.internalName"
          :label="translate('Internal name')"
          label-placement="stacked"
          :disabled="!canEdit"
          fill="outline"
        />
        <ion-input
          v-model="draft.brandName"
          :label="translate('Brand name')"
          label-placement="stacked"
          :disabled="!canEdit"
          fill="outline"
        />
        <ion-select
          v-model="draft.productTypeId"
          :label="translate('Type')"
          label-placement="stacked"
          interface="popover"
          :disabled="!canEdit"
          fill="outline"
        >
          <ion-select-option
            v-for="option in productTypes"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </ion-select-option>
        </ion-select>
      </div>

      <div class="hero-footer">
        <SaveFooter
          :dirty="dirty"
          :saving="saving"
          :can-save="canEdit"
          :stale-under-edit="staleUnderEdit"
          @save="$emit('save')"
          @reset="$emit('reset')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DxpShopifyImg, translate } from "@common"
import { IonInput, IonSelect, IonSelectOption } from "@ionic/vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import type { CatalogOption, ProductCore } from "@/domain/types/product"

withDefaults(defineProps<{
  core: ProductCore | null
  draft: {
    productName: string
    internalName: string
    brandName: string
    productTypeId: string
  }
  familyAnchor: boolean
  productTypes: CatalogOption[]
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
  canEdit?: boolean
}>(), {
  canEdit: true
})

defineEmits<{
  (event: "editImage"): void
  (event: "save"): void
  (event: "reset"): void
}>()
</script>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(220px, 343px) 1fr;
  gap: 16px;
  padding: 16px;
  align-items: start;
}

.hero-image :deep(img) {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
  object-fit: contain;
}

.hero-main-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.hero-overline {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ion-color-medium);
}

.hero-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.hero-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.hero-footer {
  min-height: 48px;
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-step-150, #d9d9de);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-form {
    grid-template-columns: 1fr;
  }
}
</style>
