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
      <SearchFilterCard
        v-model="searchQuery"
        placeholder="Product ID, SKU, UPC, name"
        @clear="clearFilters"
      >
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
        <ion-item
          button
          lines="none"
          @click="openTagSelector"
        >
          <ion-label>
            <p>Tags</p>
            {{ selectedTagSummary }}
          </ion-label>
        </ion-item>
      </SearchFilterCard>

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
        <ion-item lines="full">
          <ion-label>{{ searchTotal }} products</ion-label>
        </ion-item>
        <ion-item lines="full">
          <ion-select
            v-model="sortFilter"
            label="Sort"
            label-placement="stacked"
            interface="popover"
          >
            <ion-select-option value="Alphabet">
              Alphabet
            </ion-select-option>
            <ion-select-option value="Updated">
              Updated
            </ion-select-option>
            <ion-select-option value="Created">
              Created
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ProductResultRow
          v-for="product in visibleResults"
          :key="product.productId || product.internalName"
          :product="product"
          :spark="rowSparks[product.productId]"
          :variant-count="variantCounts[product.productId]"
          :sort="sortFilter"
          :router-link="`/products/${product.productId}`"
        />
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

      <ion-modal
        :is-open="showTagSelector"
        @did-dismiss="closeTagSelector"
      >
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button
                aria-label="Close tag selector"
                @click="closeTagSelector"
              >
                <ion-icon
                  slot="icon-only"
                  :icon="closeOutline"
                />
              </ion-button>
            </ion-buttons>
            <ion-title>Tags</ion-title>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar
              v-model="tagSearch"
              placeholder="Search tags"
            />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list v-if="filteredTagFacets.length">
            <ion-item
              v-for="facet in visibleTagFacets"
              :key="facet.value"
              button
              lines="full"
              @click="toggleDraftTag(facet.value)"
            >
              <ion-checkbox
                slot="start"
                :checked="draftTagFilter.includes(facet.value)"
                @click.stop
                @ion-change="setDraftTag(facet.value, $event.detail.checked)"
              />
              <ion-label>{{ facet.value }}</ion-label>
              <ion-badge
                v-if="facet.count > 0"
                slot="end"
              >
                {{ facet.count }}
              </ion-badge>
            </ion-item>
            <ion-item
              v-if="remainingTagCount > 0"
              button
              lines="full"
              @click="showMoreTags"
            >
              <ion-label>Show {{ nextTagPageCount }} more tags</ion-label>
            </ion-item>
          </ion-list>
          <EmptyState
            v-else
            title="No tags found"
            message="Try a different tag search."
          />
          <ion-fab
            slot="fixed"
            vertical="bottom"
            horizontal="end"
          >
            <ion-fab-button
              aria-label="Apply tag filters"
              :disabled="!tagSelectionChanged"
              @click="applyTagSelection"
            >
              <ion-icon
                :icon="saveOutline"
                aria-hidden="true"
              />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonPage,
  IonProgressBar,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { closeOutline, saveOutline } from "ionicons/icons"
import { storeToRefs } from "pinia"
import { computed, onMounted, ref, watch } from "vue"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import ProductResultRow from "@/components/ProductResultRow.vue"
import SearchFilterCard from "@/components/SearchFilterCard.vue"
import { useProductsStore } from "@/store/products"
import { useUserStore } from "@/store/user"

const productsStore = useProductsStore()
const userStore = useUserStore()
const { searchQuery, productTypeFilter, productKindFilter, productStoreIdFilter, sortFilter, tagFilter, tagFacets, rowSparks, variantCounts, searchResults, searchTotal, searchError, loading, hasMore } = storeToRefs(productsStore)
const debounceTimer = ref<ReturnType<typeof setTimeout>>()
const showTagSelector = ref(false)
const tagSearch = ref("")
const draftTagFilter = ref<string[]>([])
const tagRenderLimit = ref(50)
const suppressFilterSearch = ref(false)
const productStoreOptions = computed(() => (userStore.getUserProfile?.stores || []).filter((store: any) => store.productStoreId))

const visibleResults = computed(() => searchResults.value)
const selectedTagSummary = computed(() => {
  if(!tagFilter.value.length) {return "All tags"}
  if(tagFilter.value.length === 1) {return tagFilter.value[0]}

  return `${tagFilter.value.length} selected`
})
const tagOptions = computed(() => {
  const facets = [...tagFacets.value]
  const facetValues = new Set(facets.map((facet) => facet.value))
  draftTagFilter.value.forEach((tag) => {
    if(!facetValues.has(tag)) {
      facets.push({ value: tag, count: 0 })
    }
  })

  return facets
})
const filteredTagFacets = computed(() => {
  const query = tagSearch.value.trim().toLowerCase()
  if(!query) {return tagOptions.value}

  return tagOptions.value.filter((facet) => facet.value.toLowerCase().includes(query))
})
const visibleTagFacets = computed(() => filteredTagFacets.value.slice(0, tagRenderLimit.value))
const remainingTagCount = computed(() => Math.max(filteredTagFacets.value.length - visibleTagFacets.value.length, 0))
const nextTagPageCount = computed(() => Math.min(50, remainingTagCount.value))
const tagSelectionChanged = computed(() => sortedTags(tagFilter.value).join("\n") !== sortedTags(draftTagFilter.value).join("\n"))

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
  if(suppressFilterSearch.value) {return}

  scheduleSearch()
})

watch(productTypeFilter, () => {
  if(suppressFilterSearch.value) {return}

  productsStore.runSearch()
})

watch(productKindFilter, () => {
  if(suppressFilterSearch.value) {return}

  productsStore.runSearch()
})

watch(productStoreIdFilter, () => {
  if(suppressFilterSearch.value) {return}

  productsStore.runSearch()
})

watch(sortFilter, () => {
  if(suppressFilterSearch.value) {return}

  productsStore.runSearch()
})

watch(tagSearch, () => {
  tagRenderLimit.value = 50
})

function scheduleSearch() {
  if(debounceTimer.value) {clearTimeout(debounceTimer.value)}
  debounceTimer.value = setTimeout(() => productsStore.runSearch(), 300)
}

function clearFilters() {
  suppressFilterSearch.value = true
  if(debounceTimer.value) {clearTimeout(debounceTimer.value)}

  productsStore.searchQuery = ""
  productsStore.productTypeFilter = "FINISHED_GOOD"
  productsStore.productKindFilter = "All"
  productsStore.productStoreIdFilter = "All"
  productsStore.sortFilter = "Alphabet"
  productsStore.tagFilter = []
  suppressFilterSearch.value = false
  productsStore.runSearch()
}

async function loadMore(event: CustomEvent) {
  await productsStore.appendNextPage()
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}

function openTagSelector() {
  draftTagFilter.value = [...tagFilter.value]
  tagSearch.value = ""
  tagRenderLimit.value = 50
  showTagSelector.value = true
}

function closeTagSelector() {
  showTagSelector.value = false
  tagSearch.value = ""
  tagRenderLimit.value = 50
}

function toggleDraftTag(tag: string) {
  setDraftTag(tag, !draftTagFilter.value.includes(tag))
}

function setDraftTag(tag: string, selected: boolean) {
  draftTagFilter.value = selected
    ? Array.from(new Set([...draftTagFilter.value, tag]))
    : draftTagFilter.value.filter((entry) => entry !== tag)
}

function applyTagSelection() {
  productsStore.tagFilter = [...draftTagFilter.value]
  showTagSelector.value = false
  productsStore.runSearch()
}

function showMoreTags() {
  tagRenderLimit.value += 50
}

function sortedTags(tags: string[]) {
  return [...tags].sort((first, second) => first.localeCompare(second))
}
</script>
