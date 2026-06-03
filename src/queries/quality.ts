import { infiniteQueryOptions, queryOptions } from "@tanstack/vue-query"
import { runProductSolrQuery, solrDocs, solrTotal } from "@/api/solr"
import { normalizeProductSummary } from "@/domain/normalize/product"
import {
  coverageFromFacets, coveragePayload, duplicateProductsPayload, duplicateValuesFromFacets,
  duplicateValuesPayload, groupDuplicateDocs, missingProductsPayload
} from "@/domain/quality/engine"
import type { DuplicateGroup, QualityRule, RuleCoverage } from "@/domain/types/quality"
import type { ProductSearchPage } from "@/domain/types/product"
import { qk } from "./keys"

const MISSING_PAGE_SIZE = 25

/** Coverage scorecard for all required-field rules in one Solr facet pass. */
export function coverageOptions(rules: QualityRule[]) {
  return queryOptions({
    queryKey: qk.quality.coverage(rules.map((rule) => rule.id)),
    queryFn: async (): Promise<RuleCoverage[]> => {
      const response = await runProductSolrQuery(coveragePayload(rules))
      return coverageFromFacets(rules, response.facets ?? {})
    },
    staleTime: 60_000
  })
}

/** Duplicate groups for a unique-field rule (facet pass + fetch pass). */
export function duplicateGroupsOptions(rule: QualityRule) {
  return queryOptions({
    queryKey: qk.quality.duplicates(rule.id),
    queryFn: async (): Promise<DuplicateGroup[]> => {
      const facetResponse = await runProductSolrQuery(duplicateValuesPayload(rule))
      const values = duplicateValuesFromFacets(facetResponse.facets ?? {}).map((bucket) => bucket.value)
      if (!values.length) return []
      const docsResponse = await runProductSolrQuery(duplicateProductsPayload(rule, values))
      return groupDuplicateDocs(rule, solrDocs(docsResponse))
    }
  })
}

/** Infinite drill-down of products missing a rule's field. */
export function missingProductsOptions(rule: QualityRule) {
  return infiniteQueryOptions({
    queryKey: qk.quality.missing(rule.id),
    queryFn: async ({ pageParam }): Promise<ProductSearchPage> => {
      const response = await runProductSolrQuery(missingProductsPayload(rule, pageParam, MISSING_PAGE_SIZE))
      return { products: solrDocs(response).map(normalizeProductSummary), total: solrTotal(response), pageIndex: pageParam }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.products.length, 0)
      return loaded < lastPage.total ? pages.length : undefined
    }
  })
}
