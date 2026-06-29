import { computed } from "vue"
import { storeToRefs } from "pinia"
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query"
import { groupIdFacetsOptions, rowSalesAnalyticsOptions, tagFacetsOptions, workbenchSearchOptions } from "@/queries/products"
import { productStoresOptions, productTypesOptions } from "@/queries/catalog"
import { useWorkbenchStore } from "@/stores/workbench"

/** Page facade for the workbench: wires filter state (Pinia) to the search/facet queries (TanStack)
 *  and exposes exactly what the view renders. Views import THIS, never api/queries directly. */
export function useProductWorkbench() {
  const workbench = useWorkbenchStore()
  const { queryString, productTypeId, productKind, productStoreId, tags, groupIds, sort, selectedProductIds } = storeToRefs(workbench)

  const searchParams = computed(() => workbench.searchParams)

  const searchQuery = useInfiniteQuery(computed(() => workbenchSearchOptions(searchParams.value)))
  const tagFacetsQuery = useQuery(computed(() => tagFacetsOptions(searchParams.value)))
  const productTypesQuery = useQuery(productTypesOptions())
  const productStoresQuery = useQuery(productStoresOptions())

  const groupIdFacetsQuery = useQuery(computed(() => groupIdFacetsOptions(searchParams.value)))

  const products = computed(() => searchQuery.data.value?.pages.flatMap((page) => page.products) ?? [])
  const visibleProductIds = computed(() => products.value.map((product) => product.productId))
  const rowSalesQuery = useQuery(computed(() => rowSalesAnalyticsOptions(visibleProductIds.value)))
  const total = computed(() => searchQuery.data.value?.pages[0]?.total ?? 0)
  const selectedSet = computed(() => new Set(selectedProductIds.value))
  const allVisibleSelected = computed(() => products.value.length > 0 && products.value.every((product) => selectedSet.value.has(product.productId)))

  const loadMore = async (done: () => void) => {
    try {
      if(searchQuery.hasNextPage.value && !searchQuery.isFetchingNextPage.value) {
        await searchQuery.fetchNextPage()
      }
    } finally {
      done()
    }
  }

  const toggleSelectAll = () => {
    if(allVisibleSelected.value) {workbench.clearSelection()} else {workbench.selectAll(products.value.map((product) => product.productId))}
  }

  return {
    // filter state (v-model targets)
    queryString, productTypeId, productKind, productStoreId, tags, groupIds, sort,
    clearFilters: () => workbench.clearFilters(),
    toggleTag: (tag: string) => workbench.toggleTag(tag),
    toggleGroupId: (groupId: string) => workbench.toggleGroupId(groupId),

    // results
    products, rowSales: computed(() => rowSalesQuery.data.value ?? {}), total,
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    error: searchQuery.error,
    hasNextPage: searchQuery.hasNextPage,
    loadMore,
    refetch: () => searchQuery.refetch(),

    // facets + reference data
    tagFacets: computed(() => tagFacetsQuery.data.value ?? []),
    groupIdFacets: computed(() => groupIdFacetsQuery.data.value ?? {}),
    productTypes: computed(() => productTypesQuery.data.value ?? []),
    productStores: computed(() => productStoresQuery.data.value ?? []),

    // selection
    selectedProductIds, selectedSet, allVisibleSelected, toggleSelectAll,
    toggleSelected: (productId: string) => workbench.toggleSelected(productId),
    clearSelection: () => workbench.clearSelection()
  }
}
