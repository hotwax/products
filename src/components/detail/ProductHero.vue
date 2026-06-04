<template>
  <div class="hero">
    <div class="hero-image">
      <DxpShopifyImg
        :src="core?.imageUrl ?? ''"
        size="detail"
      />
    </div>

    <div class="hero-main">
      <p
        v-if="familyAnchor"
        class="hero-overline"
      >
        {{ translate("Parent product") }} · {{ core?.productId }}
      </p>

      <ion-list lines="full">
        <ion-item>
          <ion-label>
            <p>{{ translate("Name") }}</p>
            <h2>{{ core?.productName || "—" }}</h2>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>{{ translate("Internal name") }}</p>
            <h2>{{ core?.internalName || "—" }}</h2>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>{{ translate("Brand name") }}</p>
            <h2>{{ core?.brandName || "—" }}</h2>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label>
            <p>{{ translate("Type") }}</p>
            <h2>{{ typeLabel }}</h2>
          </ion-label>
        </ion-item>
      </ion-list>
    </div>

    <div class="hero-side">
      <slot name="side" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList } from "@ionic/vue"
import { computed } from "vue"
import { DxpShopifyImg, translate } from "@common"
import type { CatalogOption, ProductCore } from "@/domain/types/product"

const props = defineProps<{
  core: ProductCore | null
  familyAnchor: boolean
  productTypes: CatalogOption[]
}>()

const typeLabel = computed(() => {
  const typeId = props.core?.productTypeId ?? ""

  return props.productTypes.find((option) => option.id === typeId)?.label || typeId || "—"
})
</script>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(220px, 343px) 1fr minmax(260px, 343px);
  gap: 16px;
  padding: 16px;
  align-items: start;
}

.hero-image :deep(img) {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
  background: var(--ion-color-step-100, #f0f0f3);
}

.hero-overline {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ion-color-medium);
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
