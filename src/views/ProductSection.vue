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
        <ion-card>
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg
                :src="detail.imageUrl"
                size="small"
              />
            </ion-thumbnail>
            <ion-label>
              <p>{{ detail.productId }}</p>
              <h2>{{ detail.productName || detail.internalName || detail.productId }}</h2>
              <p>{{ detail.productTypeId || "Unknown type" }} · {{ detail.primaryProductCategoryId || "No category" }}</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label>
              <p>{{ productKindLabel }}</p>
              <p>{{ detail.createdDate ? `Selling since ${detail.createdDate}` : "Selling date unavailable" }}</p>
            </ion-label>
            <ion-button
              slot="end"
              fill="clear"
            >
              Edit product
            </ion-button>
          </ion-item>
        </ion-card>

        <ion-list v-if="section === 'identifiers'">
          <ion-list-header>
            <ion-label>Identifiers and aliases</ion-label>
            <ion-button fill="clear">
              Add identifier
            </ion-button>
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
            <ion-button
              slot="end"
              fill="clear"
            >
              Edit
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'relationships'">
          <ion-list-header>
            <ion-label>{{ relationshipListTitle }}</ion-label>
            <ion-button fill="clear">
              {{ relationshipActionLabel }}
            </ion-button>
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
            <ion-button
              slot="end"
              fill="clear"
            >
              Edit
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'stores'">
          <ion-list-header>
            <ion-label>Store and category exposure</ion-label>
            <ion-button fill="clear">
              Add exposure
            </ion-button>
          </ion-list-header>
          <ion-item
            v-for="exposure in detail.storeCatalogs"
            :key="`${exposure.productStoreId}-${exposure.prodCatalogId}-${exposure.productCategoryId}-${exposure.fromDate}`"
          >
            <ion-label>
              <h2>{{ exposure.categoryName || exposure.productCategoryId }}</h2>
              <p>{{ exposure.storeName || exposure.productStoreId || "No product store" }}</p>
              <p>{{ catalogLabel(exposure) }}</p>
              <p>{{ exposure.fromDate || "No start date" }} · {{ exposure.thruDate || "No end date" }}</p>
            </ion-label>
            <ion-badge slot="end">
              {{ exposure.status }}
            </ion-badge>
            <ion-button
              slot="end"
              fill="clear"
            >
              Edit
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'features'">
          <ion-list-header>
            <ion-label>{{ featureListTitle }}</ion-label>
            <ion-button fill="clear">
              {{ detail.isVariant ? "Add value" : "Add option" }}
            </ion-button>
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
            <ion-button
              slot="end"
              fill="clear"
            >
              Edit
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'shopify'">
          <ion-list-header>
            <ion-label>Channel mapping</ion-label>
            <ion-button fill="clear">
              Add mapping
            </ion-button>
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
            <ion-button
              slot="end"
              fill="clear"
            >
              Edit
            </ion-button>
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
            <ion-button fill="clear">
              Edit logistics
            </ion-button>
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
            <ion-button
              slot="end"
              fill="clear"
            >
              Edit
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-list v-if="section === 'financials'">
          <ion-list-header>
            <ion-label>Financial setup</ion-label>
            <ion-button fill="clear">
              Edit finance
            </ion-button>
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
            <ion-button fill="clear">
              View orders
            </ion-button>
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
        </ion-list>

        <ion-list v-if="section === 'history'">
          <ion-list-header>
            <ion-label>Entity audit history</ion-label>
            <ion-button fill="clear">
              Refresh
            </ion-button>
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
  IonButton,
  IonButtons,
  IonCard,
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
  IonThumbnail,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { storeToRefs } from "pinia"
import { computed, onMounted, watch } from "vue"
import { DxpShopifyImg } from "@common"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"
import type { StoreCatalogExposure } from "@/types/product"

const props = defineProps<{
  productId: string
  section: string
}>()

const productsStore = useProductsStore()
const { detail, detailLoading, detailError } = storeToRefs(productsStore)

const title = computed(() => {
  const titles: Record<string, string> = {
    identifiers: "Identifiers",
    relationships: relationshipListTitle.value,
    stores: "Stores and categories",
    features: featureListTitle.value,
    shopify: "Channel mapping",
    logistics: "Logistics",
    financials: "Financials",
    analytics: "Analytics",
    history: "History"
  }

  return titles[props.section] || "Product"
})

const hsCode = computed(() => detail.value?.identifiers.find((identifier) => identifier.typeId.toUpperCase().includes("HS"))?.value || "")
const relationshipListTitle = computed(() => {
  if(detail.value?.isVariant) {return "Substitutions and replacements"}
  if(detail.value?.isVirtual) {return "Variant family"}

  return "Related products"
})
const featureListTitle = computed(() => detail.value?.isVariant ? "Variant option values" : "Selectable options")
const productKindLabel = computed(() => {
  if(detail.value?.isVirtual) {return "Virtual product"}
  if(detail.value?.isVariant) {return "Variant product"}

  return "Standard product"
})
const relationshipActionLabel = computed(() => {
  if(detail.value?.isVariant) {return "Add substitute"}
  if(detail.value?.isVirtual) {return "Add variant"}

  return "Add relationship"
})

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
  if(props.section === "relationships" && detail.value?.isVariant) {return "No substitute, replacement, kit, BOM, or parent relationship was returned for this variant."}
  if(props.section === "relationships" && detail.value?.isVirtual) {return "No child variants or family relationships were returned for this virtual product."}
  if(props.section === "features" && detail.value?.isVariant) {return "No assigned option values were returned for this variant."}
  if(props.section === "features") {return "No selectable option data was returned for this product."}
  if(props.section === "shopify") {return "No product-scoped Shopify mapping was returned."}
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

function catalogLabel(exposure: StoreCatalogExposure): string {
  return [
    exposure.catalogName || exposure.prodCatalogId || "No catalog",
    exposure.categoryTypeDescription || exposure.categoryTypeId
  ].filter(Boolean).join(" · ")
}
</script>
