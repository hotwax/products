import { defineStore } from "pinia"
import type { ProductKind, ProductSearchParams, ProductSortOption } from "@/domain/types/product"

/** Workbench UI state ONLY (filters + selection). Results live in the TanStack cache — the filter
 *  object this store produces is the search query key. Persisted so a reload keeps the working set. */
export const useWorkbenchStore = defineStore("workbench", {
  state: () => ({
    queryString: "",
    productTypeId: "FINISHED_GOOD",
    productKind: "All" as ProductKind,
    productStoreId: "All",
    tags: [] as string[],
    groupIds: [] as string[],
    sort: "Alphabet" as ProductSortOption,
    pageSize: 25,
    selectedProductIds: [] as string[]
  }),
  getters: {
    searchParams(state): ProductSearchParams {
      return {
        queryString: state.queryString.trim(),
        productTypeId: state.productTypeId,
        productKind: state.productKind,
        productStoreId: state.productStoreId,
        tags: [...state.tags],
        groupIds: [...state.groupIds],
        sort: state.sort,
        pageSize: state.pageSize
      }
    },
    selectionCount: (state) => state.selectedProductIds.length
  },
  actions: {
    toggleTag(tag: string) {
      this.tags = this.tags.includes(tag) ? this.tags.filter((existing) => existing !== tag) : [...this.tags, tag]
    },
    toggleGroupId(groupId: string) {
      this.groupIds = this.groupIds.includes(groupId)
        ? this.groupIds.filter((existing) => existing !== groupId)
        : [...this.groupIds, groupId]
    },
    clearFilters() {
      this.queryString = ""
      this.productTypeId = "FINISHED_GOOD"
      this.productKind = "All"
      this.productStoreId = "All"
      this.tags = []
      this.groupIds = []
      this.sort = "Alphabet"
      this.clearSelection()
    },
    toggleSelected(productId: string) {
      this.selectedProductIds = this.selectedProductIds.includes(productId)
        ? this.selectedProductIds.filter((id) => id !== productId)
        : [...this.selectedProductIds, productId]
    },
    selectAll(productIds: string[]) {
      this.selectedProductIds = [...new Set(productIds)]
    },
    clearSelection() {
      this.selectedProductIds = []
    }
  },
  persist: { pick: ["productTypeId", "productKind", "productStoreId", "sort"] }
})
