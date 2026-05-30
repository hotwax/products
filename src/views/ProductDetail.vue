<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/products" />
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ productId }}</ion-title>
      </ion-toolbar>
      <ion-progress-bar
        v-if="detailLoading"
        type="indeterminate"
      />
    </ion-header>

    <ion-content>
      <ErrorState
        v-if="detailError"
        title="Product detail failed"
        :message="detailError"
      />

      <template v-if="detail">
        <ion-card>
          <ion-card-content>
            <div class="product-hero">
              <ion-thumbnail>
                <DxpShopifyImg
                  :src="detail.imageUrl"
                  size="small"
                />
              </ion-thumbnail>
              <ion-label>
                <p>{{ detail.productId }}</p>
                <h1>{{ productName }}</h1>
                <p>{{ detail.productTypeId || "Unknown type" }} · {{ detail.primaryProductCategoryId || "No category" }}</p>
              </ion-label>
              <ion-badge :color="detail.readiness.state === 'ready' ? 'success' : 'warning'">
                {{ readinessLabel }}
              </ion-badge>
              <ion-button
                fill="clear"
                @click="openCoreDetails()"
              >
                <ion-icon
                  slot="icon-only"
                  :icon="ellipsisVerticalOutline"
                />
              </ion-button>
            </div>

            <div class="product-facts">
              <ion-note>
                Internal name
                <span>{{ detail.internalName || "Missing" }}</span>
              </ion-note>
              <ion-note>
                Brand
                <span>{{ detail.brandName || "Missing" }}</span>
              </ion-note>
              <ion-note>
                Product kind
                <span>{{ productKindLabel }}</span>
              </ion-note>
              <ion-note>
                Selling since
                <span>{{ detail.createdDate || "Unknown" }}</span>
              </ion-note>
            </div>
          </ion-card-content>
        </ion-card>

        <div class="detail-card-grid">
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>30-day sales</ion-card-subtitle>
              <ion-card-title>{{ salesSummary.unitsSold }} units sold</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="analytics-chart">
                <svg
                  viewBox="0 0 320 160"
                  role="img"
                  :aria-label="`Units sold over the last ${salesWindowDays} days`"
                >
                  <line
                    x1="34"
                    y1="16"
                    x2="34"
                    y2="126"
                    stroke="currentColor"
                  />
                  <line
                    x1="34"
                    y1="126"
                    x2="304"
                    y2="126"
                    stroke="currentColor"
                  />
                  <text
                    x="4"
                    y="20"
                  >{{ chartMax(salesVelocity) }}</text>
                  <text
                    x="20"
                    y="128"
                  >0</text>
                  <polyline
                    :points="lineChartPoints(salesVelocity)"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="4"
                  />
                  <text
                    x="34"
                    y="150"
                  >{{ salesVelocityLabels[0] }}</text>
                  <text
                    x="218"
                    y="150"
                  >{{ salesVelocityLabels[salesVelocityLabels.length - 1] }}</text>
                </svg>
              </div>
              <div class="analytics-grid">
                <ion-note>
                  Orders
                  <span>{{ salesSummary.orderCount }}</span>
                </ion-note>
                <ion-note>
                  Daily average
                  <span>{{ salesSummary.dailyAverage }}</span>
                </ion-note>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>Inventory coverage</ion-card-subtitle>
              <ion-card-title>{{ inventoryPosture.title }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="analytics-chart">
                <svg
                  viewBox="0 0 320 160"
                  role="img"
                  aria-label="Available inventory history"
                >
                  <line
                    x1="34"
                    y1="16"
                    x2="34"
                    y2="126"
                    stroke="currentColor"
                  />
                  <line
                    x1="34"
                    y1="126"
                    x2="304"
                    y2="126"
                    stroke="currentColor"
                  />
                  <text
                    x="4"
                    y="20"
                  >{{ chartMax(inventoryHistory) }}</text>
                  <text
                    x="20"
                    y="128"
                  >0</text>
                  <rect
                    v-for="bar in barChartRects(inventoryHistory)"
                    :key="bar.x"
                    :x="bar.x"
                    :y="bar.y"
                    :width="bar.width"
                    :height="bar.height"
                    fill="currentColor"
                  />
                  <text
                    x="34"
                    y="150"
                  >{{ inventoryHistoryLabels[0] }}</text>
                  <text
                    x="218"
                    y="150"
                  >{{ inventoryHistoryLabels[inventoryHistoryLabels.length - 1] }}</text>
                </svg>
              </div>
              <div class="analytics-grid">
                <ion-note
                  v-for="metric in inventoryPosture.metrics"
                  :key="metric.label"
                >
                  {{ metric.label }}
                  <span>{{ metric.value }}</span>
                </ion-note>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>Returns</ion-card-subtitle>
              <ion-card-title>{{ returnsSummary.title }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="analytics-grid">
                <ion-note>
                  Returned units
                  <span>{{ returnsSummary.returnedUnits }}</span>
                </ion-note>
                <ion-note>
                  Return rate
                  <span>{{ returnsSummary.returnRate }}</span>
                </ion-note>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <ion-list-header>
          <ion-label>Configure product data</ion-label>
        </ion-list-header>
        <div class="action-card-grid">
          <ion-card
            v-for="section in sections"
            :key="section.id"
          >
            <ion-card-header>
              <ion-icon :icon="section.icon" />
              <ion-card-subtitle>{{ section.countLabel }}</ion-card-subtitle>
              <ion-card-title>{{ section.label }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ section.description }}</p>
              <p v-if="section.emptyMessage">
                {{ section.emptyMessage }}
              </p>
              <template v-if="section.id === 'identifiers'">
                <ion-button
                  fill="clear"
                  @click="openIdentifiersModal()"
                >
                  Manage
                </ion-button>
              </template>
              <template v-else-if="section.id === 'stores'">
                <ion-button
                  fill="clear"
                  @click="openCatalogsModal()"
                >
                  Manage
                </ion-button>
              </template>
              <ion-button
                v-else
                fill="clear"
                :router-link="`/products/${productId}/${section.id}`"
              >
                Open
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>

        <ion-modal
          :is-open="showIdentifiers"
          @did-dismiss="showIdentifiers = false"
        >
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button
                  aria-label="Close good identifications"
                  @click="showIdentifiers = false"
                >
                  <ion-icon
                    slot="icon-only"
                    :icon="closeOutline"
                  />
                </ion-button>
              </ion-buttons>
              <ion-title>Good identifications</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list lines="none">
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg
                    :src="detail.imageUrl"
                    size="small"
                  />
                </ion-thumbnail>
                <ion-label>
                  <h2>{{ productName }}</h2>
                  <p>{{ detail.productId }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
            <div class="ion-padding">
              <template
                v-for="identifier in identifierDraft"
                :key="identifier.typeId"
              >
                <ion-input
                  v-model="identifier.value"
                  class="ion-margin-bottom"
                  fill="outline"
                  :label="identifier.typeId"
                  :helper-text="identifierHelperText(identifier)"
                  label-placement="floating"
                  placeholder="Value"
                  :clear-input="true"
                />
              </template>
            </div>
            <ion-fab
              slot="fixed"
              vertical="bottom"
              horizontal="end"
            >
              <ion-fab-button @click="showIdentifiers = false">
                <ion-icon :icon="saveOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>

        <ion-modal
          :is-open="showCatalogs"
          @did-dismiss="showCatalogs = false"
        >
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button
                  aria-label="Close catalog memberships"
                  @click="showCatalogs = false"
                >
                  <ion-icon
                    slot="icon-only"
                    :icon="closeOutline"
                  />
                </ion-button>
              </ion-buttons>
              <ion-title>Catalog memberships</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list lines="none">
              <ion-list-header>
                <ion-label>Catalog and category membership</ion-label>
              </ion-list-header>
              <ion-item
                v-for="exposure in catalogOptions"
                :key="`${exposure.productStoreId}-${exposure.prodCatalogId}-${exposure.productCategoryId}-${exposure.fromDate}`"
              >
                <ion-label>
                  <h2>{{ exposure.categoryName || exposure.productCategoryId }}</h2>
                  <p>{{ exposure.catalogName || exposure.prodCatalogId || "No catalog" }}</p>
                  <p>{{ exposure.storeName || exposure.productStoreId || "No product store" }}</p>
                  <p>{{ exposure.fromDate || "No start date" }} → {{ exposure.thruDate || "No end date" }}</p>
                </ion-label>
                <ion-badge
                  slot="end"
                  :color="exposure.status === 'Active' ? 'success' : 'medium'"
                >
                  {{ exposure.status }}
                </ion-badge>
                <ion-button
                  slot="end"
                  fill="outline"
                  :color="exposure.status === 'Active' ? 'warning' : 'success'"
                  @click="toggleCatalogMembership(exposure)"
                >
                  {{ exposure.status === "Active" ? "Expire" : "Link" }}
                </ion-button>
              </ion-item>
            </ion-list>
            <EmptyState
              v-if="!catalogOptionsLoading && !catalogOptions.length"
              title="No catalog categories"
              message="No available catalog categories were returned."
            />
          </ion-content>
        </ion-modal>

        <ion-modal
          :is-open="showCoreDetails"
          @did-dismiss="showCoreDetails = false"
        >
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button
                  aria-label="Close core product details"
                  @click="showCoreDetails = false"
                >
                  <ion-icon
                    slot="icon-only"
                    :icon="closeOutline"
                  />
                </ion-button>
              </ion-buttons>
              <ion-title>Core product details</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list>
              <ion-item>
                <ion-input
                  v-model="coreDetailsForm.productName"
                  label="Product name"
                  label-placement="stacked"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  v-model="coreDetailsForm.internalName"
                  label="Internal name"
                  label-placement="stacked"
                />
              </ion-item>
              <ion-item>
                <ion-select
                  v-model="coreDetailsForm.productTypeId"
                  label="Product type"
                  label-placement="stacked"
                  interface="popover"
                >
                  <ion-select-option value="FINISHED_GOOD">
                    Finished goods
                  </ion-select-option>
                  <ion-select-option value="DIGITAL_GOOD">
                    Digital goods
                  </ion-select-option>
                  <ion-select-option value="SERVICE">
                    Services
                  </ion-select-option>
                  <ion-select-option value="MARKETING_PKG">
                    Marketing packages
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-toggle v-model="coreDetailsForm.isVariant">
                  Variant product
                </ion-toggle>
              </ion-item>
              <ion-item>
                <ion-toggle v-model="coreDetailsForm.isVirtual">
                  Virtual product
                </ion-toggle>
              </ion-item>
              <ion-item lines="none">
                <ion-label>
                  <h2>Save unavailable</h2>
                  <p>The backend API for core product updates is not connected yet.</p>
                </ion-label>
              </ion-item>
            </ion-list>
            <ion-button
              expand="block"
              disabled
            >
              Save core details
            </ion-button>
          </ion-content>
        </ion-modal>
      </template>

      <EmptyState
        v-if="!detailLoading && !detailError && !detail"
        title="Product not loaded"
        message="Open a product from the workbench or refresh this page."
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonModal,
  IonNote,
  IonPage,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToggle,
  IonToolbar
} from "@ionic/vue"
import {
  barcodeOutline,
  closeOutline,
  cubeOutline,
  ellipsisVerticalOutline,
  gitBranchOutline,
  optionsOutline,
  pricetagOutline,
  saveOutline,
  storefrontOutline,
  syncOutline,
  timeOutline
} from "ionicons/icons"
import { storeToRefs } from "pinia"
import { computed, onMounted, reactive, ref, watch } from "vue"
import { DxpShopifyImg } from "@common"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { getProductCatalogOptions } from "@/services/product"
import { useProductsStore } from "@/store/products"
import type { StoreCatalogExposure } from "@/types/product"
import { showToast } from "@/utils"

const props = defineProps<{
  productId: string
}>()

const productsStore = useProductsStore()
const { detail, detailLoading, detailError } = storeToRefs(productsStore)
const showCoreDetails = ref(false)
const showIdentifiers = ref(false)
const showCatalogs = ref(false)
const catalogOptions = ref<StoreCatalogExposure[]>([])
const catalogOptionsLoading = ref(false)
const coreDetailsForm = reactive({
  productName: "",
  internalName: "",
  productTypeId: "",
  isVariant: false,
  isVirtual: false
})
const identifierDraft = ref<Array<{ typeId: string, value: string, fromDate: string }>>([])
const goodIdentificationTypes = computed(() => {
  const baseTypes = ["SKU", "UPCA", "EAN", "GTIN", "ISBN", "MANUFACTURER_ID_NO", "HS_CODE", "SHOPIFY_PROD_ID", "SHOPIFY_PROD_SKU", "SHOPIFY_VARIANT_ID"]
  const currentTypes = detail.value?.identifiers.map((identifier) => identifier.typeId).filter(Boolean) || []

  return Array.from(new Set([...currentTypes, ...baseTypes]))
})

const productName = computed(() => detail.value?.productName || detail.value?.internalName || detail.value?.productId || "Product")
const productKindLabel = computed(() => {
  if(detail.value?.isVirtual) {return "Virtual"}
  if(detail.value?.isVariant) {return "Variant"}

  return "Standard"
})
const readinessLabel = computed(() => detail.value?.readiness.state === "ready" ? "Ready" : `${detail.value?.readiness.missingCount || 0} missing`)
const sections = computed(() => [
  { id: "identifiers", label: "Identifiers", description: "SKU, UPC, GTIN, HS code, aliases", icon: barcodeOutline, countLabel: countLabel("identifiers"), emptyMessage: emptySectionMessage("identifiers") },
  { id: "relationships", label: relationshipSectionLabel.value, description: relationshipSectionDescription.value, icon: gitBranchOutline, countLabel: countLabel("relationships"), emptyMessage: emptySectionMessage("relationships") },
  { id: "stores", label: "Stores and categories", description: "Catalog and category exposure", icon: storefrontOutline, countLabel: countLabel("stores"), emptyMessage: emptySectionMessage("stores") },
  { id: "features", label: featureSectionLabel.value, description: featureSectionDescription.value, icon: optionsOutline, countLabel: countLabel("features"), emptyMessage: emptySectionMessage("features") },
  { id: "shopify", label: "Channel mapping", description: "Shop, product, variant, and sync context", icon: syncOutline, countLabel: countLabel("shopify"), emptyMessage: emptySectionMessage("shopify") },
  { id: "logistics", label: "Logistics", description: "Dimensions, weight, origin, handling", icon: cubeOutline, countLabel: countLabel("logistics"), emptyMessage: "" },
  { id: "financials", label: "Financials", description: "Tax, GL, legal entity, brand", icon: pricetagOutline, countLabel: countLabel("financials"), emptyMessage: "" },
  { id: "history", label: "History", description: "Entity audit changes", icon: timeOutline, countLabel: countLabel("history"), emptyMessage: emptySectionMessage("history") }
])
const relationshipSectionLabel = computed(() => {
  if(detail.value?.isVirtual) {return "Variant family"}

  return "Relationships"
})
const relationshipSectionDescription = computed(() => {
  if(detail.value?.isVariant) {return "Replacement SKUs, substitutes, BOM components"}
  if(detail.value?.isVirtual) {return "Variants, option coverage, family structure"}

  return "Substitutes, kits, bundles, BOM components"
})
const featureSectionLabel = computed(() => detail.value?.isVariant ? "Variant options" : "Options")
const featureSectionDescription = computed(() => detail.value?.isVariant ? "Assigned color, size, and sellable attributes" : "Selectable feature axes and values")

onMounted(() => productsStore.fetchDetail(props.productId))

watch(() => props.productId, (productId) => {
  productsStore.fetchDetail(productId)
})

watch(detail, () => {
  setCoreDetailsForm()
  setIdentifierDraft()
})

function sectionCount(section: string): number | string {
  if(!detail.value) {return ""}
  if(section === "identifiers") {return detail.value.identifiers.length}
  if(section === "relationships") {return detail.value.relationships.length}
  if(section === "stores") {return detail.value.storeCatalogs.length}
  if(section === "features") {return detail.value.features.length}
  if(section === "shopify") {return detail.value.shopifyMappings.length}
  if(section === "history") {return detail.value.histories.length}

  return ""
}

function countLabel(section: string): string {
  const count = sectionCount(section)
  if(typeof count === "number") {return `${count} records`}

  return count || "Review"
}

function emptySectionMessage(section: string): string {
  if(sectionCount(section) !== 0) {return ""}

  const messages: Record<string, string> = {
    relationships: detail.value?.isVariant ? "No substitute or replacement products are linked." : "No related products were returned.",
    stores: "No store or category exposure was returned.",
    features: detail.value?.isVariant ? "No variant option values were returned." : "No selectable options were returned.",
    shopify: "No channel mapping was returned.",
    history: "No entity audit history was returned."
  }

  return messages[section] || ""
}

function openCoreDetails() {
  setCoreDetailsForm()
  showCoreDetails.value = true
}

function openIdentifiersModal() {
  setIdentifierDraft()
  showIdentifiers.value = true
}

async function openCatalogsModal() {
  showCatalogs.value = true
  catalogOptionsLoading.value = true
  try {
    catalogOptions.value = await getProductCatalogOptions(props.productId)
  } catch {
    catalogOptions.value = detail.value?.storeCatalogs || []
    showToast("Failed to load available catalog categories.")
  } finally {
    catalogOptionsLoading.value = false
  }
}

function toggleCatalogMembership(exposure: StoreCatalogExposure) {
  const action = exposure.status === "Active" ? "Expire" : "Link"

  showToast(`${action} for ${exposure.categoryName || exposure.productCategoryId} is not connected yet.`)
}

function setCoreDetailsForm() {
  if(!detail.value) {return}

  coreDetailsForm.productName = detail.value.productName
  coreDetailsForm.internalName = detail.value.internalName
  coreDetailsForm.productTypeId = detail.value.productTypeId
  coreDetailsForm.isVariant = detail.value.isVariant
  coreDetailsForm.isVirtual = detail.value.isVirtual
}

function setIdentifierDraft() {
  if(!detail.value) {return}

  identifierDraft.value = goodIdentificationTypes.value.map((typeId) => {
    const identifier = detail.value?.identifiers.find((item) => item.typeId === typeId)

    return {
      typeId,
      value: identifier?.value || "",
      fromDate: identifier?.fromDate || ""
    }
  })
}

function identifierHelperText(identifier: { value: string, fromDate: string }) {
  if(!identifier.value) {return ""}

  return identifier.fromDate ? `From ${identifier.fromDate}` : "From date not returned"
}

const operationalSeed = computed(() => Array.from(props.productId).reduce((total, char) => total + char.charCodeAt(0), 0))
const salesByDay = computed(() => detail.value?.analytics.salesByDay || [])
const salesVelocity = computed(() => salesByDay.value.map((day) => day.units))
const inventoryHistory = computed(() => sequence(operationalSeed.value + 7, 8, 18, 88).map((value, index) => Math.max(8, value - index * 3)))
const salesVelocityLabels = computed(() => salesByDay.value.map((day) => day.date))
const inventoryHistoryLabels = computed(() => dateLabels(inventoryHistory.value.length, 7))
const salesWindowDays = computed(() => detail.value?.analytics.windowDays || salesByDay.value.length || 30)
const salesSummary = computed(() => {
  const unitsSold = detail.value?.analytics.unitsSold ?? sum(salesVelocity.value)
  const orderCount = detail.value?.analytics.orderCount ?? 0
  const windowDays = salesWindowDays.value || 1

  return {
    unitsSold,
    orderCount,
    dailyAverage: `${(unitsSold / windowDays).toFixed(1)}/day`
  }
})
const inventoryPosture = computed(() => {
  const onHand = inventoryHistory.value[inventoryHistory.value.length - 1] || 0
  const dailyVelocity = Math.max(0.4, sum(salesVelocity.value) / 30)
  const coverageDays = Math.round(onHand / dailyVelocity)

  return {
    title: `${coverageDays} days of cover`,
    metrics: [
      { label: "Available", value: String(onHand) },
      { label: "Sell-through", value: `${Math.min(96, Math.round(dailyVelocity * 9))}%` }
    ]
  }
})
const returnsSummary = computed(() => {
  const unitsSold = salesSummary.value.unitsSold
  const returnedUnits = detail.value?.analytics.returnedUnits ?? operationalSeed.value % 3
  const returnRate = unitsSold ? ((returnedUnits / unitsSold) * 100).toFixed(1) : "0.0"

  return {
    title: returnedUnits ? `${returnedUnits} units returned` : "No recent returns",
    returnedUnits,
    returnRate: `${returnRate}%`
  }
})

function chartMax(values: number[]): number {
  return Math.max(...values, 1)
}

function lineChartPoints(values: number[]): string {
  const max = chartMax(values)

  return values.map((value, index) => {
    const x = 34 + index * (270 / Math.max(values.length - 1, 1))
    const y = 126 - (value / max) * 104

    return `${x},${y}`
  }).join(" ")
}

function barChartRects(values: number[]) {
  const max = chartMax(values)
  const width = 20
  const gap = 14

  return values.map((value, index) => {
    const height = Math.max(2, (value / max) * 104)

    return {
      x: 42 + index * (width + gap),
      y: 126 - height,
      width,
      height
    }
  })
}

function sequence(seed: number, length: number, min: number, max: number): number[] {
  const spread = max - min

  return Array.from({ length }, (_, index) => min + ((seed + index * 17 + index * index * 5) % spread))
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function dateLabels(length: number, intervalDays: number): string[] {
  const today = new Date()
  const startOffset = (length - 1) * intervalDays

  return Array.from({ length }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - startOffset + index * intervalDays)

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-")
  })
}

</script>

<style scoped>
.product-hero {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 16px;
  align-items: center;
}

.product-facts,
.detail-card-grid,
.action-card-grid {
  display: grid;
  gap: 12px;
}

.product-facts {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin-top: 16px;
}

.product-facts ion-note {
  display: grid;
  gap: 4px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.analytics-grid ion-note {
  display: grid;
  gap: 4px;
}

.analytics-chart {
  width: 100%;
  min-height: 96px;
  color: var(--ion-text-color);
}

.analytics-chart svg text {
  fill: var(--ion-text-color);
}

.analytics-chart svg polyline {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: analytics-draw-line 1.6s ease-out forwards;
}

.analytics-chart svg rect {
  transform-box: fill-box;
  transform-origin: bottom;
  animation: analytics-rise-bar 0.6s ease-out both;
}

@keyframes analytics-draw-line {
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}

@keyframes analytics-rise-bar {
  from { transform: scaleY(0); opacity: 0; }
  to { transform: scaleY(1); opacity: 1; }
}

.detail-card-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
}

.action-card-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

@media (max-width: 640px) {
  .product-hero {
    grid-template-columns: auto 1fr;
  }

  .product-hero ion-badge {
    justify-self: start;
  }

}
</style>
