<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/products/${productId}`" />
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ title }}</ion-title>
      </ion-toolbar>
      <ion-progress-bar
        v-if="detailLoading"
        type="indeterminate"
      />
    </ion-header>

    <ion-content>
      <ErrorState
        v-if="detailError"
        title="Product section failed"
        :message="detailError"
      />

      <template v-if="detail">
        <ion-list>
          <ion-list-header>
            <ion-label>{{ detail.productName || detail.internalName || detail.productId }}</ion-label>
          </ion-list-header>
          <ion-item>
            <ion-label>
              <h2>{{ detail.productId }}</h2>
              <p>{{ detail.productTypeId || "Unknown type" }} · {{ detail.primaryProductCategoryId || "No category" }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'identifiers'">
          <ion-list-header>
            <ion-label>Identifiers and aliases</ion-label>
          </ion-list-header>
          <ion-item
            v-for="identifier in detail.identifiers"
            :key="`${identifier.typeId}-${identifier.value}-${identifier.fromDate}`"
          >
            <ion-label>
              <h2>{{ identifier.typeDescription || identifier.typeId }}</h2>
              <p>{{ identifier.value }}</p>
              <p>{{ identifier.fromDate || "No start date" }} · {{ identifier.thruDate || "No end date" }}</p>
            </ion-label>
            <ion-badge
              slot="end"
              :color="identifier.active ? 'success' : 'medium'"
            >
              {{ identifier.active ? "Active" : "Expired" }}
            </ion-badge>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'relationships'">
          <ion-list-header>
            <ion-label>Relationships</ion-label>
          </ion-list-header>
          <ion-item
            v-for="relationship in detail.relationships"
            :key="`${relationship.typeId}-${relationship.relatedProductId}-${relationship.fromDate}`"
          >
            <ion-label>
              <h2>{{ relationship.relatedName || relationship.relatedProductId }}</h2>
              <p>{{ relationship.typeId }} · Quantity {{ relationship.quantity || "1" }}</p>
              <p>{{ relationship.fromDate || "No start date" }} · {{ relationship.thruDate || "No end date" }}</p>
            </ion-label>
            <ion-note slot="end">
              {{ relationship.sequenceNum }}
            </ion-note>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'stores'">
          <ion-list-header>
            <ion-label>Store and category exposure</ion-label>
          </ion-list-header>
          <ion-item
            v-for="exposure in detail.storeCatalogs"
            :key="`${exposure.productStoreId}-${exposure.prodCatalogId}-${exposure.productCategoryId}-${exposure.fromDate}`"
          >
            <ion-label>
              <h2>{{ exposure.categoryName || exposure.productCategoryId }}</h2>
              <p>{{ exposure.storeName || exposure.productStoreId || "Product category member" }}</p>
              <p>{{ exposure.prodCatalogId || "No catalog" }} · {{ exposure.fromDate || "No start date" }}</p>
            </ion-label>
            <ion-badge slot="end">
              {{ exposure.status }}
            </ion-badge>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'features'">
          <ion-list-header>
            <ion-label>Selectable features</ion-label>
          </ion-list-header>
          <ion-item
            v-for="feature in detail.features"
            :key="`${feature.featureTypeId}-${feature.productFeatureId}`"
          >
            <ion-label>
              <h2>{{ feature.featureTypeDescription || feature.featureTypeId }}</h2>
              <p>{{ feature.description || feature.productFeatureId }}</p>
              <p>Sequence {{ feature.sequenceNum || "not set" }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'shopify'">
          <ion-list-header>
            <ion-label>Shopify mappings</ion-label>
          </ion-list-header>
          <ion-item
            v-for="mapping in detail.shopifyMappings"
            :key="`${mapping.shopId}-${mapping.shopifyProductId}-${mapping.shopifyVariantId}`"
          >
            <ion-label>
              <h2>{{ mapping.shopName || mapping.shopId }}</h2>
              <p>Product {{ mapping.shopifyProductId || "unavailable" }}</p>
              <p>Variant {{ mapping.shopifyVariantId || "unavailable" }} · {{ mapping.handle || "No handle" }}</p>
            </ion-label>
            <ion-note slot="end">
              {{ mapping.status }}
            </ion-note>
          </ion-item>
          <ion-item button>
            <ion-label>
              <h2>Repair mapping</h2>
              <p>Requires service-backed Shopify mapping repair API.</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'logistics'">
          <ion-list-header>
            <ion-label>Logistics and trade</ion-label>
          </ion-list-header>
          <ion-item
            v-for="field in detail.dimensions"
            :key="field.label"
          >
            <ion-label>{{ field.label }}</ion-label>
            <ion-note slot="end">
              {{ field.value || "Missing" }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>HS code</ion-label>
            <ion-note slot="end">
              {{ hsCode || "Missing" }}
            </ion-note>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'financials'">
          <ion-list-header>
            <ion-label>Financial setup</ion-label>
          </ion-list-header>
          <ion-item>
            <ion-label>Taxable</ion-label>
            <ion-note slot="end">
              {{ detail.taxable || "Missing" }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Brand</ion-label>
            <ion-note slot="end">
              {{ detail.brandName || "Missing" }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Tax code, GL, legal entity</ion-label>
            <ion-note slot="end">
              API gap
            </ion-note>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'analytics'">
          <ion-list-header>
            <ion-label>Last {{ detail.analytics.windowDays }} days</ion-label>
          </ion-list-header>
          <ion-item>
            <ion-label>Orders</ion-label>
            <ion-note slot="end">
              {{ metric(detail.analytics.orderCount) }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Units sold</ion-label>
            <ion-note slot="end">
              {{ metric(detail.analytics.unitsSold) }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Cancelled units</ion-label>
            <ion-note slot="end">
              {{ metric(detail.analytics.cancelledUnits) }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Returned units</ion-label>
            <ion-note slot="end">
              {{ metric(detail.analytics.returnedUnits) }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Fulfillment exceptions</ion-label>
            <ion-note slot="end">
              {{ metric(detail.analytics.exceptionCount) }}
            </ion-note>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'history'">
          <ion-list-header>
            <ion-label>Sync and import history</ion-label>
          </ion-list-header>
          <ion-item
            v-for="history in detail.histories"
            :key="`${history.source}-${history.timestamp}-${history.message}`"
          >
            <ion-label>
              <h2>{{ history.source }}</h2>
              <p>{{ history.message || "No details" }}</p>
              <p>{{ history.timestamp }}</p>
            </ion-label>
            <ion-note slot="end">
              {{ history.status }}
            </ion-note>
          </ion-item>
        </ion-list>

        <EmptyState
          v-if="isEmptySection"
          title="No section data"
          :message="emptyMessage"
        />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
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
import { storeToRefs } from "pinia"
import { computed, onMounted, watch } from "vue"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"

const props = defineProps<{
  productId: string
  section: string
}>()

const productsStore = useProductsStore()
const { detail, detailLoading, detailError } = storeToRefs(productsStore)

const title = computed(() => {
  const titles: Record<string, string> = {
    identifiers: "Identifiers",
    relationships: "Relationships",
    stores: "Stores",
    features: "Features",
    shopify: "Shopify",
    logistics: "Logistics",
    financials: "Financials",
    analytics: "Analytics",
    history: "History"
  }

  return titles[props.section] || "Product"
})

const hsCode = computed(() => detail.value?.identifiers.find((identifier) => identifier.typeId.toUpperCase().includes("HS"))?.value || "")

const isEmptySection = computed(() => {
  if(!detail.value) {return false}
  if(props.section === "identifiers") {return !detail.value.identifiers.length}
  if(props.section === "relationships") {return !detail.value.relationships.length}
  if(props.section === "stores") {return !detail.value.storeCatalogs.length}
  if(props.section === "features") {return !detail.value.features.length}
  if(props.section === "shopify") {return !detail.value.shopifyMappings.length}
  if(props.section === "history") {return !detail.value.histories.length}

  return false
})

const emptyMessage = computed(() => {
  if(props.section === "features") {return "Selectable feature APIs are not exposed as a product-scoped read yet."}
  if(props.section === "shopify") {return "No product-scoped Shopify mapping was returned by the current OMS APIs."}
  if(props.section === "stores") {return "No category membership or product-store exposure was returned."}

  return "The current OMS APIs did not return records for this section."
})

onMounted(() => productsStore.fetchDetail(props.productId))

watch(() => props.productId, (productId) => {
  productsStore.fetchDetail(productId)
})

function metric(value: number | null): string {
  return value === null ? "API gap" : String(value)
}
</script>
