import type { SolrJsonQuery } from "../solr/productQuery"
import type { DuplicateGroup, QualityRule, QualityScope, RuleCoverage } from "../types/quality"
import { normalizeProductSummary } from "../normalize/product"
import { escapeSolrValue } from "../solr/productQuery"

/** Pure query builders + response parsers for the quality-rule registry. No I/O here —
 *  queries/quality.ts feeds these payloads to pim/runSolrQuery and hands responses back. */

export function scopeFilters(scope: QualityScope): string[] {
  if (scope === "variants") return ["isVariant:true"]
  if (scope === "virtuals") return ["isVirtual:true"]
  return []
}

/** One facet pass computing missing + eligible-total counts for every required-field rule. */
export function coveragePayload(rules: QualityRule[], baseFilters: string[] = []): SolrJsonQuery {
  const facet: Record<string, unknown> = {}
  for (const rule of rules) {
    const scoped = [...scopeFilters(rule.scope), ...baseFilters]
    const scopeQuery = scoped.length ? scoped.join(" AND ") : "*:*"
    facet[`${rule.id}:total`] = { type: "query", q: scopeQuery }
    facet[`${rule.id}:missing`] = { type: "query", q: [scopeQuery, `-${rule.solrField}:*`].join(" AND ") }
  }
  return { query: "*:*", filter: ["docType:PRODUCT"], limit: 0, facet }
}

export function coverageFromFacets(rules: QualityRule[], facets: Record<string, any>): RuleCoverage[] {
  return rules.map((rule) => {
    const eligibleTotal = Number(facets?.[`${rule.id}:total`]?.count ?? 0)
    const missing = Number(facets?.[`${rule.id}:missing`]?.count ?? 0)
    const pctComplete = eligibleTotal === 0 ? 100 : Math.floor(((eligibleTotal - missing) / eligibleTotal) * 100)
    return { ruleId: rule.id, eligibleTotal, missing, pctComplete }
  })
}

/** Page of products missing the rule's field. */
export function missingProductsPayload(rule: QualityRule, pageIndex: number, pageSize: number, baseFilters: string[] = []): SolrJsonQuery {
  return {
    query: "*:*",
    filter: ["docType:PRODUCT", ...scopeFilters(rule.scope), ...baseFilters, `-${rule.solrField}:*`],
    limit: pageSize,
    offset: pageIndex * pageSize,
    sort: "createdDate desc"
  }
}

/** Pass 1: terms facet finding values shared by 2+ products. */
export function duplicateValuesPayload(rule: QualityRule, maxGroups = 100): SolrJsonQuery {
  return {
    query: "*:*",
    filter: ["docType:PRODUCT", ...scopeFilters(rule.scope)],
    limit: 0,
    facet: { dups: { type: "terms", field: rule.solrField, mincount: 2, limit: maxGroups, sort: { count: "desc" } } }
  }
}

export function duplicateValuesFromFacets(facets: Record<string, any>): { value: string; count: number }[] {
  const buckets: any[] = facets?.dups?.buckets ?? []
  return buckets.map((bucket) => ({ value: String(bucket.val), count: Number(bucket.count) }))
}

/** Pass 2: fetch the colliding products for the duplicate values. */
export function duplicateProductsPayload(rule: QualityRule, values: string[], perGroup = 25): SolrJsonQuery {
  const escaped = values.map((value) => `"${escapeSolrValue(value)}"`).join(" OR ")
  return {
    query: "*:*",
    filter: ["docType:PRODUCT", ...scopeFilters(rule.scope), `${rule.solrField}:(${escaped})`],
    limit: Math.max(values.length * perGroup, perGroup),
    sort: "createdDate asc"
  }
}

export function groupDuplicateDocs(rule: QualityRule, docs: Record<string, unknown>[]): DuplicateGroup[] {
  const byValue = new Map<string, DuplicateGroup>()
  for (const doc of docs) {
    const value = String(doc[rule.solrField] ?? "")
    if (!value) continue
    let group = byValue.get(value)
    if (!group) {
      group = { ruleId: rule.id, value, products: [] }
      byValue.set(value, group)
    }
    group.products.push(normalizeProductSummary(doc))
  }
  // oldest product first inside each group (the newer import is usually the one to fix)
  for (const group of byValue.values()) {
    group.products.sort((a, b) => (a.createdDate || "9999").localeCompare(b.createdDate || "9999") || a.productId.localeCompare(b.productId))
  }
  return [...byValue.values()].filter((group) => group.products.length >= 2)
    .sort((a, b) => b.products.length - a.products.length || a.value.localeCompare(b.value))
}
