<template>
  <ion-item
    :router-link="routerLink"
    :detail="!!routerLink"
    lines="full"
  >
    <ion-checkbox
      v-if="selectable"
      slot="start"
      :checked="selected"
      aria-label="Select product"
      @ion-change="$emit('toggleSelect')"
      @click.stop
    />
    <ion-thumbnail slot="start">
      <DxpShopifyImg
        :src="product.imageUrl"
        size="thumb"
      />
    </ion-thumbnail>

    <ion-label>
      <h2>{{ displayName }}</h2>
      <p>{{ product.sku || product.productId }}<template v-if="secondaryLine"> · {{ secondaryLine }}</template></p>
      <div
        v-if="product.isVirtual || presellState || visibleTags.length"
        class="row-badges"
      >
        <ion-badge
          v-if="presellState"
          :color="presellColor(presellState)"
        >
          {{ presellLabel(presellState) }}
        </ion-badge>
        <ion-chip
          v-if="product.isVirtual"
          outline
          class="variant-chip"
        >
          <ion-icon :icon="gitBranchOutline" />
          <ion-label>{{ variantCountLabel }}</ion-label>
        </ion-chip>
        <ion-badge
          v-for="tag in visibleTags"
          :key="tag"
          color="light"
        >
          {{ tag }}
        </ion-badge>
      </div>
    </ion-label>

    <slot name="end" />
  </ion-item>
</template>

<script setup lang="ts">
import { IonBadge, IonCheckbox, IonChip, IonIcon, IonItem, IonLabel, IonThumbnail } from "@ionic/vue"
import { gitBranchOutline } from "ionicons/icons"
import { computed } from "vue"
import { DxpShopifyImg, translate } from "@common"
import { productDisplayName } from "@/domain/normalize/product"
import { displayableTags, getPresellState, presellColor, presellLabel } from "@/domain/product/flags"
import type { ProductSummary } from "@/domain/types/product"

const props = withDefaults(
  defineProps<{
    product: ProductSummary
    routerLink?: string
    selectable?: boolean
    selected?: boolean
    maxTags?: number
  }>(),
  { routerLink: undefined, selectable: false, selected: false, maxTags: 3 }
)

defineEmits<{ (event: "toggleSelect"): void }>()

const displayName = computed(() => productDisplayName(props.product))
const presellState = computed(() => getPresellState(props.product))
const visibleTags = computed(() => displayableTags(props.product.tags).slice(0, props.maxTags))
const secondaryLine = computed(() => {
  if (props.product.isVariant && props.product.parentProductName) return props.product.parentProductName
  return props.product.brandName || props.product.productTypeId
})
const variantCountLabel = computed(() =>
  props.product.variantCount === 1 ? translate("1 variant") : `${props.product.variantCount} ${translate("variants")}`
)
</script>

<style scoped>
.row-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.variant-chip {
  height: 22px;
  font-size: 12px;
  margin: 0;
}
</style>
