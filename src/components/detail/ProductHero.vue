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
        size="medium"
      />
      <div class="image-badge">
        <ion-icon :icon="cameraOutline" />
      </div>
    </div>

    <div class="hero-main">
      <div class="hero-identity-row">
        <div class="hero-identity-content">
          <div class="hero-badges">
            <ion-badge v-if="familyAnchor" color="primary">
              {{ translate("Parent") }}
            </ion-badge>
            <ion-badge v-else-if="core?.isVariant" color="tertiary">
              {{ translate("Variant") }}
            </ion-badge>
            <ion-badge v-if="core?.productId" color="light">
              {{ core?.productId }}
            </ion-badge>
            <ion-badge v-if="typeLabel && typeLabel !== '—'" color="medium">
              {{ typeLabel }}
            </ion-badge>
          </div>

          <h1 class="hero-title">
            {{ core?.productName || core?.productId || translate("Product") }}
          </h1>

          <div class="hero-meta-row">
            <span v-if="core?.internalName" class="meta-item">
              <ion-note><strong>{{ translate("Internal name") }}:</strong> {{ core.internalName }}</ion-note>
            </span>
            <span v-if="core?.brandName" class="meta-item">
              <ion-note><strong>{{ translate("Brand") }}:</strong> {{ core.brandName }}</ion-note>
            </span>
          </div>
        </div>

        <div class="hero-actions">
          <ion-button
            fill="outline"
            size="small"
            @click="$emit('edit')"
          >
            <ion-icon slot="start" :icon="pencilOutline" />
            {{ translate("Edit details") }}
          </ion-button>
        </div>
      </div>

      <div v-if="hasParent" class="hero-family-controls">
        <div v-if="segment === 'variant'" class="hero-context-row">
          <ion-button
            fill="clear"
            size="small"
            class="parent-breadcrumb-btn"
            @click="$emit('changeSegment', 'parent')"
          >
            <ion-icon slot="start" :icon="arrowBackOutline" />
            {{ translate("View parent style") }}
          </ion-button>

          <div v-if="variants && variants.length > 1" class="variant-selector-wrap">
            <ion-select
              interface="popover"
              :value="selectedVariantId"
              :aria-label="translate('Select variant')"
              @ion-change="$emit('selectVariant', $event.detail.value)"
            >
              <ion-select-option
                v-for="v in variants"
                :key="v.productId"
                :value="v.productId"
              >
                {{ variantDisplayName(v) }}
              </ion-select-option>
            </ion-select>
          </div>
        </div>

        <div v-else class="hero-context-row">
          <ion-badge color="primary">
            {{ translate("Parent style") }}
          </ion-badge>
          <ion-button
            v-if="variants && variants.length > 0"
            fill="outline"
            size="small"
            class="switch-variant-btn"
            @click="$emit('changeSegment', 'variant')"
          >
            {{ translate("Edit active variant") }} ({{ variants.length }})
          </ion-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  IonBadge, IonButton, IonIcon, IonNote, IonSelect, IonSelectOption
} from "@ionic/vue"
import { computed } from "vue"
import { arrowBackOutline, cameraOutline, pencilOutline } from "ionicons/icons"
import { DxpShopifyImg, translate } from "@common"
import { useProductIdentity } from "@/composables/useProductIdentity"
import type { CatalogOption, ProductCore } from "@/domain/types/product"
import type { FamilyVariant } from "@/domain/product/family"

const props = withDefaults(
  defineProps<{
    core: ProductCore | null
    familyAnchor: boolean
    productTypes: CatalogOption[]
    hasParent?: boolean
    segment?: "parent" | "variant"
    variants?: FamilyVariant[]
    selectedVariantId?: string
  }>(),
  {
    hasParent: false,
    segment: "variant",
    variants: () => [],
    selectedVariantId: ""
  }
)

defineEmits<{
  (event: "edit"): void
  (event: "editImage"): void
  (event: "changeSegment", segment: "parent" | "variant"): void
  (event: "selectVariant", productId: string): void
}>()

const { identityOf } = useProductIdentity()

const typeLabel = computed(() => {
  const typeId = props.core?.productTypeId ?? ""
  return props.productTypes.find((option) => option.id === typeId)?.label || typeId || "—"
})

const variantDisplayName = (v: FamilyVariant) => {
  const id = identityOf(v.product)
  const primary = id.primary || v.productId
  if (id.secondary && id.secondary !== primary) {
    return `${primary} (${id.secondary})`
  }
  return primary
}
</script>

<style scoped>
.hero {
  display: flex;
  gap: 16px;
  padding: 16px;
  align-items: flex-start;
}

.hero-image {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ion-color-step-150);
  background: var(--ion-color-step-50);
  cursor: pointer;
}

.hero-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-badge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 4px;
  border-radius: 50%;
  background: var(--ion-background-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-identity-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.hero-identity-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.hero-title {
  margin: 0;
  line-height: 1.2;
}

.hero-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  display: inline-flex;
  gap: 4px;
}

.hero-actions {
  flex-shrink: 0;
}

.hero-family-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.hero-context-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.variant-selector-wrap {
  min-width: 200px;
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
  }
  .hero-image {
    width: 96px;
    height: 96px;
  }
  .hero-identity-row {
    flex-direction: column;
  }
}
</style>
