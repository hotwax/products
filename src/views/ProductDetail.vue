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
        <ion-list>
          <ion-list-header>
            <ion-label>Overview</ion-label>
          </ion-list-header>
          <ion-item>
            <ion-label>
              <h2>{{ detail.productName || detail.internalName || detail.productId }}</h2>
              <p>{{ detail.productTypeId || "Unknown type" }} · {{ detail.primaryProductCategoryId || "No category" }}</p>
              <p>{{ detail.brandName || "No brand" }}</p>
            </ion-label>
            <ion-badge
              slot="end"
              :color="detail.readiness.state === 'ready' ? 'success' : 'warning'"
            >
              {{ detail.readiness.state }}
            </ion-badge>
          </ion-item>
          <ion-item>
            <ion-label>Virtual product</ion-label>
            <ion-note slot="end">
              {{ detail.isVirtual ? "Yes" : "No" }}
            </ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Variant product</ion-label>
            <ion-note slot="end">
              {{ detail.isVariant ? "Yes" : "No" }}
            </ion-note>
          </ion-item>
        </ion-list>

        <ion-list>
          <ion-list-header>
            <ion-label>Readiness</ion-label>
          </ion-list-header>
          <ion-item
            v-for="item in detail.readinessChecklist"
            :key="item.label"
            :router-link="item.route"
          >
            <ion-label>
              <h2>{{ item.label }}</h2>
              <p>{{ item.detail }}</p>
            </ion-label>
            <ion-badge
              slot="end"
              :color="item.complete ? 'success' : 'warning'"
            >
              {{ item.complete ? "Ready" : "Missing" }}
            </ion-badge>
          </ion-item>
        </ion-list>

        <ion-list>
          <ion-list-header>
            <ion-label>Sections</ion-label>
          </ion-list-header>
          <ion-item
            v-for="section in sections"
            :key="section.id"
            :router-link="`/products/${productId}/${section.id}`"
          >
            <ion-label>
              <h2>{{ section.label }}</h2>
              <p>{{ section.description }}</p>
            </ion-label>
            <ion-note slot="end">
              {{ sectionCount(section.id) }}
            </ion-note>
          </ion-item>
        </ion-list>
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
import { onMounted, watch } from "vue"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"

const props = defineProps<{
  productId: string
}>()

const productsStore = useProductsStore()
const { detail, detailLoading, detailError } = storeToRefs(productsStore)

const sections = [
  { id: "identifiers", label: "Identifiers", description: "SKU, UPC, GTIN, HS code, aliases" },
  { id: "relationships", label: "Relationships", description: "Variants, BOM components, substitutes" },
  { id: "stores", label: "Stores and categories", description: "Catalog and category exposure" },
  { id: "features", label: "Selectable features", description: "Option axes and values" },
  { id: "shopify", label: "Shopify mapping", description: "Shop, product, variant, and sync context" },
  { id: "logistics", label: "Logistics", description: "Dimensions, weight, origin, handling" },
  { id: "financials", label: "Financials", description: "Tax, GL, legal entity, brand" },
  { id: "analytics", label: "Analytics", description: "Last 30 days of order context" },
  { id: "history", label: "History", description: "Product sync and import updates" }
]

onMounted(() => productsStore.fetchDetail(props.productId))

watch(() => props.productId, (productId) => {
  productsStore.fetchDetail(productId)
})

function sectionCount(section: string): number | string {
  if(!detail.value) {return ""}
  if(section === "identifiers") {return detail.value.identifiers.length}
  if(section === "relationships") {return detail.value.relationships.length}
  if(section === "stores") {return detail.value.storeCatalogs.length}
  if(section === "features") {return detail.value.features.length}
  if(section === "shopify") {return detail.value.shopifyMappings.length}
  if(section === "history") {return detail.value.histories.length}
  if(section === "analytics") {return "30d"}

  return ""
}
</script>
