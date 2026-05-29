import { api, useSolrSearch } from "@common"

import {
  getProductIndexMetadata,
  replaceIndexedProducts
} from "@/services/productIndex"
import type {
  FieldValue,
  ProductAnalytics,
  ProductDetail,
  ProductHistory,
  ProductHistoryDetail,
  ProductIdentifier,
  ProductRelationship,
  ProductSalesDay,
  ProductSearchParams,
  ProductSearchResult,
  ProductSummary,
  ReadinessItem,
  ReadinessSummary,
  ShopifyMapping,
  StoreCatalogExposure
} from "@/types/product"
import type { OmsProductAssocTypeRow } from "@/utils/productAssocTypes"

export async function searchProducts(params: ProductSearchParams = {}): Promise<ProductSearchResult> {
  const pageSize = Number(params.pageSize ?? 25)
  const pageIndex = Number(params.pageIndex ?? 0)
  const { searchProducts: searchSolrProducts } = useSolrSearch()
  const response = await searchSolrProducts({
    keyword: params.queryString,
    viewSize: pageSize,
    viewIndex: pageIndex,
    filters: productSolrFilters(params)
  })
  const products = Array.isArray(response?.products)
    ? response.products.map(normalizeProductSummary)
    : []

  return {
    products,
    total: numberValue(response?.total ?? products.length),
    pageIndex,
    pageSize
  }
}

export async function refreshProductSearchIndex() {
  const products = await fetchAllProductSearchDocuments()

  return replaceIndexedProducts(products)
}

export function getProductSearchIndexMetadata() {
  return getProductIndexMetadata()
}

export async function getProductCatalogOptions(productId: string): Promise<StoreCatalogExposure[]> {
  const mappings = await getProductCatalogMappingDocuments(productId, "", true)

  return normalizeCategoryMemberships(mappings)
}

export async function getProductDetail(productId: string): Promise<ProductDetail> {
  const [product, associations, histories, identifiers, categories, analytics] = await Promise.allSettled([
    getProduct(productId),
    getProductAssociations(productId),
    getProductHistories(productId),
    getProductIdentifiers(productId),
    getProductCategories(productId),
    getProductSalesAnalytics(productId)
  ])

  const summary = normalizeProductSummary(product.status === "fulfilled" ? product.value : { productId })
  const relationships = normalizeProductAssociations(productListFromSettled(associations), productId)

  const normalizedIdentifiers = normalizeIdentifiers(productListFromSettled(identifiers))
  const categoryDocuments = productListFromSettled(categories)
  const storeCatalogs = categoryDocuments.length || !summary.primaryProductCategoryId
    ? normalizeCategoryMemberships(categoryDocuments)
    : normalizeCategoryMemberships(await getProductCatalogMappingDocuments(productId, summary.primaryProductCategoryId).catch(() => []))
  const detail: ProductDetail = {
    ...summary,
    description: textValue(productValue(product, "description")),
    taxable: textValue(productValue(product, "taxable")),
    createdDate: formatDate(productValue(product, "createdDate") ||
      productValue(product, "createdStamp") ||
      productValue(product, "fromDate") ||
      productValue(product, "introductionDate") ||
      productValue(product, "salesIntroductionDate")),
    dimensions: normalizeDimensions(product.status === "fulfilled" ? product.value : {}),
    identifiers: normalizedIdentifiers,
    relationships,
    storeCatalogs,
    features: [],
    shopifyMappings: normalizeShopifyHistory(productListFromSettled(histories)),
    analytics: analytics.status === "fulfilled" ? analytics.value : emptyAnalytics(),
    histories: normalizeHistories(productListFromSettled(histories)),
    readinessChecklist: []
  }

  detail.readinessChecklist = buildReadinessChecklist(detail)
  detail.readiness = buildReadinessSummary(detail)

  return detail
}

export async function getProductAssocTypes(): Promise<OmsProductAssocTypeRow[]> {
  const response = await api({
    url: "oms/dataDocumentView",
    method: "post",
    data: {
      dataDocumentId: "OmsProductAssocType",
      format: "json",
      pageSize: 200,
      pageIndex: 0
    }
  })

  return responseList(response.data).map((row) => ({
    productAssocTypeId: textValue(value(row, "productAssocTypeId")),
    parentTypeId: textValue(value(row, "parentTypeId")),
    description: textValue(value(row, "description")),
    parentDescription: textValue(value(row, "parentDescription"))
  })).filter((row) => row.productAssocTypeId)
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

  return responseList(response.data).map(normalizeProductHistory)
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

export async function fetchAllProductSearchDocuments(pageSize = 500): Promise<ProductSummary[]> {
  const products: ProductSummary[] = []
  let pageIndex = 0
  let total: number | null = null

  while(total === null || products.length < total) {
    const response = await api({
      url: "oms/dataDocumentView",
      method: "post",
      data: {
        dataDocumentId: "OmsProduct",
        format: "json",
        pageSize,
        pageIndex
      }
    })
    const docs = responseList(response.data)
    const pageProducts = docs.map(normalizeProductSummary)
      .filter((product) => product.productId || product.productName || product.internalName)

    products.push(...pageProducts)
    total = numberValue(response.data?.viewSize || response.data?.count || response.data?.total || products.length)

    if(!pageProducts.length) {
      break
    }

    pageIndex += 1
  }

  return dedupeProducts(products)
}

async function getProduct(productId: string): Promise<Record<string, unknown>> {
  const response = await api({
    url: `oms/products/${encodeURIComponent(productId)}`,
    method: "get"
  })

  return normalizeRecord(response.data)
}

async function getProductAssociations(productId: string): Promise<Record<string, unknown>[]> {
  const [outgoing, incoming] = await Promise.all([
    fetchDataDocument("ProductsProductAssociations", {
      customParametersMap: {
        productId
      },
      pageSize: 500,
      orderByField: "productAssocTypeId,sequenceNum,fromDate"
    }),
    fetchDataDocument("ProductsProductAssociations", {
      customParametersMap: {
        productIdTo: productId
      },
      pageSize: 500,
      orderByField: "productAssocTypeId,sequenceNum,fromDate"
    })
  ])

  return [
    ...outgoing.map((row) => ({ ...row, relationshipDirection: "outgoing" })),
    ...incoming.map((row) => ({ ...row, relationshipDirection: "incoming" }))
  ]
}

async function getProductHistories(productId: string): Promise<Record<string, unknown>[]> {
  const response = await api({
    url: "admin/entityAuditLogs",
    method: "get",
    params: {
      pageSize: 25,
      pageIndex: 0,
      changedEntityName: "org.apache.ofbiz.product.product.Product",
      pkPrimaryValue: productId,
      orderByField: "-changedDate"
    }
  })

  return responseList(response.data)
}

async function getProductIdentifiers(productId: string): Promise<Record<string, unknown>[]> {
  const goodIdentifications = await getProductGoodIdentifications(productId).catch(() => [])
  if(goodIdentifications.length) {return goodIdentifications}

  return getProductIdentifierDocuments(productId)
}

async function getProductGoodIdentifications(productId: string): Promise<Record<string, unknown>[]> {
  const adminResponse = await api({
    url: "admin/goodIdentifications",
    method: "get",
    params: {
      productId,
      pageSize: 100
    }
  }).catch(() => null)
  const adminIdentifications = responseList(adminResponse?.data)
  if(adminIdentifications.length) {return adminIdentifications}

  const response = await api({
    url: "performFind",
    method: "get",
    params: {
      inputFields: {
        productId
      },
      fieldList: ["productId", "goodIdentificationTypeId", "idValue", "fromDate", "thruDate"],
      viewSize: 100,
      entityName: "GoodIdentification",
      noConditionFind: "Y"
    }
  })

  return responseList(response.data)
}

async function getProductIdentifierDocuments(productId: string): Promise<Record<string, unknown>[]> {
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
  const catalogMappings = await getProductCatalogMappingDocuments(productId).catch(() => [])
  if(catalogMappings.length) {return catalogMappings}

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

async function getProductCatalogMappingDocuments(productId: string, primaryProductCategoryId = "", includeAllCategories = false): Promise<Record<string, unknown>[]> {
  const memberships = await fetchDataDocument("ProductsProductCategoryMembers", {
    customParametersMap: {
      productId
    },
    pageSize: 500,
    orderByField: "productCategoryId,fromDate"
  })
  const membershipRows = memberships.length ? memberships : primaryProductCategoryId ? [{
    productId,
    productCategoryId: primaryProductCategoryId,
    categoryName: primaryProductCategoryId
  }] : []
  if(!membershipRows.length && !includeAllCategories) {return []}

  const [catalogCategories, productStoreCatalogs] = await Promise.all([
    fetchDataDocument("ProductsCatalogCategoryLookup", {
      pageSize: 5000,
      orderByField: "prodCatalogId,productCategoryId"
    }),
    fetchDataDocument("ProductsProductStoreCatalogLookup", {
      pageSize: 1000,
      orderByField: "productStoreId,prodCatalogId"
    })
  ])
  const catalogCategoriesByCategory = groupRecordsBy(catalogCategories, "productCategoryId")
  const storeCatalogsByCatalog = groupRecordsBy(productStoreCatalogs, "prodCatalogId")

  if(includeAllCategories) {
    const membershipsByCategory = groupRecordsBy(membershipRows, "productCategoryId")

    return catalogCategories.flatMap((catalogCategory) => {
      const productCategoryId = textValue(value(catalogCategory, "productCategoryId"))
      const prodCatalogId = textValue(value(catalogCategory, "prodCatalogId"))
      const matchingStoreCatalogs = storeCatalogsByCatalog.get(prodCatalogId) || [{}]
      const matchingMemberships = membershipsByCategory.get(productCategoryId) || [{}]

      return matchingStoreCatalogs.flatMap((storeCatalog) => matchingMemberships.map((membership) => ({
        ...membership,
        productCategoryId,
        categoryName: value(catalogCategory, "categoryName") || value(membership, "categoryName"),
        prodCatalogId,
        catalogName: value(catalogCategory, "catalogName") || value(storeCatalog, "catalogName"),
        categoryTypeId: value(catalogCategory, "prodCatalogCategoryTypeId"),
        categoryTypeDescription: value(catalogCategory, "categoryTypeDescription"),
        sequenceNum: value(membership, "sequenceNum") || value(catalogCategory, "sequenceNum"),
        productStoreId: value(storeCatalog, "productStoreId"),
        storeName: value(storeCatalog, "storeName"),
        fromDate: value(membership, "fromDate"),
        thruDate: value(membership, "thruDate"),
        catalogCategoryFromDate: value(catalogCategory, "fromDate"),
        catalogCategoryThruDate: value(catalogCategory, "thruDate"),
        productStoreCatalogFromDate: value(storeCatalog, "fromDate"),
        productStoreCatalogThruDate: value(storeCatalog, "thruDate")
      })))
    })
  }

  return membershipRows.flatMap((membership) => {
    const productCategoryId = textValue(value(membership, "productCategoryId"))
    const matchingCatalogCategories = catalogCategoriesByCategory.get(productCategoryId) || []

    if(!matchingCatalogCategories.length) {
      return [{
        ...membership,
        categoryName: value(membership, "categoryName") || value(membership, "description")
      }]
    }

    return matchingCatalogCategories.flatMap((catalogCategory) => {
      const prodCatalogId = textValue(value(catalogCategory, "prodCatalogId"))
      const matchingStoreCatalogs = storeCatalogsByCatalog.get(prodCatalogId) || [{}]

      return matchingStoreCatalogs.map((storeCatalog) => ({
        ...membership,
        productCategoryId,
        categoryName: value(catalogCategory, "categoryName") || value(membership, "categoryName"),
        prodCatalogId,
        catalogName: value(catalogCategory, "catalogName") || value(storeCatalog, "catalogName"),
        categoryTypeId: value(catalogCategory, "prodCatalogCategoryTypeId"),
        categoryTypeDescription: value(catalogCategory, "categoryTypeDescription"),
        sequenceNum: value(membership, "sequenceNum") || value(catalogCategory, "sequenceNum"),
        productStoreId: value(storeCatalog, "productStoreId"),
        storeName: value(storeCatalog, "storeName"),
        fromDate: value(membership, "fromDate"),
        thruDate: value(membership, "thruDate"),
        catalogCategoryFromDate: value(catalogCategory, "fromDate"),
        catalogCategoryThruDate: value(catalogCategory, "thruDate"),
        productStoreCatalogFromDate: value(storeCatalog, "fromDate"),
        productStoreCatalogThruDate: value(storeCatalog, "thruDate")
      }))
    })
  })
}

async function fetchDataDocument(dataDocumentId: string, data: Record<string, unknown> = {}): Promise<Record<string, unknown>[]> {
  const pageSize = numberValue(data.pageSize) || 500
  const records: Record<string, unknown>[] = []
  let pageIndex = numberValue(data.pageIndex)
  let total: number | null = null

  while(total === null || records.length < total) {
    const response = await api({
      url: "oms/dataDocumentView",
      method: "post",
      data: {
        dataDocumentId,
        format: "json",
        ...data,
        pageSize,
        pageIndex
      }
    })
    const pageRecords = responseList(response.data)

    records.push(...pageRecords)
    total = numberValue(response.data?.viewSize || response.data?.count || response.data?.total || records.length)

    if(!pageRecords.length) {break}
    pageIndex += 1
  }

  return records
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
    productStoreIds: productStoreIds(raw),
    searchText: productSearchText(raw),
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
    fromDate: formatDate(identifierDateValue(doc, "from")),
    thruDate: formatDate(identifierDateValue(doc, "thru")),
    active: isActive(identifierDateValue(doc, "from"), identifierDateValue(doc, "thru"))
  })).filter((identifier) => identifier.typeId || identifier.value)
}

function identifierDateValue(doc: Record<string, unknown>, dateType: "from" | "thru"): unknown {
  const prefix = dateType === "from" ? "from" : "thru"

  return value(doc, `${prefix}Date`) ||
    value(doc, `goodIdentification${capitalize(prefix)}Date`) ||
    value(doc, `goodIdentification_${prefix}Date`) ||
    value(doc, `idValue${capitalize(prefix)}Date`) ||
    value(doc, `${prefix}DateTime`) ||
    value(doc, `${prefix}Timestamp`)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
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
    catalogName: textValue(value(doc, "catalogName")),
    productCategoryId: textValue(value(doc, "productCategoryId")),
    categoryName: textValue(value(doc, "categoryName") || value(doc, "description")),
    categoryTypeId: textValue(value(doc, "categoryTypeId") || value(doc, "prodCatalogCategoryTypeId")),
    categoryTypeDescription: textValue(value(doc, "categoryTypeDescription")),
    sequenceNum: textValue(value(doc, "sequenceNum")),
    fromDate: formatDate(value(doc, "fromDate")),
    thruDate: formatDate(value(doc, "thruDate")),
    status: !value(doc, "fromDate") && !value(doc, "thruDate") ? "Available" : isActive(value(doc, "fromDate"), value(doc, "thruDate")) &&
      isActive(value(doc, "catalogCategoryFromDate"), value(doc, "catalogCategoryThruDate")) &&
      isActive(value(doc, "productStoreCatalogFromDate"), value(doc, "productStoreCatalogThruDate")) ? "Active" : "Expired"
  })).filter((exposure) => exposure.productCategoryId || exposure.prodCatalogId || exposure.productStoreId)
}

function normalizeProductAssociations(docs: Record<string, unknown>[], productId: string): ProductRelationship[] {
  return docs.map((doc) => {
    const direction: ProductRelationship["direction"] = textValue(value(doc, "relationshipDirection")) === "incoming" ? "incoming" : "outgoing"
    const relatedProductId = direction === "incoming"
      ? textValue(value(doc, "productId"))
      : textValue(value(doc, "productIdTo"))
    const name = direction === "incoming"
      ? textValue(value(doc, "mainProductName") || value(doc, "mainInternalName"))
      : textValue(value(doc, "assocProductName") || value(doc, "assocInternalName"))
    const imageUrl = direction === "incoming"
      ? textValue(value(doc, "mainImageUrl"))
      : textValue(value(doc, "assocImageUrl"))
    const relatedTypeId = direction === "incoming"
      ? textValue(value(doc, "mainProductTypeId"))
      : textValue(value(doc, "assocProductTypeId"))
    const typeId = textValue(value(doc, "productAssocTypeId"))

    return {
      typeId,
      relatedProductId,
      relatedName: name || relatedProductId,
      relatedImageUrl: imageUrl,
      relatedSku: relatedProductId,
      relatedTypeId,
      direction,
      quantity: textValue(value(doc, "quantity")),
      scrapFactor: textValue(value(doc, "scrapFactor")),
      instruction: textValue(value(doc, "instruction")),
      reason: textValue(value(doc, "reason")),
      sequenceNum: textValue(value(doc, "sequenceNum")),
      fromDate: formatDate(value(doc, "fromDate")),
      thruDate: formatDate(value(doc, "thruDate")),
      active: isActive(value(doc, "fromDate"), value(doc, "thruDate")),
      mirrored: false
    }
  }).filter((relationship) => relationship.relatedProductId && relationship.relatedProductId !== productId)
}

function normalizeHistories(docs: Record<string, unknown>[]): ProductHistory[] {
  return docs.map(normalizeProductHistory)
}

function normalizeProductHistory(doc: Record<string, unknown>): ProductHistory {
  if(value(doc, "changedEntityName") || value(doc, "changedFieldName")) {
    return normalizeEntityAuditHistory(doc)
  }

  const timestamp = formatDate(value(doc, "lastUpdatedStamp") || value(doc, "createdStamp"))
  const productId = textValue(value(doc, "productId"))
  const shopId = textValue(value(doc, "shopId"))
  const systemMessageId = textValue(value(doc, "systemMessageId"))
  const parentTitle = findNonEmptyString(
    value(doc, "parentTitle"),
    value(doc, "parentProductName"),
    value(doc, "productTitle"),
    nestedValue(value(doc, "diffs"), "productTitle"),
    nestedValue(value(doc, "diffs"), "parentTitle"),
    nestedValue(value(doc, "diffs"), "productName")
  )
  const variantTitle = findNonEmptyString(
    value(doc, "variantTitle"),
    value(doc, "internalName"),
    nestedValue(value(doc, "diffs"), "variantTitle"),
    nestedValue(value(doc, "diffs"), "title"),
    nestedValue(value(doc, "diffs"), "name"),
    nestedValue(value(doc, "diffs"), "handle")
  )
  const sku = findNonEmptyString(
    value(doc, "sku"),
    nestedValue(value(doc, "diffs"), "sku"),
    nestedValue(value(doc, "identifications"), "sku"),
    nestedValue(value(doc, "identifications"), "SKU")
  )
  const shopifyId = getShopifyProductReference(doc)
  const details = normalizeHistoryDetails(value(doc, "details"), value(doc, "differenceMap") || value(doc, "diffs"))

  return {
    id: [shopId, productId, systemMessageId, timestamp].filter(Boolean).join("-"),
    source: "ProductUpdateHistory",
    status: textValue(value(doc, "statusId") || value(doc, "status") || "Recorded"),
    message: [
      productId,
      shopId,
      systemMessageId
    ].filter(Boolean).join(" · "),
    timestamp,
    productId,
    parentTitle,
    variantTitle,
    internalName: variantTitle || parentTitle || productId,
    sku,
    shopId,
    shopifyId,
    shopifyIdLabel: shopifyId ? `Shopify ID: ${shopifyId}` : "",
    systemMessageId,
    details
  }
}

function normalizeEntityAuditHistory(doc: Record<string, unknown>): ProductHistory {
  const changedEntityName = textValue(value(doc, "changedEntityName"))
  const changedFieldName = textValue(value(doc, "changedFieldName") || "Field")
  const changedBy = textValue(value(doc, "changedByUserId") || value(doc, "userId") || value(doc, "lastUpdatedByUserId"))
  const timestamp = formatDate(value(doc, "changedDate") || value(doc, "lastUpdatedStamp") || value(doc, "createdStamp"))
  const oldValue = textValue(value(doc, "oldValueText") || value(doc, "oldValue"))
  const newValue = textValue(value(doc, "newValueText") || value(doc, "newValue"))
  const productId = textValue(value(doc, "pkPrimaryValue") || value(doc, "productId"))
  const details: ProductHistoryDetail[] = [
    oldValue ? { type: "previous", label: "Previous value", value: oldValue } : null,
    newValue ? { type: "new", label: "New value", value: newValue } : null
  ].filter(Boolean) as ProductHistoryDetail[]

  return {
    id: textValue(value(doc, "auditHistorySeqId")) || [changedEntityName, productId, changedFieldName, timestamp].filter(Boolean).join("-"),
    source: changedFieldName,
    status: changedBy ? `Changed by ${changedBy}` : "Audit",
    message: auditChangeMessage(oldValue, newValue),
    timestamp,
    productId,
    parentTitle: "",
    variantTitle: "",
    internalName: "",
    sku: "",
    shopId: "",
    shopifyId: "",
    shopifyIdLabel: "",
    systemMessageId: "",
    details
  }
}

function auditChangeMessage(oldValue: string, newValue: string): string {
  if(oldValue && newValue) {return `Previous value: ${oldValue} · New value: ${newValue}`}
  if(newValue) {return `New value: ${newValue}`}
  if(oldValue) {return `Previous value: ${oldValue}`}

  return "Value unavailable"
}

function emptyAnalytics(): ProductAnalytics {
  return {
    windowDays: 30,
    orderCount: null,
    unitsSold: null,
    cancelledUnits: null,
    returnedUnits: null,
    exceptionCount: null,
    salesByDay: emptySalesByDay(30)
  }
}

function emptySalesByDay(windowDays: number): ProductSalesDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (windowDays - 1 - index))

    return { date: isoDay(date), units: 0, orders: 0 }
  })
}

function isoDay(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-")
}

export async function getProductSalesAnalytics(productId: string, windowDays = 30): Promise<ProductAnalytics> {
  const { runSolrQuery } = useSolrSearch()
  const analytics = emptyAnalytics()
  analytics.windowDays = windowDays
  analytics.salesByDay = emptySalesByDay(windowDays)

  const dayIndex = new Map(analytics.salesByDay.map((day, index) => [day.date, index]))
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - (windowDays - 1))
  const startIso = `${isoDay(startDate)}T00:00:00Z`

  const payload = {
    json: {
      params: {
        rows: 0,
        "q.op": "AND"
      },
      query: "*:*",
      filter: [
        "docType: OISGIR",
        `productId: ${productId}`,
        "orderTypeId: SALES_ORDER",
        "-orderStatusId: (ORDER_CANCELLED OR ORDER_REJECTED)",
        `orderDate: [${startIso} TO NOW]`
      ],
      facet: {
        salesByDay: {
          type: "range",
          field: "orderDate",
          start: startIso,
          end: "NOW",
          gap: "+1DAY",
          facet: {
            units: "sum(itemQuantity)",
            orders: "unique(orderId)"
          }
        },
        unitsSold: "sum(itemQuantity)",
        orderCount: "unique(orderId)"
      }
    }
  }

  try {
    const response = await runSolrQuery(payload)
    const facets = response?.data?.facets || {}

    analytics.unitsSold = numberOrNull(facets.unitsSold)
    analytics.orderCount = numberOrNull(facets.orderCount)

    const buckets = facets.salesByDay?.buckets || []
    buckets.forEach((bucket: Record<string, unknown>) => {
      const bucketDate = typeof bucket.val === "string" ? bucket.val.slice(0, 10) : ""
      const target = dayIndex.get(bucketDate)
      if(target === undefined) {return}

      analytics.salesByDay[target] = {
        date: bucketDate,
        units: Number(bucket.units) || 0,
        orders: Number(bucket.orders) || 0
      }
    })
  } catch {
    // Leave analytics in its empty state — caller can decide how to surface the gap.
  }

  return analytics
}

function numberOrNull(raw: unknown): number | null {
  if(raw === null || raw === undefined) {return null}
  const parsed = Number(raw)

  return Number.isFinite(parsed) ? parsed : null
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
  const seen = new Map<string, ProductSummary>()

  products.forEach((product) => {
    const key = product.productId || `${product.productName}-${product.internalName}`
    const existing = seen.get(key)
    if(existing) {
      existing.productStoreIds = Array.from(new Set([...existing.productStoreIds, ...product.productStoreIds]))

      return
    }

    seen.set(key, product)
  })

  return Array.from(seen.values())
}

function productStoreIds(raw: Record<string, unknown>): string[] {
  const productStoreId = textValue(value(raw, "productStoreId"))

  return productStoreId ? [productStoreId] : []
}

function productSearchText(raw: Record<string, unknown>): string {
  return [
    value(raw, "idValue"),
    value(raw, "idValueText"),
    value(raw, "goodIdentificationTypeId"),
    value(raw, "barcode"),
    value(raw, "upc")
  ].map(textValue).filter(Boolean).join(" ")
}

function productSolrFilters(params: ProductSearchParams): Record<string, { value: string | boolean | Array<string | boolean>, op?: string }> {
  const filters: Record<string, { value: string | boolean | Array<string | boolean>, op?: string }> = {}
  const productTypeId = params.productTypeId ?? "FINISHED_GOOD"
  const productStoreId = params.productStoreId ?? ""
  const productKind = params.productKind ?? "All"

  if(productTypeId && productTypeId !== "All") {
    filters.productTypeId = { value: productTypeId }
  }

  if(productStoreId && productStoreId !== "All") {
    filters.productStoreId = { value: productStoreId }
  }

  if(productKind === "Variants") {
    filters.isVariant = { value: true }
    filters.isVirtual = { value: false }
  } else if(productKind === "Virtuals") {
    filters.isVirtual = { value: true }
  } else {
    filters.isVirtual = { value: [true, false], op: "OR" }
  }

  return filters
}

function productListFromSettled(settled: PromiseSettledResult<Record<string, unknown>[]>): Record<string, unknown>[] {
  return settled.status === "fulfilled" ? settled.value : []
}

function productValue(settled: PromiseSettledResult<Record<string, unknown>>, key: string): unknown {
  return settled.status === "fulfilled" ? value(settled.value, key) : ""
}

function groupRecordsBy(records: Record<string, unknown>[], key: string): Map<string, Record<string, unknown>[]> {
  return records.reduce((groups, record) => {
    const valueForKey = textValue(value(record, key))
    if(!valueForKey) {return groups}
    const group = groups.get(valueForKey) || []

    group.push(record)
    groups.set(valueForKey, group)

    return groups
  }, new Map<string, Record<string, unknown>[]>())
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

function normalizeHistoryDetails(details: unknown, diff: unknown): ProductHistoryDetail[] {
  if(Array.isArray(details)) {
    return details.map((detail) => normalizeHistoryDetail(detail)).filter((detail) => detail.label || detail.value)
  }

  const record = parseRecord(diff)
  if(!record) {return []}

  return Object.entries(record).map(([label, detail]) => {
    const normalized = parseRecord(detail)

    if(normalized) {
      const items = Object.entries(normalized).map(([itemLabel, itemValue]) => ({
        label: itemLabel,
        value: textValue(itemValue)
      })).filter((item) => item.value)

      return {
        type: "changed",
        label,
        value: items.map((item) => `${item.label}: ${item.value}`).join(" · "),
        items
      }
    }

    return {
      type: "changed",
      label,
      value: textValue(detail)
    }
  }).filter((detail) => detail.label || detail.value)
}

function normalizeHistoryDetail(raw: unknown): ProductHistoryDetail {
  const record = parseRecord(raw) || {}
  const items = Array.isArray(record.items)
    ? record.items.map((item) => {
      const itemRecord = parseRecord(item) || {}

      return {
        label: textValue(itemRecord.label),
        value: textValue(itemRecord.value || item)
      }
    }).filter((item) => item.value)
    : undefined

  return {
    type: textValue(record.type || "changed"),
    label: textValue(record.label),
    value: textValue(record.value),
    items
  }
}

function parseRecord(raw: unknown): Record<string, unknown> | null {
  if(!raw) {return null}
  if(typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)

      return parseRecord(parsed)
    } catch {
      return null
    }
  }
  if(typeof raw === "object" && !Array.isArray(raw)) {return raw as Record<string, unknown>}

  return null
}

function nestedValue(raw: unknown, key: string): unknown {
  const record = parseRecord(raw)

  return record ? value(record, key) : ""
}

function findNonEmptyString(...values: unknown[]): string {
  return values.map(textValue).find((text) => text.trim()) || ""
}

function getShopifyProductReference(history: Record<string, unknown>): string {
  const diffId = textValue(nestedValue(value(history, "diffs"), "id"))
  const reference = findNonEmptyString(
    diffId.startsWith("gid://shopify/Product/") ? diffId : "",
    value(history, "parentProductId"),
    nestedValue(value(history, "diffs"), "parentProductId"),
    value(history, "shopifyProductId"),
    value(history, "productId"),
    diffId
  )

  if(!reference) {return ""}
  if(reference.startsWith("gid://shopify/")) {return reference.split("/").pop() || reference}

  return reference
}
