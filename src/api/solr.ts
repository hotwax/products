import type { SolrJsonQuery, SolrSearchQueryPayload } from "@/domain/solr/productQuery"
import { request } from "./http"

/** PIM product-index search transport. The pim component owns the core, the document shape,
 *  and this passthrough — the response is Solr's JSON Request API envelope. */

export interface SolrResponse {
  responseHeader?: Record<string, unknown>
  response?: { numFound: number; start: number; docs: Record<string, unknown>[] }
  facets?: Record<string, any>
  facet_counts?: { facet_fields?: Record<string, (string | number)[]> }
  grouped?: Record<string, unknown>
}

export function runProductSolrQuery(json: SolrJsonQuery): Promise<SolrResponse> {
  return request<SolrResponse>({ url: "admin/runSolrQuery", method: "post", data: { json } })
}

/** Native Solr search query transport (POST admin/search/query).
 *  Unlike runSolrQuery, passes top-level params (such as traditional facet.field) directly to Solr. */
export async function searchProductSolr(query: SolrSearchQueryPayload): Promise<any> {
  const resp = await request<any>({ url: "admin/search/query", method: "post", data: query })
  return resp?.response ?? resp
}

export function solrDocs(response: SolrResponse): Record<string, unknown>[] {
  return response.response?.docs ?? []
}

export function solrTotal(response: SolrResponse): number {
  return response.response?.numFound ?? 0
}
