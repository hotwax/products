export type FetchStatus = "none" | "pending" | "success" | "error"

export interface ProductSearchParams {
  queryString?: string
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
  productStoreIds: string[]
  searchText: string
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
  createdDate: string
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

export type ProductRelationshipDirection = "outgoing" | "incoming"

export interface ProductRelationship {
  typeId: string
  relatedProductId: string
  relatedName: string
  relatedImageUrl: string
  relatedSku: string
  relatedTypeId: string
  direction: ProductRelationshipDirection
  quantity: string
  scrapFactor: string
  instruction: string
  reason: string
  sequenceNum: string
  fromDate: string
  thruDate: string
  active: boolean
  mirrored: boolean
}

export interface StoreCatalogExposure {
  productStoreId: string
  storeName: string
  prodCatalogId: string
  catalogName: string
  productCategoryId: string
  categoryName: string
  categoryTypeId: string
  categoryTypeDescription: string
  sequenceNum: string
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

export interface ProductSalesDay {
  date: string
  units: number
  orders: number
}

export interface ProductAnalytics {
  windowDays: number
  orderCount: number | null
  unitsSold: number | null
  cancelledUnits: number | null
  returnedUnits: number | null
  exceptionCount: number | null
  salesByDay: ProductSalesDay[]
}

export interface ProductHistory {
  id: string
  source: string
  status: string
  message: string
  timestamp: string
  productId: string
  parentTitle: string
  variantTitle: string
  internalName: string
  sku: string
  shopId: string
  shopifyId: string
  shopifyIdLabel: string
  systemMessageId: string
  details: ProductHistoryDetail[]
}

export interface ProductHistoryDetail {
  type: string
  label: string
  value: string
  items?: Array<{ label?: string, value: string }>
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
