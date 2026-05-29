<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Product workbench</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Product ID, SKU, UPC, name"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>Filters</ion-label>
          <ion-button
            fill="clear"
            @click="clearFilters"
          >
            Clear
          </ion-button>
        </ion-list-header>
        <ion-item>
          <ion-select
            v-model="readinessFilter"
            label="Readiness"
            interface="popover"
          >
            <ion-select-option value="All">
              All products
            </ion-select-option>
            <ion-select-option value="attention">
              Needs attention
            </ion-select-option>
            <ion-select-option value="blocked">
              Blocked
            </ion-select-option>
            <ion-select-option value="ready">
              Ready
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select
            v-model="productTypeFilter"
            label="Product type"
            interface="popover"
          >
            <ion-select-option value="All">
              All types
            </ion-select-option>
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
          <ion-select
            v-model="productStoreIdFilter"
            label="Product store"
            interface="popover"
          >
            <ion-select-option value="All">
              All stores
            </ion-select-option>
            <ion-select-option
              v-for="store in productStoreOptions"
              :key="store.productStoreId"
              :value="store.productStoreId"
            >
              {{ store.storeName || store.productStoreId }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-segment v-model="productKindFilter">
            <ion-segment-button value="All">
              <ion-label>All</ion-label>
            </ion-segment-button>
            <ion-segment-button value="Variants">
              <ion-label>Variants</ion-label>
            </ion-segment-button>
            <ion-segment-button value="Virtuals">
              <ion-label>Virtuals</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-item>
      </ion-list>

      <ion-progress-bar
        v-if="loading"
        type="indeterminate"
      />

      <ErrorState
        v-if="searchError"
        title="Product lookup failed"
        :message="searchError"
      />

      <ion-list v-else>
        <ion-list-header>
          <ion-label>{{ visibleResults.length }} products</ion-label>
        </ion-list-header>
        <ion-item
          v-for="product in visibleResults"
          :key="product.productId || product.internalName"
          :router-link="`/products/${product.productId}`"
        >
          <ion-thumbnail slot="start">
            <DxpShopifyImg
              :src="product.imageUrl"
              size="thumb"
            />
          </ion-thumbnail>
          <ion-label>
            <h2>{{ displayName(product) }}</h2>
            <p>{{ product.primarySku || product.productId }} · {{ product.productTypeId || "Unknown type" }}</p>
            <p>{{ product.primaryProductCategoryId || "No primary category" }}</p>
          </ion-label>
          <ion-badge
            v-if="product.readiness.missingCount"
            slot="end"
            color="warning"
          >
            {{ product.readiness.missingCount }}
          </ion-badge>
          <ion-note
            v-else
            slot="end"
          >
            Ready
          </ion-note>
        </ion-item>
      </ion-list>

      <EmptyState
        v-if="!loading && !searchError && !visibleResults.length"
        title="No matching products"
        message="Try a product ID, SKU, UPC, barcode, or exact product name."
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
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonNote,
  IonPage,
  IonProgressBar,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { storeToRefs } from "pinia"
import { computed, onMounted, ref, watch } from "vue"
import { DxpShopifyImg } from "@common"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"
import { useUserStore } from "@/store/user"
import type { ProductSummary } from "@/types/product"

const productsStore = useProductsStore()
const userStore = useUserStore()
const { searchQuery, readinessFilter, productTypeFilter, productKindFilter, productStoreIdFilter, searchResults, searchError, loading, hasMore } = storeToRefs(productsStore)
const debounceTimer = ref<ReturnType<typeof setTimeout>>()
const currentProductStore = computed(() => userStore.getCurrentProductStore)
const productStoreOptions = computed(() => (userStore.getUserProfile?.stores || []).filter((store: any) => store.productStoreId))

const visibleResults = computed(() => {
  if(readinessFilter.value === "All") {return searchResults.value}

  return searchResults.value.filter((product) => product.readiness.state === readinessFilter.value)
})

onMounted(async () => {
  if(!productStoreOptions.value.length) {
    await userStore.fetchProductStores()
  }

  if(!productStoreIdFilter.value && currentProductStore.value.productStoreId) {
    productStoreIdFilter.value = currentProductStore.value.productStoreId

    return
  }

  if(!productStoreIdFilter.value) {
    productStoreIdFilter.value = "All"

    return
  }

  productsStore.runSearch()
})

watch(searchQuery, () => {
  scheduleSearch()
})

watch(readinessFilter, () => {
  productsStore.runSearch()
})

watch(productTypeFilter, () => {
  productsStore.runSearch()
})

watch(productKindFilter, () => {
  productsStore.runSearch()
})

watch(productStoreIdFilter, () => {
  productsStore.runSearch()
})

watch(() => currentProductStore.value.productStoreId, (productStoreId) => {
  if(productStoreId && !productStoreIdFilter.value) {
    productStoreIdFilter.value = productStoreId
  }
})

function scheduleSearch() {
  if(debounceTimer.value) {clearTimeout(debounceTimer.value)}
  debounceTimer.value = setTimeout(() => productsStore.runSearch(), 300)
}

function clearFilters() {
  productsStore.searchQuery = ""
  productsStore.readinessFilter = "All"
  productsStore.productTypeFilter = "FINISHED_GOOD"
  productsStore.productKindFilter = "All"
  productsStore.productStoreIdFilter = currentProductStore.value.productStoreId || "All"
}

function displayName(product: ProductSummary): string {
  return product.productName || product.internalName || product.productId || "Unnamed product"
}

async function loadMore(event: CustomEvent) {
  await productsStore.appendNextPage()
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}
</script>
