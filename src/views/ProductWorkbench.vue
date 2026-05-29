<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Product workbench</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card>
        <ion-card-content>
          <ion-searchbar
            v-model="searchQuery"
            placeholder="Product ID, SKU, UPC, name"
          />
          <div class="search-filter-grid">
            <ion-select
              v-model="productTypeFilter"
              label="Product type"
              label-placement="stacked"
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
            <ion-select
              v-model="productStoreIdFilter"
              label="Product store"
              label-placement="stacked"
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
            <ion-select
              v-model="productKindFilter"
              label="Virtual/variant"
              label-placement="stacked"
              interface="popover"
            >
              <ion-select-option value="All">
                All products
              </ion-select-option>
              <ion-select-option value="Variants">
                Variants
              </ion-select-option>
              <ion-select-option value="Virtuals">
                Virtuals
              </ion-select-option>
            </ion-select>
            <ion-button
              fill="clear"
              @click="clearFilters"
            >
              Clear
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

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
          <ion-label>{{ searchTotal }} products</ion-label>
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
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonPage,
  IonProgressBar,
  IonSearchbar,
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
const { searchQuery, productTypeFilter, productKindFilter, productStoreIdFilter, searchResults, searchTotal, searchError, loading, hasMore } = storeToRefs(productsStore)
const debounceTimer = ref<ReturnType<typeof setTimeout>>()
const productStoreOptions = computed(() => (userStore.getUserProfile?.stores || []).filter((store: any) => store.productStoreId))

const visibleResults = computed(() => searchResults.value)

onMounted(async () => {
  if(!productStoreOptions.value.length) {
    await userStore.fetchProductStores()
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

watch(productTypeFilter, () => {
  productsStore.runSearch()
})

watch(productKindFilter, () => {
  productsStore.runSearch()
})

watch(productStoreIdFilter, () => {
  productsStore.runSearch()
})

function scheduleSearch() {
  if(debounceTimer.value) {clearTimeout(debounceTimer.value)}
  debounceTimer.value = setTimeout(() => productsStore.runSearch(), 300)
}

function clearFilters() {
  productsStore.searchQuery = ""
  productsStore.productTypeFilter = "FINISHED_GOOD"
  productsStore.productKindFilter = "All"
  productsStore.productStoreIdFilter = "All"
}

function displayName(product: ProductSummary): string {
  return product.productName || product.internalName || product.productId || "Unnamed product"
}

async function loadMore(event: CustomEvent) {
  await productsStore.appendNextPage()
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}
</script>

<style scoped>
.search-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  align-items: end;
}

@media (max-width: 640px) {
  .search-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
