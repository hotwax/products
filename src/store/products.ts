import { defineStore } from "pinia"

import {
  getAllProductFeatures,
  getBatchSalesAnalytics,
  getImportHistory,
  getProductAssocTypes,
  getProductDetail,
  getProductFeatureApplTypeCatalog,
  getProductFeatureFamily,
  getProductFeatureTypeCatalog,
  getProductSearchIndexMetadata,
  getProductTagFacets,
  getVariantCounts,
  refreshProductSearchIndex,
  searchProductFeatures,
  searchProducts
} from "@/services/product"
import type { ProductIndexMetadata } from "@/services/productIndex"
import type {
  FetchStatus,
  ProductDetail,
  ProductFeatureFamily,
  ProductFeatureRecord,
  ProductHistory,
  ProductRelationship,
  ProductSearchParams,
  ProductSortOption,
  ProductSummary,
  RowSalesSpark,
  TagFacet
} from "@/types/product"
import type { OmsProductAssocTypeRow } from "@/utils/productAssocTypes"

export const useProductsStore = defineStore("products", {
  state: () => ({
    searchQuery: "",
    productTypeFilter: "FINISHED_GOOD",
    productKindFilter: "All" as "All" | "Variants" | "Virtuals",
    productStoreIdFilter: "",
    sortFilter: "Alphabet" as ProductSortOption,
    tagFilter: [] as string[],
    tagFacets: [] as TagFacet[],
    rowSparks: {} as Record<string, RowSalesSpark>,
    variantCounts: {} as Record<string, number>,
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
    importsError: "",
    productIndexStatus: "none" as FetchStatus,
    productIndexError: "",
    productIndexMetadata: null as ProductIndexMetadata | null,
    assocTypeCatalog: [] as OmsProductAssocTypeRow[],
    assocTypeCatalogStatus: "none" as FetchStatus,
    assocTypeCatalogError: "",
    featureFamily: null as ProductFeatureFamily | null,
    featureFamilyStatus: "none" as FetchStatus,
    featureFamilyError: "",
    featureFamilyProductId: "",
    featureSearchResults: [] as ProductFeatureRecord[],
    featureSearchStatus: "none" as FetchStatus,
    featureSearchError: "",
    featureTypeCatalog: [] as Array<{ id: string, description: string }>,
    featureApplTypeCatalog: [] as Array<{ id: string, description: string }>,
    featureCatalog: [] as ProductFeatureRecord[]
  }),
  getters: {
    loading: (state) => state.searchStatus === "pending",
    detailLoading: (state) => state.detailStatus === "pending",
    importsLoading: (state) => state.importsStatus === "pending",
    productIndexLoading: (state) => state.productIndexStatus === "pending",
    hasMore: (state) => state.searchResults.length < state.searchTotal
  },
  actions: {
    async runSearch() {
      this.searchStatus = "pending"
      this.searchError = ""
      this.searchPageIndex = 0
      this.rowSparks = {}
      this.variantCounts = {}

      try {
        const result = await searchProducts(this.searchParams())
        this.searchResults = result.products
        this.searchTotal = result.total
        this.searchStatus = "success"
        this.loadTagFacets()
        this.decorateRows(result.products)
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
        this.decorateRows(result.products)
      } catch (error: any) {
        this.searchError = error?.message || "Product search failed"
        this.searchStatus = "error"
      }
    },
    async loadTagFacets() {
      this.tagFacets = await getProductTagFacets(this.searchParams())
    },
    async decorateRows(products: ProductSummary[]) {
      if(!products.length) {return}

      const [sparks, variantCounts] = await Promise.all([
        getBatchSalesAnalytics(products.map((product) => product.productId)),
        getVariantCounts(products.filter((product) => product.isVirtual).map((product) => product.productId))
      ])

      this.rowSparks = { ...this.rowSparks, ...Object.fromEntries(sparks) }
      this.variantCounts = { ...this.variantCounts, ...Object.fromEntries(variantCounts) }
    },
    toggleTag(tag: string) {
      this.tagFilter = this.tagFilter.includes(tag)
        ? this.tagFilter.filter((entry) => entry !== tag)
        : [...this.tagFilter, tag]
      this.runSearch()
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
    async loadProductIndexMetadata() {
      this.productIndexMetadata = await getProductSearchIndexMetadata()
    },
    async refreshProductIndex() {
      this.productIndexStatus = "pending"
      this.productIndexError = ""

      try {
        this.productIndexMetadata = await refreshProductSearchIndex()
        this.productIndexStatus = "success"
        await this.runSearch()
      } catch (error: any) {
        this.productIndexError = error?.response?.data?.errors?.[0]?.message || error?.message || "Product data refresh failed"
        this.productIndexStatus = "error"
      }
    },
    async loadAssocTypeCatalog(force = false) {
      if(!force && this.assocTypeCatalogStatus === "success") {return}
      if(this.assocTypeCatalogStatus === "pending") {return}

      this.assocTypeCatalogStatus = "pending"
      this.assocTypeCatalogError = ""

      try {
        this.assocTypeCatalog = await getProductAssocTypes()
        this.assocTypeCatalogStatus = "success"
      } catch (error: any) {
        this.assocTypeCatalog = []
        this.assocTypeCatalogError = error?.response?.data?.errors?.[0]?.message || error?.message || "Product assoc type lookup failed"
        this.assocTypeCatalogStatus = "error"
      }
    },
    async loadFeatureFamily(productId: string, force = false) {
      if(!force && this.featureFamilyProductId === productId && this.featureFamilyStatus === "success") {return}

      this.featureFamilyStatus = "pending"
      this.featureFamilyError = ""
      this.featureFamilyProductId = productId

      try {
        this.featureFamily = await getProductFeatureFamily(productId)
        this.featureFamilyStatus = "success"
      } catch (error: any) {
        this.featureFamily = null
        this.featureFamilyError = error?.response?.data?.errors?.[0]?.message || error?.message || "Product features failed"
        this.featureFamilyStatus = "error"
      }
    },
    async runFeatureSearch(term: string) {
      this.featureSearchStatus = "pending"
      this.featureSearchError = ""

      try {
        this.featureSearchResults = await searchProductFeatures(term)
        this.featureSearchStatus = "success"
      } catch (error: any) {
        this.featureSearchResults = []
        this.featureSearchError = error?.message || "Feature search failed"
        this.featureSearchStatus = "error"
      }
    },
    clearFeatureSearch() {
      this.featureSearchResults = []
      this.featureSearchStatus = "none"
      this.featureSearchError = ""
    },
    async loadFeatureCatalogs() {
      if(!this.featureTypeCatalog.length) {
        this.featureTypeCatalog = await getProductFeatureTypeCatalog().catch(() => [])
      }
      if(!this.featureApplTypeCatalog.length) {
        this.featureApplTypeCatalog = await getProductFeatureApplTypeCatalog().catch(() => [])
      }
      if(!this.featureCatalog.length) {
        this.featureCatalog = await getAllProductFeatures().catch(() => [])
      }
    },
    addFeatureApplication(payload: {
      productId: string
      record: ProductFeatureRecord
      productFeatureApplTypeId: string
      applTypeDescription: string
    }) {
      if(!this.featureFamily) {return}

      const today = new Date().toLocaleDateString()
      const newAppl = {
        productId: payload.productId,
        productFeatureId: payload.record.productFeatureId,
        productFeatureApplTypeId: payload.productFeatureApplTypeId,
        applTypeDescription: payload.applTypeDescription,
        featureTypeId: payload.record.productFeatureTypeId,
        featureTypeDescription: payload.record.featureTypeDescription,
        featureDescription: payload.record.description,
        description: payload.record.description || payload.record.productFeatureId,
        abbrev: payload.record.abbrev,
        idCode: payload.record.idCode,
        sequenceNum: "",
        fromDate: today,
        thruDate: "",
        active: true
      }
      const family = this.featureFamily

      if(payload.productFeatureApplTypeId === "STANDARD_FEATURE") {
        const variant = family.variants.find((entry) => entry.productId === payload.productId)
        if(variant) {
          variant.features = [...variant.features, newAppl]
        }
      } else if(payload.productId === family.virtualProductId) {
        family.selectableFeatures = [...family.selectableFeatures, newAppl]
      } else {
        const variant = family.variants.find((entry) => entry.productId === payload.productId)
        if(variant) {
          variant.features = [...variant.features, newAppl]
        }
      }

      const knownType = family.featureTypes.find((entry) => entry.featureTypeId === payload.record.productFeatureTypeId)
      if(knownType) {
        knownType.featureCount += 1
      } else if(payload.record.productFeatureTypeId) {
        family.featureTypes = [
          ...family.featureTypes,
          {
            featureTypeId: payload.record.productFeatureTypeId,
            featureTypeDescription: payload.record.featureTypeDescription || payload.record.productFeatureTypeId,
            featureCount: 1
          }
        ].sort((a, b) => a.featureTypeDescription.localeCompare(b.featureTypeDescription))
      }
    },
    removeFeatureApplication(payload: { productId: string, productFeatureId: string, productFeatureApplTypeId: string }) {
      if(!this.featureFamily) {return}
      const family = this.featureFamily

      if(payload.productFeatureApplTypeId === "STANDARD_FEATURE" || payload.productId !== family.virtualProductId) {
        const variant = family.variants.find((entry) => entry.productId === payload.productId)
        if(variant) {
          variant.features = variant.features.filter((appl) => appl.productFeatureId !== payload.productFeatureId || appl.productFeatureApplTypeId !== payload.productFeatureApplTypeId)
        }
      } else {
        family.selectableFeatures = family.selectableFeatures.filter((appl) => appl.productFeatureId !== payload.productFeatureId)
      }
    },
    addRelationship(payload: {
      typeId: string
      related: ProductSummary
      direction?: "outgoing" | "incoming"
      quantity?: string
      scrapFactor?: string
      instruction?: string
      reason?: string
    }) {
      if(!this.detail) {return}

      const existing = this.detail.relationships.filter((relationship) => relationship.typeId === payload.typeId)
      const nextSequence = existing.reduce((max, entry) => {
        const value = Number(entry.sequenceNum) || 0

        return value > max ? value : max
      }, 0) + 10
      const today = new Date().toLocaleDateString()
      const relationship: ProductRelationship = {
        typeId: payload.typeId,
        relatedProductId: payload.related.productId,
        relatedName: payload.related.productName || payload.related.internalName || payload.related.productId,
        relatedImageUrl: payload.related.imageUrl,
        relatedSku: payload.related.primarySku || payload.related.productId,
        relatedTypeId: payload.related.productTypeId,
        direction: payload.direction || "outgoing",
        quantity: payload.quantity ?? "",
        scrapFactor: payload.scrapFactor ?? "",
        instruction: payload.instruction || "",
        reason: payload.reason || "",
        sequenceNum: String(nextSequence),
        fromDate: today,
        thruDate: "",
        active: true
      }

      this.detail.relationships = [...this.detail.relationships, relationship]
    },
    expireRelationship(payload: { typeId: string, relatedProductId: string, sequenceNum: string }) {
      if(!this.detail) {return}

      const today = new Date().toLocaleDateString()
      this.detail.relationships = this.detail.relationships.map((relationship) => {
        if(
          relationship.typeId === payload.typeId &&
          relationship.relatedProductId === payload.relatedProductId &&
          relationship.sequenceNum === payload.sequenceNum
        ) {
          return { ...relationship, thruDate: today, active: false }
        }

        return relationship
      })
    },
    reactivateRelationship(payload: { typeId: string, relatedProductId: string, sequenceNum: string }) {
      if(!this.detail) {return}

      this.detail.relationships = this.detail.relationships.map((relationship) => {
        if(
          relationship.typeId === payload.typeId &&
          relationship.relatedProductId === payload.relatedProductId &&
          relationship.sequenceNum === payload.sequenceNum
        ) {
          return { ...relationship, thruDate: "", active: true }
        }

        return relationship
      })
    },
    reorderRelationships(typeId: string, orderedRelatedProductIds: string[]) {
      if(!this.detail) {return}

      const orderMap = new Map(orderedRelatedProductIds.map((id, index) => [id, String((index + 1) * 10)]))
      this.detail.relationships = this.detail.relationships.map((relationship) => {
        if(relationship.typeId !== typeId) {return relationship}
        const sequenceNum = orderMap.get(relationship.relatedProductId)

        return sequenceNum ? { ...relationship, sequenceNum } : relationship
      })
    },
    updateRelationshipFields(
      payload: { typeId: string, relatedProductId: string, sequenceNum: string },
      changes: Partial<Pick<ProductRelationship, "quantity" | "scrapFactor" | "instruction" | "reason">>
    ) {
      if(!this.detail) {return}

      this.detail.relationships = this.detail.relationships.map((relationship) => {
        if(
          relationship.typeId === payload.typeId &&
          relationship.relatedProductId === payload.relatedProductId &&
          relationship.sequenceNum === payload.sequenceNum
        ) {
          return { ...relationship, ...changes }
        }

        return relationship
      })
    },
    searchParams(): ProductSearchParams {
      return {
        queryString: this.searchQuery,
        productTypeId: this.productTypeFilter,
        productKind: this.productKindFilter,
        productStoreId: this.productStoreIdFilter,
        tags: this.tagFilter,
        sort: this.sortFilter,
        pageSize: this.pageSize,
        pageIndex: this.searchPageIndex
      }
    }
  }
})
