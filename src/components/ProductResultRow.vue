<template>
  <ion-item
    :router-link="routerLink || undefined"
    :detail="!!routerLink"
    lines="full"
  >
    <ion-thumbnail slot="start">
      <DxpShopifyImg
        :src="product.imageUrl"
        size="thumb"
      />
    </ion-thumbnail>

    <ion-label>
      <h2>{{ displayName }}</h2>
      <p>{{ product.primarySku || product.productId }} · {{ product.productTypeId || "Unknown type" }}</p>
      <p v-if="sortDateLine">
        {{ sortDateLine }}
      </p>
      <div class="row-badges">
        <ion-badge
          v-if="presellState"
          :color="presellColor(presellState)"
        >
          {{ presellLabel(presellState) }}
        </ion-badge>
        <ion-chip
          v-if="product.isVirtual"
          class="variant-chip"
          outline
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

    <div
      slot="end"
      class="row-trailing"
    >
      <div
        class="row-spark"
        :title="sparkTitle"
      >
        <svg
          v-if="hasSales"
          class="row-spark-svg"
          viewBox="0 0 88 28"
          preserveAspectRatio="none"
          role="img"
          :aria-label="sparkTitle"
        >
          <polyline
            :points="sparkPoints"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span
          v-else
          class="row-spark-empty"
        >No 30-day sales</span>
        <span class="row-spark-total">{{ unitsSold }} sold</span>
      </div>
      <slot name="actions" />
    </div>
  </ion-item>
</template>

<script setup lang="ts">
import { IonBadge, IonChip, IonIcon, IonItem, IonLabel, IonThumbnail } from "@ionic/vue"
import { gitBranchOutline } from "ionicons/icons"
import { DateTime } from "luxon"
import { computed } from "vue"
import { DxpShopifyImg } from "@common"

import type { ProductSortOption, ProductSummary, RowSalesSpark } from "@/types/product"
import { displayableTags, getPresellState, presellColor, presellLabel } from "@/utils/productFlags"

const props = defineProps<{
  product: ProductSummary
  spark?: RowSalesSpark | null
  variantCount?: number | null
  sort?: ProductSortOption | null
  routerLink?: string | null
  maxTags?: number
}>()

const displayName = computed(() => props.product.productName || props.product.internalName || props.product.productId || "Unnamed product")
const sortDateLine = computed(() => {
  if(props.sort === "Updated") {
    return `Updated: ${friendlyDate(props.product.updatedDate)}`
  }
  if(props.sort === "Created") {
    return `Created: ${friendlyDate(props.product.createdDate)}`
  }

  return ""
})

function friendlyDate(raw: string): string {
  if(!raw) {return "unavailable"}
  const parsed = DateTime.fromISO(raw)
  const dateTime = parsed.isValid ? parsed : DateTime.fromJSDate(new Date(raw))
  if(!dateTime.isValid) {return raw}

  return dateTime.toLocaleString(DateTime.DATETIME_MED)
}
const presellState = computed(() => getPresellState(props.product))
const visibleTags = computed(() => displayableTags(props.product.tags).slice(0, props.maxTags ?? 3))

const variantCountLabel = computed(() => {
  const count = props.variantCount
  if(count === null || count === undefined) {return "Variants"}

  return `${count} ${count === 1 ? "variant" : "variants"}`
})

const series = computed(() => props.spark?.series || [])
const unitsSold = computed(() => props.spark?.unitsSold ?? 0)
const hasSales = computed(() => series.value.some((value) => value > 0))
const sparkTitle = computed(() => `${unitsSold.value} units sold in the last 30 days`)

const sparkPoints = computed(() => {
  const values = series.value
  if(!values.length) {return ""}
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? 86 / (values.length - 1) : 0

  return values
    .map((value, index) => {
      const x = 1 + index * step
      const y = 27 - (value / max) * 26

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
})
</script>

<style scoped>
.row-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.row-badges ion-badge {
  font-weight: 500;
}

.variant-chip {
  height: 20px;
  margin: 0;
  --color: var(--ion-color-medium);
}

.variant-chip ion-icon {
  font-size: 13px;
  margin-right: 2px;
}

.variant-chip ion-label {
  font-size: 11px;
}

.row-trailing {
  display: flex;
  align-items: center;
  gap: 12px;
}

.row-spark {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 88px;
  color: var(--ion-color-primary);
}

.row-spark-svg {
  width: 88px;
  height: 28px;
}

.row-spark-svg polyline {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: row-spark-draw 1s ease-out forwards;
}

.row-spark-empty {
  font-size: 11px;
  color: var(--ion-color-medium);
  height: 28px;
  display: flex;
  align-items: center;
}

.row-spark-total {
  font-size: 11px;
  color: var(--ion-color-medium);
}

@keyframes row-spark-draw {
  to { stroke-dashoffset: 0; }
}
</style>
