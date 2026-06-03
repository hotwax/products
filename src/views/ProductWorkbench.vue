<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Product workbench") }}</ion-title>
        <ion-progress-bar
          v-if="isFetching && !isLoading"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <WorkbenchFilters
        v-model:query-string="queryString"
        v-model:product-type-id="productTypeId"
        v-model:product-store-id="productStoreId"
        v-model:product-kind="productKind"
        v-model:sort="sort"
        :tags="tags"
        :product-types="productTypes"
        :product-stores="productStores"
        @open-tags="isTagModalOpen = true"
        @clear="clearFilters"
      />

      <div
        v-if="tags.length"
        class="active-tags"
      >
        <ion-chip
          v-for="tag in tags"
          :key="tag"
          outline
          @click="toggleTag(tag)"
        >
          <ion-label>{{ tag }}</ion-label>
          <ion-icon :icon="closeCircleOutline" />
        </ion-chip>
      </div>

      <ion-list v-if="!isError">
        <ion-list-header>
          <ion-label>{{ resultsLabel }}</ion-label>
        </ion-list-header>

        <ion-item lines="full">
          <ion-checkbox
            slot="start"
            :checked="allVisibleSelected"
            :indeterminate="selectedProductIds.length > 0 && !allVisibleSelected"
            aria-label="Select all"
            @ion-change="toggleSelectAll"
          />
          <ion-label>
            {{ selectedProductIds.length ? `${selectedProductIds.length} ${translate("selected")}` : translate("Select all") }}
          </ion-label>
          <ion-button
            v-if="selectedProductIds.length"
            slot="end"
            fill="clear"
            size="small"
            @click="clearSelection"
          >
            {{ translate("Clear") }}
          </ion-button>
        </ion-item>

        <template v-if="isLoading">
          <ion-item
            v-for="i in 6"
            :key="i"
            lines="full"
          >
            <ion-thumbnail slot="start">
              <ion-skeleton-text animated />
            </ion-thumbnail>
            <ion-label>
              <h2>
                <ion-skeleton-text
                  animated
                  style="width: 50%"
                />
              </h2>
              <p>
                <ion-skeleton-text
                  animated
                  style="width: 30%"
                />
              </p>
            </ion-label>
          </ion-item>
        </template>

        <template v-else>
          <ProductRow
            v-for="product in products"
            :key="product.productId"
            :product="product"
            :router-link="`/products/${product.productId}`"
            selectable
            :selected="selectedSet.has(product.productId)"
            @toggle-select="toggleSelected(product.productId)"
          />
          <EmptyState
            v-if="!products.length"
            :title="translate('No products found')"
            :message="translate('Try adjusting the search or filters')"
          />
        </template>
      </ion-list>

      <ErrorState
        v-else
        :title="translate('Could not load products')"
        :message="errorText"
        @retry="refetch"
      />

      <ion-infinite-scroll
        :disabled="!hasNextPage"
        @ion-infinite="onInfinite"
      >
        <ion-infinite-scroll-content loading-spinner="crescent" />
      </ion-infinite-scroll>

      <TagFilterModal
        :is-open="isTagModalOpen"
        :facets="tagFacets"
        :selected="tags"
        @toggle="toggleTag"
        @dismiss="isTagModalOpen = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
  IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonPage, IonProgressBar, IonSkeletonText, IonThumbnail,
  IonTitle, IonToolbar
} from "@ionic/vue"
import { closeCircleOutline } from "ionicons/icons"
import { computed, ref } from "vue"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import ProductRow from "@/components/workbench/ProductRow.vue"
import TagFilterModal from "@/components/workbench/TagFilterModal.vue"
import WorkbenchFilters from "@/components/workbench/WorkbenchFilters.vue"
import { errorMessage } from "@/api/http"
import { useProductWorkbench } from "@/composables/useProductWorkbench"

const {
  queryString, productTypeId, productKind, productStoreId, tags, sort,
  clearFilters, toggleTag,
  products, total, isLoading, isFetching, isError, error, hasNextPage, loadMore, refetch,
  tagFacets, productTypes, productStores,
  selectedProductIds, selectedSet, allVisibleSelected, toggleSelectAll, toggleSelected, clearSelection
} = useProductWorkbench()

const isTagModalOpen = ref(false)

const resultsLabel = computed(() =>
  total.value === 1 ? translate("1 result") : `${total.value} ${translate("results")}`)
const errorText = computed(() => errorMessage(error.value, translate("Search is unavailable")))

const onInfinite = (event: CustomEvent) => loadMore(() => (event.target as any)?.complete())
</script>

<style scoped>
.active-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 16px;
}
</style>
