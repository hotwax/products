import { api } from "@common"

import type {
  FieldValue,
  ProductAnalytics,
  ProductDetail,
  ProductHistory,
  ProductIdentifier,
  ProductSearchParams,
  ProductSearchResult,
  ProductSummary,
  ReadinessItem,
  ReadinessSummary,
  ShopifyMapping
} from "@/types/product"

export async function searchProducts(params: ProductSearchParams = {}): Promise<ProductSearchResult> {
  const pageSize = Number(params.pageSize ?? 25)
  const pageIndex = Number(params.pageIndex ?? 0)
  const queryString = params.queryString?.trim() ?? ""

  const dataDocumentResult = await searchProductsWithDataDocument(queryString, pageSize, pageIndex, params.productTypeId, params.productKind, params.productStoreId)
  if(dataDocumentResult.products.length || !queryString) {return dataDocumentResult}

  return searchProductsDirect(queryString, pageSize, pageIndex, params.productTypeId, params.productKind, params.productStoreId)
}

export async function getProductDetail(productId: string): Promise<ProductDetail> {
  const [product, variants, histories, identifiers, categories] = await Promise.allSettled([
    getProduct(productId),
    getProductVariants(productId),
    getProductHistories(productId),
    getProductIdentifiers(productId),
    getProductCategories(productId)
  ])

  const summary = normalizeProductSummary(product.status === "fulfilled" ? product.value : { productId })
  const relationships = productListFromSettled(variants).map((variant) => ({
    typeId: "PRODUCT_VARIANT",
    relatedProductId: textValue(variant.productId || variant.productIdTo || variant.variantProductId),
    relatedName: textValue(variant.productName || variant.internalName),
    quantity: textValue(variant.quantity || "1"),
    sequenceNum: textValue(variant.sequenceNum),
    fromDate: formatDate(variant.fromDate),
    thruDate: formatDate(variant.thruDate),
    active: isActive(variant.fromDate, variant.thruDate)
  })).filter((relationship) => relationship.relatedProductId && relationship.relatedProductId !== productId)

  const normalizedIdentifiers = normalizeIdentifiers(productListFromSettled(identifiers))
  const detail: ProductDetail = {
    ...summary,
    description: textValue(productValue(product, "description")),
    taxable: textValue(productValue(product, "taxable")),
    dimensions: normalizeDimensions(product.status === "fulfilled" ? product.value : {}),
    identifiers: normalizedIdentifiers,
    relationships,
    storeCatalogs: normalizeCategoryMemberships(productListFromSettled(categories)),
    features: [],
    shopifyMappings: normalizeShopifyHistory(productListFromSettled(histories)),
    analytics: emptyAnalytics(),
    histories: normalizeHistories(productListFromSettled(histories)),
    readinessChecklist: []
  }

  detail.readinessChecklist = buildReadinessChecklist(detail)
  detail.readiness = buildReadinessSummary(detail)

  return detail
}

export async function getImportHistory(): Promise<ProductHistory[]> {
  const response = await api({
    url: "oms/products/productUpdateHistories",
    method: "get",
    params: {
      pageSize: 50,
      orderByField: "-lastUpdatedStamp"
    }
  })

  return responseList(response.data).map((doc) => ({
    source: "ProductUpdateHistory",
    status: textValue(doc.statusId || doc.status || "Recorded"),
    message: [
      textValue(doc.productId),
      textValue(doc.shopId),
      textValue(doc.systemMessageId)
    ].filter(Boolean).join(" · "),
    timestamp: formatDate(doc.lastUpdatedStamp || doc.createdStamp)
  }))
}

export function buildReadinessSummary(product: Partial<ProductDetail | ProductSummary>): ReadinessSummary {
  const checklist = "readinessChecklist" in product && product.readinessChecklist?.length
    ? product.readinessChecklist
    : buildSummaryReadinessChecklist(product)
  const missing = checklist.filter((item) => !item.complete)
  const labels = missing.slice(0, 3).map((item) => item.label)

  return {
    state: missing.length >= 3 ? "blocked" : missing.length ? "attention" : "ready",
    missingCount: missing.length,
    labels
  }
}

async function searchProductsWithDataDocument(
  queryString: string,
  pageSize: number,
  pageIndex: number,
  productTypeId = "FINISHED_GOOD",
  productKind: "All" | "Variants" | "Virtuals" = "All",
  productStoreId = ""
): Promise<ProductSearchResult> {
  const basePayload: Record<string, unknown> = {
    dataDocumentId: "OmsProduct",
    format: "json",
    pageSize,
    pageIndex
  }

  const searchMaps = buildProductSearchParameters(queryString)

  for(const customParametersMap of searchMaps) {
    const payload = { ...basePayload } as Record<string, unknown>
    applyProductFilters(customParametersMap, productTypeId, productKind, productStoreId)
    if(Object.keys(customParametersMap).length) {payload.customParametersMap = customParametersMap}

    const response = await api({
      url: "oms/dataDocumentView",
      method: "post",
      data: payload
    })
    const docs = responseList(response.data)
    const products = dedupeProducts(docs.map(normalizeProductSummary))
      .filter((product) => product.productId || product.productName || product.internalName)

    if(products.length || !queryString) {
      return {
        products,
        total: numberValue(response.data?.viewSize || response.data?.count || products.length),
        pageIndex,
        pageSize
      }
    }
  }

  return {
    products: [],
    total: 0,
    pageIndex,
    pageSize
  }
}

async function searchProductsDirect(
  queryString: string,
  pageSize: number,
  pageIndex: number,
  productTypeId = "FINISHED_GOOD",
  productKind: "All" | "Variants" | "Virtuals" = "All",
  productStoreId = ""
): Promise<ProductSearchResult> {
  const params: Record<string, string | number> = {
    pageSize,
    pageIndex
  }

  if(queryString) {params.productId = queryString}
  applyProductFilters(params, productTypeId, productKind, productStoreId)

  const response = await api({
    url: "oms/products",
    method: "get",
    params
  })
  const docs = responseList(response.data)
  const products = docs.map(normalizeProductSummary)

  return {
    products,
    total: products.length,
    pageIndex,
    pageSize
  }
}

async function getProduct(productId: string): Promise<Record<string, unknown>> {
  const response = await api({
    url: `oms/products/${encodeURIComponent(productId)}`,
    method: "get"
  })

  return normalizeRecord(response.data)
}

async function getProductVariants(productId: string): Promise<Record<string, unknown>[]> {
  const response = await api({
    url: `oms/products/${encodeURIComponent(productId)}/variants`,
    method: "get"
  })

  return responseList(response.data)
}

async function getProductHistories(productId: string): Promise<Record<string, unknown>[]> {
  const response = await api({
    url: "oms/products/productUpdateHistories",
    method: "get",
    params: {
      pageSize: 25,
      productId
    }
  })

  return responseList(response.data)
}

async function getProductIdentifiers(productId: string): Promise<Record<string, unknown>[]> {
  const response = await api({
    url: "oms/dataDocumentView",
    method: "post",
    data: {
      dataDocumentId: "OmsProduct",
      format: "json",
      pageSize: 100,
      pageIndex: 0,
      customParametersMap: {
        productId
      }
    }
  })

  return responseList(response.data)
}

async function getProductCategories(productId: string): Promise<Record<string, unknown>[]> {
  const response = await api({
    url: "admin/productCategories/member",
    method: "get",
    params: {
      productId,
      pageSize: 100
    }
  })

  return responseList(response.data)
}

function buildProductSearchParameters(queryString: string): Record<string, string>[] {
  if(!queryString) {return [{}]}

  return [
    { productId: queryString },
    { idValue: queryString },
    { internalName: queryString },
    { productName: queryString }
  ]
}

function applyProductFilters(customParametersMap: Record<string, string | number>, productTypeId: string, productKind: "All" | "Variants" | "Virtuals", productStoreId: string) {
  if(productTypeId && productTypeId !== "All") {
    customParametersMap.productTypeId = productTypeId
  }

  if(productStoreId && productStoreId !== "All") {
    customParametersMap.productStoreId = productStoreId
  }

  if(productKind === "Variants") {
    customParametersMap.isVariant = "Y"
  }

  if(productKind === "Virtuals") {
    customParametersMap.isVirtual = "Y"
  }
}

export function normalizeProductSummary(raw: Record<string, unknown>): ProductSummary {
  const product: ProductSummary = {
    productId: textValue(value(raw, "productId")),
    productName: textValue(value(raw, "productName")),
    internalName: textValue(value(raw, "internalName")),
    productTypeId: textValue(value(raw, "productTypeId")),
    primarySku: textValue(value(raw, "sku") || value(raw, "primarySku") || value(raw, "productId")),
    imageUrl: normalizeProductImageUrl(raw),
    brandName: textValue(value(raw, "brandName")),
    primaryProductCategoryId: textValue(value(raw, "primaryProductCategoryId") || value(raw, "productCategoryId")),
    isVirtual: flagValue(value(raw, "isVirtual")),
    isVariant: flagValue(value(raw, "isVariant")),
    readiness: {
      state: "attention",
      missingCount: 0,
      labels: []
    }
  }

  product.readiness = buildReadinessSummary(product)

  return product
}

function normalizeProductImageUrl(raw: Record<string, unknown>): string {
  return textValue(value(raw, "mainImageUrl") ||
    value(raw, "imageUrl") ||
    value(raw, "productImageUrl") ||
    value(raw, "smallImageUrl") ||
    value(raw, "mediumImageUrl") ||
    value(raw, "largeImageUrl") ||
    value(raw, "detailImageUrl") ||
    value(raw, "originalImageUrl"))
}

function normalizeDimensions(raw: Record<string, unknown>): FieldValue[] {
  return [
    { label: "Product weight", value: textValue(value(raw, "productWeight")) },
    { label: "Shipping weight", value: textValue(value(raw, "shippingWeight")) },
    { label: "Height", value: textValue(value(raw, "height")) },
    { label: "Width", value: textValue(value(raw, "width")) },
    { label: "Depth", value: textValue(value(raw, "depth")) }
  ]
}

function normalizeIdentifiers(docs: Record<string, unknown>[]): ProductIdentifier[] {
  return docs.map((doc) => ({
    typeId: textValue(value(doc, "goodIdentificationTypeId")),
    typeDescription: textValue(value(doc, "description") || value(doc, "goodIdentificationTypeId")),
    value: textValue(value(doc, "idValue") || value(doc, "idValueText") || value(doc, "value")),
    fromDate: formatDate(value(doc, "fromDate")),
    thruDate: formatDate(value(doc, "thruDate")),
    active: isActive(value(doc, "fromDate"), value(doc, "thruDate"))
  })).filter((identifier) => identifier.typeId || identifier.value)
}

function normalizeShopifyHistory(docs: Record<string, unknown>[]): ShopifyMapping[] {
  return docs.map((doc) => ({
    shopId: textValue(value(doc, "shopId")),
    shopName: textValue(value(doc, "shopName") || value(doc, "shopId")),
    productStoreId: textValue(value(doc, "productStoreId")),
    shopifyProductId: textValue(value(doc, "shopifyProductId") || value(doc, "remoteId")),
    shopifyVariantId: textValue(value(doc, "shopifyVariantId")),
    handle: textValue(value(doc, "handle")),
    status: textValue(value(doc, "statusId") || "History"),
    lastUpdated: formatDate(value(doc, "lastUpdatedStamp") || value(doc, "createdStamp"))
  })).filter((mapping) => mapping.shopId || mapping.shopifyProductId || mapping.shopifyVariantId)
}

function normalizeCategoryMemberships(docs: Record<string, unknown>[]) {
  return docs.map((doc) => ({
    productStoreId: textValue(value(doc, "productStoreId")),
    storeName: textValue(value(doc, "storeName")),
    prodCatalogId: textValue(value(doc, "prodCatalogId")),
    productCategoryId: textValue(value(doc, "productCategoryId")),
    categoryName: textValue(value(doc, "categoryName") || value(doc, "description")),
    fromDate: formatDate(value(doc, "fromDate")),
    thruDate: formatDate(value(doc, "thruDate")),
    status: isActive(value(doc, "fromDate"), value(doc, "thruDate")) ? "Active" : "Expired"
  })).filter((exposure) => exposure.productCategoryId || exposure.prodCatalogId || exposure.productStoreId)
}

function normalizeHistories(docs: Record<string, unknown>[]): ProductHistory[] {
  return docs.map((doc) => ({
    source: "ProductUpdateHistory",
    status: textValue(value(doc, "statusId") || "Recorded"),
    message: [
      textValue(value(doc, "shopId")),
      textValue(value(doc, "systemMessageId")),
      summarizeDifferenceMap(value(doc, "differenceMap"))
    ].filter(Boolean).join(" · "),
    timestamp: formatDate(value(doc, "lastUpdatedStamp") || value(doc, "createdStamp"))
  }))
}

function emptyAnalytics(): ProductAnalytics {
  return {
    windowDays: 30,
    orderCount: null,
    unitsSold: null,
    cancelledUnits: null,
    returnedUnits: null,
    exceptionCount: null
  }
}

function buildReadinessChecklist(product: ProductDetail): ReadinessItem[] {
  return [
    {
      label: "Identity",
      complete: Boolean(product.productId && (product.primarySku || product.identifiers.length)),
      route: `/products/${product.productId}/identifiers`,
      detail: "SKU or active identifier"
    },
    {
      label: "Sellability",
      complete: Boolean(product.productTypeId && product.primaryProductCategoryId),
      route: `/products/${product.productId}/stores`,
      detail: "Product type and primary category"
    },
    {
      label: "Fulfillment",
      complete: product.dimensions.some((field) => field.label === "Shipping weight" && Boolean(field.value)),
      route: `/products/${product.productId}/logistics`,
      detail: "Shipping weight"
    },
    {
      label: "Shopify",
      complete: product.shopifyMappings.length > 0,
      route: `/products/${product.productId}/shopify`,
      detail: "Shopify product or variant mapping"
    },
    {
      label: "Finance",
      complete: Boolean(product.taxable || product.brandName),
      route: `/products/${product.productId}/financials`,
      detail: "Taxable flag, brand, tax, GL, or legal entity data"
    }
  ]
}

function buildSummaryReadinessChecklist(product: Partial<ProductDetail | ProductSummary>): ReadinessItem[] {
  return [
    {
      label: "Identity",
      complete: Boolean(product.productId || product.primarySku),
      route: product.productId ? `/products/${product.productId}/identifiers` : "/products",
      detail: "Product ID or SKU"
    },
    {
      label: "Sellability",
      complete: Boolean(product.productTypeId && product.primaryProductCategoryId),
      route: product.productId ? `/products/${product.productId}/stores` : "/products",
      detail: "Product type and category"
    },
    {
      label: "Finance",
      complete: Boolean(product.brandName),
      route: product.productId ? `/products/${product.productId}/financials` : "/products",
      detail: "Brand, legal entity, tax, or GL metadata"
    }
  ]
}

function responseList(data: any): Record<string, unknown>[] {
  if(Array.isArray(data)) {return data.map(normalizeRecord)}
  if(Array.isArray(data?.entityValueList)) {return data.entityValueList.map(normalizeRecord)}
  if(Array.isArray(data?.docs)) {return data.docs.map(normalizeRecord)}
  if(Array.isArray(data?.data)) {return data.data.map(normalizeRecord)}
  if(Array.isArray(data?.dataDocuments)) {return data.dataDocuments.map(normalizeRecord)}

  return []
}

function dedupeProducts(products: ProductSummary[]): ProductSummary[] {
  const seen = new Set<string>()

  return products.filter((product) => {
    const key = product.productId || `${product.productName}-${product.internalName}`
    if(seen.has(key)) {return false}
    seen.add(key)

    return true
  })
}

function productListFromSettled(settled: PromiseSettledResult<Record<string, unknown>[]>): Record<string, unknown>[] {
  return settled.status === "fulfilled" ? settled.value : []
}

function productValue(settled: PromiseSettledResult<Record<string, unknown>>, key: string): unknown {
  return settled.status === "fulfilled" ? value(settled.value, key) : ""
}

function normalizeRecord(raw: any): Record<string, unknown> {
  if(!raw || typeof raw !== "object") {return {}}

  return raw
}

function value(raw: Record<string, unknown>, key: string): unknown {
  return raw[key] ?? raw[key.toLowerCase()]
}

function textValue(raw: unknown): string {
  if(raw === null || raw === undefined) {return ""}
  if(typeof raw === "string") {return raw}
  if(typeof raw === "number" || typeof raw === "boolean") {return String(raw)}
  if(typeof raw === "object") {
    const record = raw as Record<string, unknown>

    return textValue(record.description || record.id || record.value)
  }

  return ""
}

function numberValue(raw: unknown): number {
  if(typeof raw === "number") {return raw}
  if(typeof raw === "string" && raw.trim()) {return Number(raw)}

  return 0
}

function flagValue(raw: unknown): boolean {
  return raw === true || raw === "Y" || raw === "true"
}

function isActive(_fromDate: unknown, thruDate: unknown): boolean {
  if(!thruDate) {return true}
  const timestamp = typeof thruDate === "number" ? thruDate : Date.parse(textValue(thruDate))

  return Number.isNaN(timestamp) || timestamp > Date.now()
}

function formatDate(raw: unknown): string {
  if(!raw) {return ""}
  if(typeof raw === "number") {return new Date(raw).toLocaleString()}
  const asNumber = Number(raw)
  if(!Number.isNaN(asNumber) && asNumber > 10000000000) {return new Date(asNumber).toLocaleString()}

  return textValue(raw)
}

function summarizeDifferenceMap(raw: unknown): string {
  if(!raw) {return ""}
  if(typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>

      return Object.keys(parsed).slice(0, 3).join(", ")
    } catch {
      return raw.slice(0, 80)
    }
  }
  if(typeof raw === "object") {return Object.keys(raw as Record<string, unknown>).slice(0, 3).join(", ")}

  return ""
}
