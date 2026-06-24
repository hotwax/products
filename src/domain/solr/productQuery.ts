import type { ProductSearchParams, ProductSortOption } from "../types/product"

/** Builders for PIM Solr JSON Request API payloads. Pure functions — the ONLY place that knows
 *  how workbench filters translate to the pim-products index. */

export interface SolrJsonQuery {
  query: string
  filter: string[]
  limit?: number
  offset?: number
  sort?: string
  fields?: string
  facet?: Record<string, unknown>
  params?: Record<string, unknown>
}

const SOLR_SPECIALS = /[+\-&|!(){}[\]^"~*?:\\/]/g

export function escapeSolrValue(value: string): string {
  return value.replace(SOLR_SPECIALS, "\\$&")
}

export function productSort(sort: ProductSortOption): string {
  switch (sort) {
    case "Updated": return "updatedDatetime desc"
    case "Created": return "introductionDate desc"
    default: return "productName asc"
  }
}

/** Filter strings for the current workbench scope (everything except the text query). */
export function productScopeFilters(params: Partial<ProductSearchParams>): string[] {
  const filters = ["docType:PRODUCT"]
  if(params.productTypeId && params.productTypeId !== "All") {filters.push(`productTypeId:${escapeSolrValue(params.productTypeId)}`)}
  if(params.productKind === "Variants") {filters.push("isVariant:true")}
  if(params.productKind === "Virtuals") {filters.push("isVirtual:true")}
  if(params.productStoreId && params.productStoreId !== "All") {filters.push(`productStoreIds:${escapeSolrValue(params.productStoreId)}`)}
  for(const tag of params.tags ?? []) {filters.push(`tags:"${tag.replace(/"/g, "\\\"")}"`)}
  for(const groupId of params.groupIds ?? []) {filters.push(`groupId:${escapeSolrValue(groupId)}`)}

  return filters
}

export function productSearchQueryText(queryString: string): string {
  const tokens = queryString.trim().split(/\s+/).filter(Boolean).map(escapeSolrValue)
  if(!tokens.length) {return "*:*"}

  return `*${tokens.join(" ")}*`
}

export function workbenchSearchPayload(params: ProductSearchParams, pageIndex: number): SolrJsonQuery {
  return {
    query: productSearchQueryText(params.queryString),
    filter: productScopeFilters(params),
    sort: productSort(params.sort),
    limit: params.pageSize,
    offset: pageIndex * params.pageSize,
    params: {
      "defType": "edismax",
      "q.op": "OR",
      "qf": "productId groupId parentProductName productName internalName sku"
    }
  }
}

/** Tag facet over the current scope minus the tag filter itself (so more tags can be added). */
export function tagFacetPayload(params: ProductSearchParams): SolrJsonQuery {
  return {
    query: productSearchQueryText(params.queryString),
    filter: productScopeFilters({ ...params, tags: [] }),
    limit: 0,
    facet: { tags: { type: "terms", field: "tags", limit: 200, mincount: 1 } },
    params: { "q.op": "AND" }
  }
}

/** GroupId facet over the current scope minus the groupId filter and productKind check (isVariant/isVirtual)
 *  so facet counts reflect all docs in the group regardless of variant/virtual split. */
export function groupIdFacetPayload(params: ProductSearchParams): SolrJsonQuery {
  return {
    query: productSearchQueryText(params.queryString),
    filter: productScopeFilters({ ...params, groupIds: [], productKind: undefined }),
    limit: 0,
    facet: { groupId: { type: "terms", field: "groupId", limit: -1, mincount: 1 } },
    params: {
      "defType": "edismax",
      "q.op": "OR",
      "qf": "productId groupId parentProductName productName internalName sku"
    }
  }
}
