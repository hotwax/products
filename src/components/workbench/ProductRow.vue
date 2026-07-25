<template>
  <ion-item
    :key="selectable ? 'select' : 'navigate'"
    v-bind="itemProps"
    lines="full"
    @click="onRowClick"
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
      <p>
        {{ secondaryIdentifier }}
        <template v-if="secondaryContext">
          · {{ secondaryContext }}
        </template>
      </p>
      <div
        v-if="product.isVirtual || presellState || visibleTags.length"
        class="row-badges"
      >
        <ion-chip
          v-if="product.isVirtual"
          outline
          class="variant-chip"
        >
          <ion-icon :icon="gitBranchOutline" />
          <ion-label>{{ variantCountLabel }}</ion-label>
        </ion-chip>
        <ion-badge
          v-if="presellState"
          :color="presellColor(presellState)"
        >
          {{ presellLabel(presellState) }}
        </ion-badge>
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
      <ion-note
        v-else
        class="row-spark-empty"
      >
        {{ translate("No 30-day sales") }}
      </ion-note>
      <ion-note>{{ unitsSoldLabel }}</ion-note>
    </div>
  </ion-item>
</template>

<script setup lang="ts">
import { DxpShopifyImg, translate } from "@common"
import { IonBadge, IonCheckbox, IonChip, IonIcon, IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue"
import { gitBranchOutline } from "ionicons/icons"
import { computed } from "vue"
import { displayableTags, getPresellState, presellColor, presellLabel } from "@/domain/product/flags"
import { DEFAULT_PRODUCT_IDENTIFIER_PREFERENCE, getPrimaryProductIdentifier, getSecondaryProductIdentifier } from "@/domain/product/identifier"
import type { ProductSummary, RowSalesSpark } from "@/domain/types/product"
import router from "../../router"

const props = withDefaults(
  defineProps<{
    product: ProductSummary
    routerLink?: string | import("vue-router").RouteLocationRaw
    selectable?: boolean
    selected?: boolean
    maxTags?: number
    variantCounts?: Record<string, number>
    spark?: RowSalesSpark
    sparkMax?: number
  }>(),
  { routerLink: undefined, selectable: false, selected: false, maxTags: 8, variantCounts: () => ({}), spark: undefined, sparkMax: 0 }
)

const emit = defineEmits<{ (event: "toggleSelect"): void }>()

const onRowClick = () => {
  if(props.selectable) {emit("toggleSelect")}
}

const resolvedRouterLink = computed(() => {
  if(!props.routerLink) {return undefined}
  if(typeof props.routerLink === "string") {return props.routerLink}

  return router.resolve(props.routerLink).href
})
const itemProps = computed(() => props.selectable
  ? { button: true, detail: false }
  : { routerLink: resolvedRouterLink.value, detail: Boolean(resolvedRouterLink.value) })
const displayName = computed(() => getPrimaryProductIdentifier(DEFAULT_PRODUCT_IDENTIFIER_PREFERENCE, props.product))
const presellState = computed(() => getPresellState(props.product))
const visibleTags = computed(() => displayableTags(props.product.tags).slice(0, props.maxTags))
const secondaryIdentifier = computed(() => getSecondaryProductIdentifier(DEFAULT_PRODUCT_IDENTIFIER_PREFERENCE, props.product))
const secondaryContext = computed(() => {
  if(props.product.isVariant && props.product.parentProductName && props.product.parentProductName !== displayName.value) {
    return props.product.parentProductName
  }

  return props.product.brandName || props.product.productTypeId
})
const variantCountLabel = computed(() => {
  const count = props.variantCounts[props.product.productId] ?? props.product.variantCount

  return count === 1 ? translate("1 variant") : `${count} ${translate("variants")}`
})
const salesSeries = computed(() => props.spark?.series ?? [])
const unitsSold = computed(() => props.spark?.unitsSold ?? 0)
const hasSales = computed(() => salesSeries.value.some((value) => value > 0))
const sparkTitle = computed(() => `${unitsSold.value} ${translate("sold in the last 30 days")}`)
const unitsSoldLabel = computed(() => `${unitsSold.value} ${translate("sold")}`)
const sparkPoints = computed(() => {
  if(!salesSeries.value.length) {return ""}

  const max = Math.max(props.sparkMax, ...salesSeries.value, 1)
  const step = salesSeries.value.length > 1 ? 86 / (salesSeries.value.length - 1) : 0

  return salesSeries.value
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

.row-spark {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 88px;
}

.row-spark-svg {
  width: 88px;
  height: 28px;
}

.row-spark-empty {
  min-height: 28px;
  display: flex;
  align-items: center;
}
</style>
