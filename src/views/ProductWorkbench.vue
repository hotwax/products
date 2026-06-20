<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Product workbench") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/products/create">
            <ion-icon
              slot="icon-only"
              :icon="addOutline"
            />
          </ion-button>
        </ion-buttons>
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
          <ion-icon :icon="closeOutline" />
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
            @click="onAddTagToSelected"
          >
            <ion-icon
              slot="start"
              :icon="pricetagOutline"
            />
            {{ translate("Add tag") }}
          </ion-button>
          <ion-button
            v-if="selectedProductIds.length"
            slot="end"
            fill="clear"
            size="small"
            @click="clearSelection"
          >
            {{ translate("Clear") }}
          </ion-button>
          <ion-select
            slot="end"
            :value="sort"
            interface="popover"
            :label="translate('Sort')"
            @ion-change="sort = $event.detail.value"
          >
            <ion-select-option value="Alphabet">
              {{ translate("Alphabetical") }}
            </ion-select-option>
            <ion-select-option value="Updated">
              {{ translate("Recently updated") }}
            </ion-select-option>
            <ion-select-option value="Created">
              {{ translate("Recently created") }}
            </ion-select-option>
          </ion-select>
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
            :router-link="familyRouteFor(product)"
            :variant-counts="groupIdFacets"
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

      <AddTagModal
        :is-open="isAddTagModalOpen"
        :facets="tagFacets"
        @add="onTagSelected"
        @dismiss="isAddTagModalOpen = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
  IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonPage, IonProgressBar, IonSelect, IonSelectOption,
  IonSkeletonText, IonThumbnail, IonTitle, IonToolbar, loadingController
} from "@ionic/vue"
import { addOutline, closeCircleOutline, closeOutline, pricetagOutline } from "ionicons/icons"
import { computed, ref } from "vue"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import ProductRow from "@/components/workbench/ProductRow.vue"
import AddTagModal from "@/components/workbench/AddTagModal.vue"
import TagFilterModal from "@/components/workbench/TagFilterModal.vue"
import WorkbenchFilters from "@/components/workbench/WorkbenchFilters.vue"
import { errorMessage } from "@/api/http"
import { addProductKeyword, triggerSolrIndex } from "@/api/pim"
import { useProductWorkbench } from "@/composables/useProductWorkbench"
import { useToast } from "@/composables/useToast"
import { familyRouteFor } from "@/domain/product/family"

const {
  queryString, productTypeId, productKind, groupIdFacets, productStoreId, tags, sort,
  clearFilters, toggleTag,
  products, total, isLoading, isFetching, isError, error, hasNextPage, loadMore, refetch,
  tagFacets, productTypes, productStores,
  selectedProductIds, selectedSet, allVisibleSelected, toggleSelectAll, toggleSelected, clearSelection
} = useProductWorkbench()

const isTagModalOpen = ref(false)
const isAddTagModalOpen = ref(false)
const toast = useToast()

const resultsLabel = computed(() =>
  total.value === 1 ? translate("1 result") : `${total.value} ${translate("results")}`)
const errorText = computed(() => errorMessage(error.value, translate("Search is unavailable")))

const onInfinite = (event: CustomEvent) => loadMore(() => (event.target as any)?.complete())

const onAddTagToSelected = () => {
  isAddTagModalOpen.value = true
}

const onTagSelected = async (tags: string[]) => {
  isAddTagModalOpen.value = false
  const ids = [...selectedProductIds.value]
  let failed = 0
  for(const productId of ids) {
    for(const tag of tags) {
      try {
        await addProductKeyword(productId, tag)
      } catch {
        failed++
      }
    }
    triggerSolrIndex(productId)
  }
  if(failed) {
    toast.error(null, translate(`Could not add tag to ${failed} product(s)`))
  } else {
    toast.success(translate(`${tags.length > 1 ? tags.length + " tags" : "Tag"} added to ${ids.length} product(s)`))
  }
  clearSelection()

  const loading = await loadingController.create({ message: translate("Updating products...") })
  await loading.present()
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await refetch()
  await loading.dismiss()
}
</script>

<style scoped>
.active-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 16px;
}
</style>
