<template>
  <div class="hero">
    <div class="hero-image">
      <DxpShopifyImg
        :src="core?.imageUrl ?? ''"
        size="grande"
      />
    </div>

    <div class="hero-main">
      <div class="hero-main-head">
        <p
          v-if="familyAnchor"
          class="hero-overline"
        >
          {{ translate("Parent product") }} · {{ core?.productId }}
        </p>
      </div>

      <ion-list lines="none">
        <ion-item>
          <ion-label>
            <h2><strong>{{ translate("Name") }}: </strong>{{ core?.productName || "—" }}</h2>
            <h2><strong>{{ translate("Internal Name") }}: </strong>{{ core?.internalName || "—" }}</h2>
            <h2><strong>{{ translate("Brand") }}: </strong>{{ core?.brandName || "-" }}</h2>
            <h2><strong>{{ translate("Product Type") }}: </strong>{{ typeLabel }}</h2>
          </ion-label>
          <ion-button
            slot="end"
            fill="clear"
            class="edit-btn"
            @click="$emit('edit')"
          >
            <ion-icon
              slot="icon-only"
              :icon="pencilOutline"
            />
          </ion-button>
        </ion-item>
      </ion-list>
    </div>

  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon, IonItem, IonLabel, IonList } from "@ionic/vue"
import { computed } from "vue"
import { pencilOutline } from "ionicons/icons"
import { DxpShopifyImg, translate } from "@common"
import type { CatalogOption, ProductCore } from "@/domain/types/product"

const props = defineProps<{
  core: ProductCore | null
  familyAnchor: boolean
  productTypes: CatalogOption[]
}>()

defineEmits<{ (event: "edit"): void }>()

const typeLabel = computed(() => {
  const typeId = props.core?.productTypeId ?? ""

  return props.productTypes.find((option) => option.id === typeId)?.label || typeId || "—"
})
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
  min-height: 28px;
}

.hero-overline {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ion-color-medium);
}

.edit-btn {
  align-self: flex-start;
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
