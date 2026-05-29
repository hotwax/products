import { defineStore } from "pinia"

import {
  getImportHistory,
  getProductDetail,
  searchProducts
} from "@/services/product"
import type {
  FetchStatus,
  ProductDetail,
  ProductHistory,
  ProductSearchParams,
  ProductSummary
} from "@/types/product"

export const useProductsStore = defineStore("products", {
  state: () => ({
    searchQuery: "",
    readinessFilter: "All",
    productTypeFilter: "FINISHED_GOOD",
    productKindFilter: "All" as "All" | "Variants" | "Virtuals",
    productStoreIdFilter: "",
    searchResults: [] as ProductSummary[],
    searchTotal: 0,
    searchPageIndex: 0,
    pageSize: 25,
    searchStatus: "none" as FetchStatus,
    searchError: "",
    detail: null as ProductDetail | null,
    detailStatus: "none" as FetchStatus,
    detailError: "",
    imports: [] as ProductHistory[],
    importsStatus: "none" as FetchStatus,
    importsError: ""
  }),
  getters: {
    loading: (state) => state.searchStatus === "pending",
    detailLoading: (state) => state.detailStatus === "pending",
    importsLoading: (state) => state.importsStatus === "pending",
    hasMore: (state) => state.searchResults.length < state.searchTotal
  },
  actions: {
    async runSearch() {
      this.searchStatus = "pending"
      this.searchError = ""
      this.searchPageIndex = 0

      try {
        const result = await searchProducts(this.searchParams())
        this.searchResults = result.products
        this.searchTotal = result.total
        this.searchStatus = "success"
      } catch (error: any) {
        this.searchResults = []
        this.searchTotal = 0
        this.searchError = error?.response?.data?.errors?.[0]?.message || error?.message || "Product search failed"
        this.searchStatus = "error"
      }
    },
    async appendNextPage() {
      if(!this.hasMore || this.loading) {return}

      this.searchStatus = "pending"
      this.searchPageIndex += 1

      try {
        const result = await searchProducts(this.searchParams())
        this.searchResults.push(...result.products)
        this.searchTotal = result.total
        this.searchStatus = "success"
      } catch (error: any) {
        this.searchError = error?.message || "Product search failed"
        this.searchStatus = "error"
      }
    },
    async fetchDetail(productId: string) {
      this.detailStatus = "pending"
      this.detailError = ""
      this.detail = null

      try {
        this.detail = await getProductDetail(productId)
        this.detailStatus = "success"
      } catch (error: any) {
        this.detailError = error?.response?.data?.errors?.[0]?.message || error?.message || "Product detail failed"
        this.detailStatus = "error"
      }
    },
    async fetchImports() {
      this.importsStatus = "pending"
      this.importsError = ""

      try {
        this.imports = await getImportHistory()
        this.importsStatus = "success"
      } catch (error: any) {
        this.imports = []
        this.importsError = error?.message || "Product import history failed"
        this.importsStatus = "error"
      }
    },
    searchParams(): ProductSearchParams {
      return {
        queryString: this.searchQuery,
        readiness: this.readinessFilter,
        productTypeId: this.productTypeFilter,
        productKind: this.productKindFilter,
        productStoreId: this.productStoreIdFilter,
        pageSize: this.pageSize,
        pageIndex: this.searchPageIndex
      }
    }
  }
})
