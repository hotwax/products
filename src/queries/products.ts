import { infiniteQueryOptions, queryOptions } from "@tanstack/vue-query"
import { logger } from "@common"
import { request } from "@/api/http"
import { runProductSolrQuery, searchProductSolr, solrDocs, solrTotal } from "@/api/solr"
import { normalizeProductSummary } from "@/domain/normalize/product"
import { groupIdFacetPayload, productsByIdPayload, rowSalesAnalyticsPayload, tagFacetPayload, tagSearchQueryPayload, workbenchSearchPayload } from "@/domain/solr/productQuery"
import type { ProductSearchPage, ProductSearchParams, RowSalesSpark, TagFacet } from "@/domain/types/product"
import { qk } from "./keys"

/** Workbench search: infinite query keyed on the full filter object — changing any filter is a new
 *  cache entry, so page state resets for free and going back to a previous filter is instant. */
export function workbenchSearchOptions(params: ProductSearchParams) {
  return infiniteQueryOptions({
    queryKey: qk.products.search(params),
    queryFn: async ({ pageParam }): Promise<ProductSearchPage> => {
      const response = await runProductSolrQuery(workbenchSearchPayload(params, pageParam))

      return {
        products: solrDocs(response).map(normalizeProductSummary),
        total: solrTotal(response),
        pageIndex: pageParam
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.products.length, 0)

      return loaded < lastPage.total ? pages.length : undefined
    }
  })
}

export function parseTagFacets(response: any): TagFacet[] {
  if (!response) return []

  // Check Solr facet_counts.facet_fields.tags (standard Solr faceting)
  const facetCounts = response?.facet_counts?.facet_fields?.tags ??
                      response?.response?.facet_counts?.facet_fields?.tags
  if (Array.isArray(facetCounts) && facetCounts.length > 0) {
    const list: TagFacet[] = []
    for (let i = 0; i < facetCounts.length; i += 2) {
      const val = String(facetCounts[i] ?? "").trim()
      const count = Number(facetCounts[i + 1]) || 0
      if (val) {
        list.push({ value: val, count })
      }
    }
    if (list.length > 0) return list
  }

  // Check Solr JSON Facet API: facets.tags.buckets
  const buckets: any[] = response?.facets?.tags?.buckets ??
                         response?.response?.facets?.tags?.buckets ?? []
  if (Array.isArray(buckets) && buckets.length > 0) {
    return buckets
      .map((bucket) => ({ value: String(bucket.val ?? "").trim(), count: Number(bucket.count) || 0 }))
      .filter((facet) => facet.value.length > 0)
  }

  return []
}

export async function fetchProductTagFacets(params: ProductSearchParams): Promise<TagFacet[]> {
  // 1. Primary: admin/search/query with traditional Solr facet params (as used in order-routing)
  try {
    const searchPayload = tagSearchQueryPayload(params)
    const response = await searchProductSolr(searchPayload)
    const facets = parseTagFacets(response)
    if (facets.length > 0) return facets
  } catch (error) {
    logger.warn("search/query tag faceting failed, attempting runSolrQuery", error)
  }

  // 2. Secondary: admin/runSolrQuery with tagFacetPayload
  try {
    const facetPayload = tagFacetPayload(params)
    const response = await runProductSolrQuery(facetPayload)
    const facets = parseTagFacets(response)
    if (facets.length > 0) return facets
  } catch (error) {
    logger.warn("runSolrQuery tag faceting failed, attempting admin/solrFacets", error)
  }

  // 3. Tertiary: admin/solrFacets (co.hotwax.search.SearchServices.autoComplete#SolrFacet)
  try {
    const scopeFilters = productScopeFilters({ ...params, tags: [] })
    const resp = await request<any>({
      url: "admin/solrFacets",
      method: "get",
      params: {
        facetToSelect: "tagsFacet",
        docType: "PRODUCT",
        coreName: "enterpriseSearch",
        jsonQuery: JSON.stringify({
          query: productSearchQueryText(params.queryString),
          filter: scopeFilters
        }),
        noConditionFind: "Y",
        limit: 200,
        searchfield: "tags"
      }
    })
    const options: any[] = resp?.facetResponse?.response ?? resp?.response ?? []
    if (Array.isArray(options) && options.length > 0) {
      return options
        .map((opt) => ({
          value: String(opt.value ?? opt.label ?? opt.id ?? opt.val ?? "").trim(),
          count: Number(opt.count) || 0
        }))
        .filter((facet) => facet.value.length > 0)
    }
  } catch (error) {
    logger.warn("admin/solrFacets failed", error)
  }

  return []
}

export function tagFacetsOptions(params: ProductSearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tags: _tags, ...scope } = params

  return queryOptions({
    queryKey: qk.products.tagFacets(scope),
    queryFn: () => fetchProductTagFacets(params),
    staleTime: 5 * 60_000
  })
}

export function groupIdFacetsOptions(params: ProductSearchParams) {
  const parentIds = Array.from(new Set((params.groupIds ?? []).filter(Boolean)))

  return queryOptions({
    queryKey: qk.products.groupIdFacets(parentIds),
    enabled: parentIds.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      if(!parentIds.length) {return {}}
      const response = await runProductSolrQuery(groupIdFacetPayload(params))
      const buckets: any[] = response.facets?.groupId?.buckets ?? []

      return {
        ...Object.fromEntries(parentIds.map((id) => [id, 0])),
        ...Object.fromEntries(buckets.map((bucket) => [String(bucket.val), Number(bucket.count)]))
      }
    },
    staleTime: 5 * 60_000
  })
}

export function rowSalesAnalyticsOptions(productIds: string[]) {
  const ids = Array.from(new Set(productIds.filter(Boolean)))

  return queryOptions({
    queryKey: qk.products.rowSales(ids),
    queryFn: async (): Promise<Record<string, RowSalesSpark>> => {
      if(!ids.length) {return {}}

      const response = await runProductSolrQuery(rowSalesAnalyticsPayload(ids, salesWindowStartIso(30)))
      const dayBuckets: any[] = response.facets?.byDay?.buckets ?? []
      const series = new Map<string, number[]>(ids.map((id) => [id, Array(dayBuckets.length).fill(0)]))

      dayBuckets.forEach((day, dayIndex) => {
        const buckets: any[] = day.byProduct?.buckets ?? []
        buckets.forEach((bucket) => {
          const productId = String(bucket.val ?? "")
          const row = series.get(productId)
          if(row) {row[dayIndex] = Number(bucket.count) || 0}
        })
      })

      return Object.fromEntries([...series.entries()].map(([productId, row]) => [
        productId,
        { productId, series: row, unitsSold: row.reduce((total, value) => total + value, 0) }
      ]))
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
    retry: false
  })
}

/** Cached product documents for lists whose own API carries only IDs and a name (associations). */
export function productDocumentsOptions(productIds: string[]) {
  const ids = Array.from(new Set(productIds.filter(Boolean))).sort()

  return queryOptions({
    queryKey: qk.products.documents(ids),
    queryFn: () => fetchProductsById(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60_000
  })
}

/** Product documents by productId, for rows whose own API returns only IDs. The raw documents are
 *  kept (not normalized) because identifier preferences also read their goodIdentifications. */
export async function fetchProductsById(productIds: string[]): Promise<Record<string, Record<string, unknown>>> {
  const ids = Array.from(new Set(productIds.filter(Boolean)))
  if(!ids.length) {return {}}

  const response = await runProductSolrQuery(productsByIdPayload(ids))

  return Object.fromEntries(solrDocs(response).map((doc) => [String(doc.productId ?? ""), doc]))
}

function salesWindowStartIso(windowDays: number): string {
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - (windowDays - 1))

  return `${startDate.toISOString().slice(0, 10)}T00:00:00Z`
}
