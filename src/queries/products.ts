import { infiniteQueryOptions, queryOptions } from "@tanstack/vue-query"
import { runProductSolrQuery, solrDocs, solrTotal } from "@/api/solr"
import { normalizeProductSummary } from "@/domain/normalize/product"
import { groupIdFacetPayload, tagFacetPayload, workbenchSearchPayload } from "@/domain/solr/productQuery"
import type { GroupIdFacet, ProductSearchPage, ProductSearchParams, TagFacet } from "@/domain/types/product"
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

export function tagFacetsOptions(params: ProductSearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tags: _tags, ...scope } = params

  return queryOptions({
    queryKey: qk.products.tagFacets(scope),
    queryFn: async (): Promise<TagFacet[]> => {
      const response = await runProductSolrQuery(tagFacetPayload(params))
      const buckets: any[] = response.facets?.tags?.buckets ?? []

      return buckets.map((bucket) => ({ value: String(bucket.val), count: Number(bucket.count) }))
    },
    staleTime: 5 * 60_000
  })
}

export function groupIdFacetsOptions(params: ProductSearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { groupIds: _groupIds, ...scope } = params

  return queryOptions({
    queryKey: qk.products.groupIdFacets(scope),
    queryFn: async (): Promise<Record<string, number>> => {
      const response = await runProductSolrQuery(groupIdFacetPayload(params))
      const buckets: any[] = response.facets?.groupId?.buckets ?? []

      return Object.fromEntries(buckets.map((bucket) => [String(bucket.val), Number(bucket.count)]))
    },
    staleTime: 5 * 60_000
  })
}
