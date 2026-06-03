<template>
  <div class="hero">
    <div class="hero-image">
      <DxpShopifyImg
        :src="core?.imageUrl ?? ''"
        size="detail"
      />
    </div>

    <div class="hero-main">
      <ion-item
        v-if="parentLink"
        lines="none"
        button
        :router-link="`/products/${parentLink.productId}`"
        class="parent-link"
      >
        <ion-label>
          <p>{{ translate("Parent product") }}</p>
          <h2>{{ parentLink.name }}</h2>
        </ion-label>
      </ion-item>

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
          <ion-badge
            v-if="kindBadge"
            slot="end"
            color="medium"
          >
            {{ kindBadge }}
          </ion-badge>
        </ion-item>
      </ion-list>
    </div>

    <div class="hero-side">
      <slot name="side" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonItem, IonLabel, IonList } from "@ionic/vue"
import { computed } from "vue"
import { DxpShopifyImg, translate } from "@common"
import type { CatalogOption, ProductCore } from "@/domain/types/product"

const props = defineProps<{
  core: ProductCore | null
  parentLink: { productId: string; name: string } | null
  productTypes: CatalogOption[]
}>()

const typeLabel = computed(() => {
  const typeId = props.core?.productTypeId ?? ""
  return props.productTypes.find((option) => option.id === typeId)?.label || typeId || "—"
})

const kindBadge = computed(() => {
  if (props.core?.isVirtual) return translate("Virtual")
  if (props.core?.isVariant) return translate("Variant")
  return ""
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

.parent-link {
  --padding-start: 0;
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
