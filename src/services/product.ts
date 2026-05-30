import { api, commonUtil, useSolrSearch } from "@common"

import {
  getProductIndexMetadata,
  replaceIndexedProducts
} from "@/services/productIndex"
import type {
  DuplicateIdentifierGroup,
  FieldValue,
  ProductAnalytics,
  ProductDetail,
  ProductFeatureApplication,
  ProductFeatureFamily,
  ProductFeatureFamilyType,
  ProductFeatureFamilyVariant,
  ProductFeatureRecord,
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
  RowSalesSpark,
  ShopifyMapping,
  StoreCatalogExposure,
  TagFacet
} from "@/types/product"
import type { OmsProductAssocTypeRow } from "@/utils/productAssocTypes"

export async function searchProducts(params: ProductSearchParams = {}): Promise<ProductSearchResult> {
  const pageSize = Number(params.pageSize ?? 25)
  const pageIndex = Number(params.pageIndex ?? 0)
  const { searchProducts: searchSolrProducts } = useSolrSearch()
  const response = await searchSolrProducts({
    keyword: params.queryString,
    sort: productSolrSort(params),
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

export async function getProductFeatureFamily(productId: string): Promise<ProductFeatureFamily> {
  const [productResult, featureApplResult, parentAssocResult] = await Promise.allSettled([
    getProduct(productId),
    performFindAll("ProductFeatureAppl", { productId }),
    performFindAll("ProductAssoc", { productIdTo: productId, productAssocTypeId: "PRODUCT_VARIANT" })
  ])

  const product = productResult.status === "fulfilled" ? productResult.value : { productId }
  const isVirtual = flagValue(value(product, "isVirtual"))
  const directFeatureAppls = productListFromSettled(featureApplResult)
  const parentAssocs = productListFromSettled(parentAssocResult)

  const virtualProductId = isVirtual ? productId : textValue(value(parentAssocs[0] || {}, "productId")) || productId

  const variantsResult = await performFindAll("ProductAssoc", {
    productId: virtualProductId,
    productAssocTypeId: "PRODUCT_VARIANT"
  }).catch(() => [])

  const variantIds = Array.from(new Set([
    productId,
    ...variantsResult.map((row) => textValue(value(row, "productIdTo"))).filter(Boolean)
  ])).filter((id) => id !== virtualProductId)

  if(virtualProductId !== productId && !variantIds.includes(productId)) {
    variantIds.unshift(productId)
  }

  const variantProductLookups = variantIds.length
    ? await Promise.all(variantIds.map((id) => getProduct(id).catch(() => ({ productId: id }))))
    : []
  const variantFeatureAppls = variantIds.length
    ? await Promise.all(variantIds.map((id) => performFindAll("ProductFeatureAppl", { productId: id }).catch(() => [])))
    : []

  const allFeatureAppls = [...directFeatureAppls, ...variantFeatureAppls.flat()]
  const featureIds = Array.from(new Set(allFeatureAppls.map((row) => textValue(value(row, "productFeatureId"))).filter(Boolean)))
  const featureMap = await loadFeatureMap(featureIds)
  const applTypeMap = await loadApplTypeMap()

  const normalizeAppl = (row: Record<string, unknown>): ProductFeatureApplication => {
    const featureId = textValue(value(row, "productFeatureId"))
    const feature = featureMap.get(featureId) || {} as ProductFeatureRecord
    const fromDate = value(row, "fromDate")
    const thruDate = value(row, "thruDate")
    const applTypeId = textValue(value(row, "productFeatureApplTypeId"))

    return {
      productId: textValue(value(row, "productId")),
      productFeatureId: featureId,
      productFeatureApplTypeId: applTypeId,
      applTypeDescription: applTypeMap.get(applTypeId) || applTypeId,
      featureTypeId: feature.productFeatureTypeId || "",
      featureTypeDescription: feature.featureTypeDescription || feature.productFeatureTypeId || "",
      featureDescription: feature.description || "",
      description: feature.description || featureId,
      abbrev: feature.abbrev || "",
      idCode: feature.idCode || "",
      sequenceNum: textValue(value(row, "sequenceNum")),
      fromDate: formatDate(fromDate),
      thruDate: formatDate(thruDate),
      active: isActive(fromDate, thruDate)
    }
  }

  const virtualProduct = virtualProductId === productId
    ? product
    : await getProduct(virtualProductId).catch(() => ({ productId: virtualProductId }))

  const virtualSummary = normalizeProductSummary(virtualProduct)
  const virtualFeatureAppls = isVirtual ? directFeatureAppls : (await performFindAll("ProductFeatureAppl", { productId: virtualProductId }).catch(() => []))

  const selectableFeatures = virtualFeatureAppls
    .map(normalizeAppl)
    .filter((appl) => appl.productFeatureApplTypeId !== "STANDARD_FEATURE")
    .sort(featureSortComparator)

  const variants: ProductFeatureFamilyVariant[] = variantIds.map((id, index) => {
    const variantProduct = variantProductLookups[index] || { productId: id }
    const summary = normalizeProductSummary(variantProduct)
    const features = (variantFeatureAppls[index] || [])
      .map(normalizeAppl)
      .filter((appl) => appl.productFeatureApplTypeId === "STANDARD_FEATURE")
      .sort(featureSortComparator)

    return {
      productId: summary.productId || id,
      productName: summary.productName,
      internalName: summary.internalName,
      imageUrl: summary.imageUrl,
      primarySku: summary.primarySku,
      features
    }
  })

  const featureTypeMap = new Map<string, ProductFeatureFamilyType>()
  const distinctVariantFeatures = new Map<string, ProductFeatureApplication>()
  variants.flatMap((variant) => variant.features).forEach((appl) => {
    if(!appl.featureTypeId) {return}
    if(!distinctVariantFeatures.has(appl.productFeatureId)) {
      distinctVariantFeatures.set(appl.productFeatureId, appl)
    }
  })
  Array.from(distinctVariantFeatures.values()).concat(selectableFeatures).forEach((appl) => {
    if(!appl.featureTypeId) {return}
    const entry = featureTypeMap.get(appl.featureTypeId) || {
      featureTypeId: appl.featureTypeId,
      featureTypeDescription: appl.featureTypeDescription,
      featureCount: 0
    }
    entry.featureCount += 1
    featureTypeMap.set(appl.featureTypeId, entry)
  })

  return {
    virtualProductId,
    virtualProductName: virtualSummary.productName || virtualSummary.internalName || virtualProductId,
    virtualProductImageUrl: virtualSummary.imageUrl,
    variants,
    featureTypes: Array.from(featureTypeMap.values()).sort((a, b) => a.featureTypeDescription.localeCompare(b.featureTypeDescription)),
    selectableFeatures
  }
}

export async function getProductFeatureTypeCatalog(): Promise<Array<{ id: string, description: string }>> {
  const rows = await performFindAll("ProductFeatureType", {}, 200).catch(() => [])

  return rows.map((row) => ({
    id: textValue(value(row, "productFeatureTypeId")),
    description: textValue(value(row, "description")) || textValue(value(row, "productFeatureTypeId"))
  })).filter((entry) => entry.id).sort((a, b) => a.description.localeCompare(b.description))
}

export async function getProductFeatureApplTypeCatalog(): Promise<Array<{ id: string, description: string }>> {
  const rows = await performFindAll("ProductFeatureApplType", {}, 50).catch(() => [])

  return rows.map((row) => ({
    id: textValue(value(row, "productFeatureApplTypeId")),
    description: textValue(value(row, "description")) || textValue(value(row, "productFeatureApplTypeId"))
  })).filter((entry) => entry.id).sort((a, b) => a.description.localeCompare(b.description))
}

export async function getAllProductFeatures(): Promise<ProductFeatureRecord[]> {
  const [docs, typeMap] = await Promise.all([
    performFindAll("ProductFeature", {}, 200).catch(() => []),
    loadFeatureTypeMap()
  ])

  return docs.map((row) => {
    const typeId = textValue(value(row, "productFeatureTypeId"))

    return {
      productFeatureId: textValue(value(row, "productFeatureId")),
      productFeatureTypeId: typeId,
      featureTypeDescription: typeMap.get(typeId) || typeId,
      description: textValue(value(row, "description")),
      abbrev: textValue(value(row, "abbrev")),
      idCode: textValue(value(row, "idCode"))
    }
  }).filter((entry) => entry.productFeatureId)
    .sort((a, b) => (a.description || a.productFeatureId).localeCompare(b.description || b.productFeatureId))
}

export async function searchProductFeatures(term: string, limit = 25): Promise<ProductFeatureRecord[]> {
  const trimmed = term.trim()
  if(!trimmed) {return []}

  const docs = await performFindAll("ProductFeature", {})
  const matches = docs.filter((row) => {
    const haystack = [
      value(row, "productFeatureId"),
      value(row, "description"),
      value(row, "abbrev"),
      value(row, "idCode"),
      value(row, "productFeatureTypeId")
    ].map(textValue).join(" ").toLowerCase()

    return haystack.includes(trimmed.toLowerCase())
  }).slice(0, limit)
  const typeMap = await loadFeatureTypeMap()

  return matches.map((row) => ({
    productFeatureId: textValue(value(row, "productFeatureId")),
    productFeatureTypeId: textValue(value(row, "productFeatureTypeId")),
    featureTypeDescription: typeMap.get(textValue(value(row, "productFeatureTypeId"))) || textValue(value(row, "productFeatureTypeId")),
    description: textValue(value(row, "description")),
    abbrev: textValue(value(row, "abbrev")),
    idCode: textValue(value(row, "idCode"))
  }))
}

async function loadFeatureMap(featureIds: string[]): Promise<Map<string, ProductFeatureRecord>> {
  if(!featureIds.length) {return new Map()}
  const typeMap = await loadFeatureTypeMap()

  const featureMap = new Map<string, ProductFeatureRecord>()
  const lookups = await Promise.all(featureIds.map((id) => performFindAll("ProductFeature", { productFeatureId: id }, 5).catch(() => [])))

  lookups.forEach((rows, index) => {
    const row = rows[0]
    if(!row) {
      featureMap.set(featureIds[index]!, {
        productFeatureId: featureIds[index]!,
        productFeatureTypeId: "",
        featureTypeDescription: "",
        description: "",
        abbrev: "",
        idCode: ""
      })

      return
    }

    const typeId = textValue(value(row, "productFeatureTypeId"))
    featureMap.set(textValue(value(row, "productFeatureId")), {
      productFeatureId: textValue(value(row, "productFeatureId")),
      productFeatureTypeId: typeId,
      featureTypeDescription: typeMap.get(typeId) || typeId,
      description: textValue(value(row, "description")),
      abbrev: textValue(value(row, "abbrev")),
      idCode: textValue(value(row, "idCode"))
    })
  })

  return featureMap
}

let featureTypeMapCache: Promise<Map<string, string>> | null = null

function loadFeatureTypeMap(): Promise<Map<string, string>> {
  if(!featureTypeMapCache) {
    featureTypeMapCache = performFindAll("ProductFeatureType", {}, 200).then((rows) => {
      const map = new Map<string, string>()
      rows.forEach((row) => {
        map.set(textValue(value(row, "productFeatureTypeId")), textValue(value(row, "description")))
      })

      return map
    }).catch(() => new Map<string, string>())
  }

  return featureTypeMapCache
}

let applTypeMapCache: Promise<Map<string, string>> | null = null

function loadApplTypeMap(): Promise<Map<string, string>> {
  if(!applTypeMapCache) {
    applTypeMapCache = performFindAll("ProductFeatureApplType", {}, 20).then((rows) => {
      const map = new Map<string, string>()
      rows.forEach((row) => {
        map.set(textValue(value(row, "productFeatureApplTypeId")), textValue(value(row, "description")))
      })

      return map
    }).catch(() => new Map<string, string>())
  }

  return applTypeMapCache
}

async function performFindAll(entityName: string, inputFields: Record<string, unknown>, viewSize = 200): Promise<Record<string, unknown>[]> {
  const response = await api({
    url: "performFind",
    method: "post",
    baseURL: commonUtil.getOmsURL(),
    data: {
      entityName,
      inputFields,
      viewSize,
      noConditionFind: "Y"
    }
  })

  return responseList(response.data)
}

function featureSortComparator(a: ProductFeatureApplication, b: ProductFeatureApplication): number {
  if(a.featureTypeDescription !== b.featureTypeDescription) {
    return a.featureTypeDescription.localeCompare(b.featureTypeDescription)
  }

  const seqA = Number(a.sequenceNum) || 0
  const seqB = Number(b.sequenceNum) || 0
  if(seqA !== seqB) {return seqA - seqB}

  return a.description.localeCompare(b.description)
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
    createdDate: formatDate(value(raw, "createdDate") ||
      value(raw, "entryDate") ||
      value(raw, "createdStamp") ||
      value(raw, "createdTxStamp") ||
      value(raw, "fromDate") ||
      value(raw, "introductionDate") ||
      value(raw, "salesIntroductionDate")),
    updatedDate: formatDate(value(raw, "updatedDate") ||
      value(raw, "updatedDatetime") ||
      value(raw, "lastUpdatedStamp") ||
      value(raw, "lastModifiedDate") ||
      value(raw, "lastUpdatedTxStamp")),
    imageUrl: normalizeProductImageUrl(raw),
    brandName: textValue(value(raw, "brandName")),
    primaryProductCategoryId: textValue(value(raw, "primaryProductCategoryId") || value(raw, "productCategoryId")),
    productStoreIds: productStoreIds(raw),
    groupId: textValue(value(raw, "groupId")),
    tags: stringArray(value(raw, "tags")),
    catalogCategoryTypeIds: stringArray(value(raw, "prodCatalogCategoryTypeIds")),
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
      active: isActive(value(doc, "fromDate"), value(doc, "thruDate"))
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
        "docType: ORDER",
        `productId: ${productId}`,
        "orderTypeId: SALES_ORDER",
        "-orderStatusId: ORDER_CANCELLED",
        "-orderItemStatusId: ITEM_CANCELLED",
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
            units: "sum(quantity)",
            orders: "unique(orderId)"
          }
        },
        unitsSold: "sum(quantity)",
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

function salesWindowStartIso(windowDays: number): string {
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - (windowDays - 1))

  return `${isoDay(startDate)}T00:00:00Z`
}

const ACTIVE_SALES_FILTERS = [
  "docType: ORDER",
  "orderTypeId: SALES_ORDER",
  "-orderStatusId: ORDER_CANCELLED",
  "-orderItemStatusId: ITEM_CANCELLED"
]

// One Solr query returns a 30-day daily sales series for every product id passed in, so result
// rows can render sparklines without firing a request per row. The facet nests an outer orderDate
// range over an inner productId terms facet (range -> terms): the reverse nesting (terms -> range)
// and nested sum() metrics both return empty/zero on this Solr build, whereas bucket counts are
// reliable. Each order line carries quantity 1 in practice, so the line-item count is an accurate
// proxy for units; the product detail page still uses the exact sum(quantity).
export async function getBatchSalesAnalytics(productIds: string[], windowDays = 30): Promise<Map<string, RowSalesSpark>> {
  const result = new Map<string, RowSalesSpark>()
  const ids = Array.from(new Set(productIds.filter(Boolean)))
  if(!ids.length) {return result}

  const { runSolrQuery, escapeSolrSpecialChars } = useSolrSearch()
  const startIso = salesWindowStartIso(windowDays)
  const idClause = ids.map((id) => `"${escapeSolrSpecialChars(id)}"`).join(" OR ")

  const payload = {
    json: {
      params: { rows: 0, "q.op": "AND" },
      query: "*:*",
      filter: [...ACTIVE_SALES_FILTERS, `productId: (${idClause})`, `orderDate: [${startIso} TO NOW]`],
      facet: {
        byDay: {
          type: "range",
          field: "orderDate",
          start: startIso,
          end: "NOW",
          gap: "+1DAY",
          facet: {
            byProduct: { type: "terms", field: "productId", limit: ids.length }
          }
        }
      }
    }
  }

  try {
    const response = await runSolrQuery(payload)
    const dayBuckets = response?.data?.facets?.byDay?.buckets || []
    const series = new Map<string, number[]>(ids.map((id) => [id, Array(dayBuckets.length).fill(0)]))

    dayBuckets.forEach((day: Record<string, any>, dayIndex: number) => {
      (day.byProduct?.buckets || []).forEach((bucket: Record<string, unknown>) => {
        const productId = textValue(bucket.val)
        const row = series.get(productId)
        if(row) {row[dayIndex] = Number(bucket.count) || 0}
      })
    })

    series.forEach((row, productId) => {
      const unitsSold = row.reduce((total, value) => total + value, 0)
      if(unitsSold > 0) {result.set(productId, { productId, series: row, unitsSold })}
    })
  } catch {
    // Sparklines are decorative; on failure rows simply render without them.
  }

  return result
}

// Counts how many variants roll up under each virtual/parent product id, in a single query.
export async function getVariantCounts(parentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const ids = Array.from(new Set(parentIds.filter(Boolean)))
  if(!ids.length) {return counts}

  const { runSolrQuery, escapeSolrSpecialChars } = useSolrSearch()
  const idClause = ids.map((id) => `"${escapeSolrSpecialChars(id)}"`).join(" OR ")

  const payload = {
    json: {
      params: { rows: 0, "q.op": "AND" },
      query: "*:*",
      filter: ["docType: PRODUCT", "isVariant: true", `groupId: (${idClause})`],
      facet: { groupId: { type: "terms", field: "groupId", limit: ids.length } }
    }
  }

  try {
    const response = await runSolrQuery(payload)
    const buckets = response?.data?.facets?.groupId?.buckets || []
    buckets.forEach((bucket: Record<string, unknown>) => {
      const parentId = textValue(bucket.val)
      if(parentId) {counts.set(parentId, Number(bucket.count) || 0)}
    })
  } catch {
    // Variant counts are supplementary; omit on failure.
  }

  return counts
}

// Tag facet counts within the current browse/search scope, excluding selected tags so users can
// add another tag without first clearing the current tag filter.
export async function getProductTagFacets(params: ProductSearchParams = {}, limit = 2000): Promise<TagFacet[]> {
  const { runSolrQuery, escapeSolrSpecialChars } = useSolrSearch()
  const payload = {
    json: {
      params: { rows: 0, "q.op": "AND" },
      query: productFacetQuery(params, escapeSolrSpecialChars),
      filter: ["docType: PRODUCT", ...productScopeFilterStrings({ ...params, tags: [] })],
      facet: { tags: { type: "terms", field: "tags", limit, mincount: 1, sort: { count: "desc" } } }
    }
  }

  try {
    const response = await runSolrQuery(payload)

    return (response?.data?.facets?.tags?.buckets || [])
      .map((bucket: Record<string, unknown>) => ({ value: textValue(bucket.val), count: Number(bucket.count) || 0 }))
      .filter((facet: TagFacet) => facet.value)
  } catch {
    return []
  }
}

// Finds products whose chosen identifier value collides with another product's, so they can be
// triaged and resolved. Two queries: one facet pass to find the colliding values, one fetch pass
// to pull the products that share them.
export async function getDuplicateIdentifierGroups(field: "sku" | "upc", maxGroups = 100): Promise<DuplicateIdentifierGroup[]> {
  const { runSolrQuery, escapeSolrSpecialChars } = useSolrSearch()

  const facetResponse = await runSolrQuery({
    json: {
      params: { rows: 0, "q.op": "AND" },
      query: "*:*",
      filter: ["docType: PRODUCT"],
      facet: { dup: { type: "terms", field, limit: maxGroups, mincount: 2, sort: { count: "desc" } } }
    }
  })

  const dupValues: string[] = (facetResponse?.data?.facets?.dup?.buckets || [])
    .map((bucket: Record<string, unknown>) => textValue(bucket.val))
    .filter(Boolean)
  if(!dupValues.length) {return []}

  const valueClause = dupValues.map((dupValue) => `"${escapeSolrSpecialChars(dupValue)}"`).join(" OR ")
  const docsResponse = await runSolrQuery({
    json: {
      params: { rows: dupValues.length * 25, "q.op": "AND" },
      query: "*:*",
      filter: ["docType: PRODUCT", `${field}: (${valueClause})`]
    }
  })

  const docs = docsResponse?.data?.response?.docs || []
  const grouped = new Map<string, ProductSummary[]>()
  docs.forEach((doc: Record<string, unknown>) => {
    const key = textValue(value(doc, field))
    if(!key) {return}
    const list = grouped.get(key) || []
    list.push(normalizeProductSummary(doc))
    grouped.set(key, list)
  })

  return dupValues
    .map((dupValue) => ({ field, value: dupValue, products: grouped.get(dupValue) || [] }))
    .filter((group) => group.products.length > 1)
}

// One facet pass (rows: 0) counting, for each requested Solr field, how many products have it
// empty/unset — plus the audited catalog total. Powers the Missing-values coverage scorecard.
export async function getMissingFieldCounts(fields: string[]): Promise<{ total: number, totalByField: Record<string, number>, missing: Record<string, number> }> {
  const { runSolrQuery } = useSolrSearch()
  const safeFields = Array.from(new Set(fields.map((field) => canonicalMissingField(field)).filter(Boolean)))
  if(!safeFields.length) {return { total: 0, totalByField: {}, missing: {} }}

  const facet: Record<string, unknown> = {}
  safeFields.forEach((field) => {
    facet[field] = { type: "query", q: missingFieldQuery(field) }
    facet[`${field}Total`] = { type: "query", q: missingFieldEligibilityQuery(field) }
  })

  try {
    const response = await runSolrQuery({
      json: {
        params: { rows: 0, "q.op": "AND" },
        query: "*:*",
        filter: ["docType: PRODUCT"],
        facet
      }
    })

    const facets = response?.data?.facets || {}
    const total = Number(facets.count ?? response?.data?.response?.numFound) || 0
    const missing: Record<string, number> = {}
    const totalByField: Record<string, number> = {}
    safeFields.forEach((field) => {
      missing[field] = Number(facets[field]?.count) || 0
      totalByField[field] = Number(facets[`${field}Total`]?.count) || total
    })

    return { total, totalByField, missing }
  } catch {
    return { total: 0, totalByField: {}, missing: {} }
  }
}

// Products where the chosen Solr field is empty/unset.
export async function getProductsMissingField(field: string, params: ProductSearchParams = {}): Promise<ProductSearchResult> {
  const { runSolrQuery } = useSolrSearch()
  const pageSize = Number(params.pageSize ?? 25)
  const pageIndex = Number(params.pageIndex ?? 0)
  const safeField = canonicalMissingField(field)
  if(!safeField) {return { products: [], total: 0, pageIndex, pageSize }}

  const response = await runSolrQuery({
    json: {
      params: { rows: pageSize, start: pageSize * pageIndex, "q.op": "AND" },
      query: "*:*",
      filter: ["docType: PRODUCT", ...missingFieldFilterStrings(safeField), ...productScopeFilterStrings(params)]
    }
  })

  const docs = response?.data?.response?.docs || []

  return {
    products: docs.map(normalizeProductSummary),
    total: Number(response?.data?.response?.numFound) || 0,
    pageIndex,
    pageSize
  }
}

function canonicalMissingField(field: string): string {
  const safeField = field.replace(/[^\w.]/g, "")
  if(safeField.toLowerCase() === "upc") {return "upc"}

  return safeField
}

function missingFieldEligibilityFilters(field: string): string[] {
  return field === "upc" ? ["isVariant: true"] : []
}

function missingFieldEligibilityQuery(field: string): string {
  return missingFieldEligibilityFilters(field).join(" AND ") || "*:*"
}

function missingFieldQuery(field: string): string {
  return [...missingFieldEligibilityFilters(field), `-${field}: *`].join(" AND ")
}

function missingFieldFilterStrings(field: string): string[] {
  return [...missingFieldEligibilityFilters(field), `-${field}: *`]
}

// Optimistic write: the OMS endpoint for updating a product identifier is not connected yet, so
// this intentionally posts to the expected route and lets the resulting error surface to the user.
export async function updateProductIdentification(payload: {
  productId: string
  goodIdentificationTypeId: string
  idValue: string
}): Promise<void> {
  await api({
    url: `oms/products/${encodeURIComponent(payload.productId)}/goodIdentifications`,
    method: "post",
    data: {
      goodIdentificationTypeId: payload.goodIdentificationTypeId,
      idValue: payload.idValue
    }
  })
}

function productScopeFilterStrings(params: ProductSearchParams): string[] {
  const filters: string[] = []
  const productTypeId = params.productTypeId ?? "FINISHED_GOOD"

  if(productTypeId && productTypeId !== "All") {filters.push(`productTypeId: ${productTypeId}`)}
  if(params.productStoreId && params.productStoreId !== "All") {filters.push(`productStoreId: ${params.productStoreId}`)}

  if(params.productKind === "Variants") {
    filters.push("isVariant: true")
  } else if(params.productKind === "Virtuals") {
    filters.push("isVirtual: true")
  }

  if(params.tags?.length) {
    const tagClause = params.tags.map((tag) => `"${tag}"`).join(" OR ")
    filters.push(`tags: (${tagClause})`)
  }

  return filters
}

function productSolrSort(params: ProductSearchParams): string {
  if(params.sort === "Updated") {return "updatedDatetime desc"}
  if(params.sort === "Created") {return "entryDate desc"}

  return "sort_productName asc"
}

function productFacetQuery(params: ProductSearchParams, escapeSolrSpecialChars: (value: string) => string): string {
  const queryString = params.queryString?.trim()
  if(!queryString) {return "*:*"}

  const tokens = queryString.split(/\s+/).map((token) => token.trim()).filter(Boolean)
  if(!tokens.length) {return "*:*"}

  return `searchText:(${tokens.map((token) => `*${escapeSolrSpecialChars(token)}*`).join(" AND ")})`
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
  const ids = stringArray(value(raw, "productStoreIds"))
  const single = textValue(value(raw, "productStoreId"))
  if(single && !ids.includes(single)) {ids.push(single)}

  return ids
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

  if(params.tags?.length) {
    filters.tags = { value: params.tags.map((tag) => `"${tag}"`), op: "OR" }
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

function stringArray(raw: unknown): string[] {
  if(Array.isArray(raw)) {return raw.map(textValue).filter(Boolean)}
  const single = textValue(raw)

  return single ? [single] : []
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
