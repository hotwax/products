<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Missing values</ion-title>
      </ion-toolbar>
      <ion-progress-bar
        :aria-hidden="!loading"
        :style="{ visibility: loading ? 'visible' : 'hidden' }"
        type="indeterminate"
      />
    </ion-header>

    <ion-content>
      <ion-card class="coverage-card">
        <ion-card-header>
          <ion-card-subtitle>Catalog coverage</ion-card-subtitle>
          <ion-card-title>{{ coverageTitle }}</ion-card-title>
          <p class="hint">
            Where your catalog has holes, worst first. Pick a gap to see the products and fix them.
          </p>
        </ion-card-header>
        <ion-card-content>
          <div class="coverage-grid">
            <ion-item
              v-for="tile in coverageTiles"
              :key="tile.field"
              button
              :detail="false"
              lines="none"
              :class="['coverage-tile', { 'coverage-tile--active': activeField === tile.field }]"
              @click="runForField(tile.field)"
            >
              <ion-label>
                <div class="coverage-tile__head">
                  <span>{{ tile.label }}</span>
                  <ion-badge :color="tile.missing ? 'danger' : 'success'">
                    {{ tile.missing ? `${tile.missing.toLocaleString()} ${tile.scopeLabel} missing` : "Complete" }}
                  </ion-badge>
                </div>
                <ion-progress-bar
                  :value="tile.pctComplete / 100"
                  :color="tile.missing ? 'primary' : 'success'"
                />
                <ion-note>{{ tile.pctComplete }}% of {{ tile.scopeLabel }} have a value</ion-note>
              </ion-label>
            </ion-item>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-content>
          <form @submit.prevent="runForField(fieldInput)">
            <ion-input
              v-model="fieldInput"
              label="Look up another field"
              label-placement="stacked"
              placeholder="e.g. upc"
              :clear-input="true"
              @ion-clear="fieldInput = ''"
            />
          </form>
          <p class="hint">
            Type any field in the product doc to find products where it is empty.
          </p>
        </ion-card-content>
      </ion-card>

      <ErrorState
        v-if="error"
        title="Could not run query"
        :message="error"
      />

      <template v-if="activeField && !error">
        <ion-list-header>
          <ion-label>{{ total }} {{ activeFieldScopeLabel }} missing <code>{{ activeField }}</code></ion-label>
        </ion-list-header>
        <ion-list>
          <ProductResultRow
            v-for="product in results"
            :key="product.productId"
            :product="product"
            :spark="rowSparks[product.productId]"
            :variant-count="variantCounts[product.productId]"
            :router-link="`/products/${product.productId}`"
          />
        </ion-list>

        <EmptyState
          v-if="!loading && !results.length"
          title="Nothing missing"
          :message="`No ${activeFieldScopeLabel} are missing ${activeField}.`"
        />

        <ion-infinite-scroll
          :disabled="!hasMore"
          @ion-infinite="loadMore"
        >
          <ion-infinite-scroll-content
            loading-spinner="crescent"
            loading-text="Loading more products"
          />
        </ion-infinite-scroll>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonNote,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { computed, onMounted, ref } from "vue"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import ProductResultRow from "@/components/ProductResultRow.vue"
import { getBatchSalesAnalytics, getMissingFieldCounts, getProductsMissingField, getVariantCounts } from "@/services/product"
import type { ProductSummary, RowSalesSpark } from "@/types/product"

const suggestions = [
  { field: "upc", label: "UPC", scopeLabel: "variants" },
  { field: "sku", label: "SKU", scopeLabel: "products" },
  { field: "mainImageUrl", label: "Image", scopeLabel: "products" },
  { field: "brandName", label: "Brand", scopeLabel: "products" },
  { field: "primaryProductCategoryName", label: "Primary category", scopeLabel: "products" },
  { field: "tags", label: "Tags", scopeLabel: "products" }
]

const PAGE_SIZE = 25

const fieldInput = ref("")
const activeField = ref("")
const results = ref<ProductSummary[]>([])
const rowSparks = ref<Record<string, RowSalesSpark>>({})
const variantCounts = ref<Record<string, number>>({})
const total = ref(0)
const pageIndex = ref(0)
const loading = ref(false)
const error = ref("")

const catalogTotal = ref(0)
const totalByField = ref<Record<string, number>>({})
const missingCounts = ref<Record<string, number>>({})
const coverageLoading = ref(false)

const hasMore = computed(() => results.value.length < total.value)
const activeFieldScopeLabel = computed(() => suggestions.find((suggestion) => suggestion.field === activeField.value)?.scopeLabel || "products")

const coverageTiles = computed(() => suggestions
  .map((suggestion) => {
    const missing = missingCounts.value[suggestion.field] ?? 0
    const eligibleTotal = totalByField.value[suggestion.field] ?? catalogTotal.value
    const pctComplete = eligibleTotal
      ? Math.floor(((eligibleTotal - missing) / eligibleTotal) * 100)
      : 100

    return { ...suggestion, missing, eligibleTotal, pctComplete }
  })
  .sort((first, second) => second.missing - first.missing))

const coverageTitle = computed(() => {
  if(coverageLoading.value && !catalogTotal.value) {return "Auditing catalog…"}
  const worst = coverageTiles.value.find((tile) => tile.missing > 0)
  if(!worst) {return `${catalogTotal.value.toLocaleString()} products, no gaps found`}

  return `${worst.missing.toLocaleString()} ${worst.scopeLabel} missing ${worst.label.toLowerCase()}`
})

onMounted(loadCoverage)

async function loadCoverage() {
  coverageLoading.value = true

  try {
    const result = await getMissingFieldCounts(suggestions.map((suggestion) => suggestion.field))
    catalogTotal.value = result.total
    totalByField.value = result.totalByField
    missingCounts.value = result.missing
  } finally {
    coverageLoading.value = false
  }
}

async function runForField(rawField: string) {
  const field = (rawField || "").trim()
  if(!field) {return}

  fieldInput.value = field
  activeField.value = field
  pageIndex.value = 0
  results.value = []
  rowSparks.value = {}
  variantCounts.value = {}
  await fetchPage()
}

async function fetchPage() {
  loading.value = true
  error.value = ""

  try {
    const result = await getProductsMissingField(activeField.value, {
      productTypeId: "All",
      pageSize: PAGE_SIZE,
      pageIndex: pageIndex.value
    })
    results.value.push(...result.products)
    total.value = result.total
    decorate(result.products)
  } catch (caught: any) {
    error.value = caught?.response?.data?.errors?.[0]?.message || caught?.message || "Missing-value query failed"
  } finally {
    loading.value = false
  }
}

async function decorate(products: ProductSummary[]) {
  if(!products.length) {return}

  const [sparks, counts] = await Promise.all([
    getBatchSalesAnalytics(products.map((product) => product.productId)),
    getVariantCounts(products.filter((product) => product.isVirtual).map((product) => product.productId))
  ])
  rowSparks.value = { ...rowSparks.value, ...Object.fromEntries(sparks) }
  variantCounts.value = { ...variantCounts.value, ...Object.fromEntries(counts) }
}

async function loadMore(event: CustomEvent) {
  if(hasMore.value) {
    pageIndex.value += 1
    await fetchPage()
  }
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}
</script>

<style scoped>
.hint {
  color: var(--ion-color-medium);
  margin: 8px 0 0;
}

.coverage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.coverage-tile {
  --padding-start: 14px;
  --inner-padding-end: 14px;
  --background: var(--ion-card-background, #fff);
  border-radius: 12px;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
  overflow: hidden;
}

.coverage-tile ion-label {
  display: grid;
  gap: 8px;
}

.coverage-tile--active {
  border-color: var(--ion-color-primary);
  box-shadow: 0 0 0 1px var(--ion-color-primary);
}

.coverage-tile__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

code {
  background: var(--ion-color-step-100, rgba(0, 0, 0, 0.06));
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
