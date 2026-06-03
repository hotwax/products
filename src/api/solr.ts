import type { SolrJsonQuery } from "@/domain/solr/productQuery"
import { request } from "./http"

/** PIM product-index search transport. The pim component owns the core, the document shape,
 *  and this passthrough — the response is Solr's JSON Request API envelope. */

export interface SolrResponse {
  responseHeader?: Record<string, unknown>
  response?: { numFound: number; start: number; docs: Record<string, unknown>[] }
  facets?: Record<string, any>
  grouped?: Record<string, unknown>
}

export async function runProductSolrQuery(json: SolrJsonQuery): Promise<SolrResponse> {
  return request<SolrResponse>({ url: "pim/runSolrQuery", method: "post", data: { json } })
}

export function solrDocs(response: SolrResponse): Record<string, unknown>[] {
  return response.response?.docs ?? []
}

export function solrTotal(response: SolrResponse): number {
  return response.response?.numFound ?? 0
}
