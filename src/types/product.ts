export type FetchStatus = "none" | "pending" | "success" | "error"

export interface ProductSearchParams {
  queryString?: string
  readiness?: string
  productTypeId?: string
  productKind?: "All" | "Variants" | "Virtuals"
  productStoreId?: string
  pageSize?: number
  pageIndex?: number
}

export interface ProductSummary {
  productId: string
  productName: string
  internalName: string
  productTypeId: string
  primarySku: string
  imageUrl: string
  brandName: string
  primaryProductCategoryId: string
  isVirtual: boolean
  isVariant: boolean
  readiness: ReadinessSummary
}

export interface ProductSearchResult {
  products: ProductSummary[]
  total: number
  pageIndex: number
  pageSize: number
}

export interface ProductDetail extends ProductSummary {
  description: string
  taxable: string
  dimensions: FieldValue[]
  identifiers: ProductIdentifier[]
  relationships: ProductRelationship[]
  storeCatalogs: StoreCatalogExposure[]
  features: ProductFeatureApplication[]
  shopifyMappings: ShopifyMapping[]
  analytics: ProductAnalytics
  histories: ProductHistory[]
  readinessChecklist: ReadinessItem[]
}

export interface FieldValue {
  label: string
  value: string
}

export interface ProductIdentifier {
  typeId: string
  typeDescription: string
  value: string
  fromDate: string
  thruDate: string
  active: boolean
}

export interface ProductRelationship {
  typeId: string
  relatedProductId: string
  relatedName: string
  quantity: string
  sequenceNum: string
  fromDate: string
  thruDate: string
  active: boolean
}

export interface StoreCatalogExposure {
  productStoreId: string
  storeName: string
  prodCatalogId: string
  productCategoryId: string
  categoryName: string
  fromDate: string
  thruDate: string
  status: string
}

export interface ProductFeatureApplication {
  featureTypeId: string
  featureTypeDescription: string
  productFeatureId: string
  description: string
  sequenceNum: string
  fromDate: string
  thruDate: string
}

export interface ShopifyMapping {
  shopId: string
  shopName: string
  productStoreId: string
  shopifyProductId: string
  shopifyVariantId: string
  handle: string
  status: string
  lastUpdated: string
}

export interface ProductAnalytics {
  windowDays: number
  orderCount: number | null
  unitsSold: number | null
  cancelledUnits: number | null
  returnedUnits: number | null
  exceptionCount: number | null
}

export interface ProductHistory {
  source: string
  status: string
  message: string
  timestamp: string
}

export interface ReadinessSummary {
  state: "ready" | "attention" | "blocked"
  missingCount: number
  labels: string[]
}

export interface ReadinessItem {
  label: string
  complete: boolean
  route: string
  detail: string
}
