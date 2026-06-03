import { describe, expect, it } from "vitest"
import {
  coverageFromFacets, coveragePayload, duplicateProductsPayload, duplicateValuesFromFacets, duplicateValuesPayload,
  groupDuplicateDocs, missingProductsPayload, scopeFilters
} from "../engine"
import type { QualityRule } from "../../types/quality"

const skuRule: QualityRule = {
  id: "unique-sku", label: "SKU", description: "", kind: "unique-field", scope: "all", solrField: "sku",
  resolution: { target: "goodIdentification", goodIdentificationTypeId: "SKU" }
}
const upcRule: QualityRule = {
  id: "required-upc", label: "UPC", description: "", kind: "required-field", scope: "variants", solrField: "upc"
}

describe("scopeFilters", () => {
  it("maps scopes to solr filters", () => {
    expect(scopeFilters("all")).toEqual([])
    expect(scopeFilters("variants")).toEqual(["isVariant:true"])
    expect(scopeFilters("virtuals")).toEqual(["isVirtual:true"])
  })
})

describe("coverage", () => {
  it("builds one facet pair per rule, scope-aware", () => {
    const payload = coveragePayload([skuRule, upcRule])
    expect(payload.limit).toBe(0)
    expect(payload.facet?.["unique-sku:total"]).toEqual({ type: "query", q: "*:*" })
    expect(payload.facet?.["required-upc:missing"]).toEqual({ type: "query", q: "isVariant:true AND -upc:*" })
  })

  it("computes pct complete from facet counts", () => {
    const coverage = coverageFromFacets([upcRule], {
      "required-upc:total": { count: 10 },
      "required-upc:missing": { count: 2 }
    })
    expect(coverage).toEqual([{ ruleId: "required-upc", eligibleTotal: 10, missing: 2, pctComplete: 80 }])
  })

  it("treats an empty scope as fully covered", () => {
    const coverage = coverageFromFacets([upcRule], {})
    expect(coverage[0].pctComplete).toBe(100)
  })
})

describe("duplicates", () => {
  it("requests terms facet with mincount 2", () => {
    const payload = duplicateValuesPayload(skuRule)
    expect((payload.facet?.dups as any).mincount).toBe(2)
    expect((payload.facet?.dups as any).field).toBe("sku")
  })

  it("parses facet buckets", () => {
    expect(duplicateValuesFromFacets({ dups: { buckets: [{ val: "A", count: 2 }] } })).toEqual([{ value: "A", count: 2 }])
    expect(duplicateValuesFromFacets({})).toEqual([])
  })

  it("escapes duplicate values in the fetch filter", () => {
    const payload = duplicateProductsPayload(skuRule, ["A+B"])
    expect(payload.filter.at(-1)).toContain("sku:(\"A\\+B\")")
  })

  it("groups colliding docs oldest-first and drops singletons", () => {
    const groups = groupDuplicateDocs(skuRule, [
      { productId: "P2", sku: "DUP", createdDate: "2025-03-20T00:00:00Z" },
      { productId: "P1", sku: "DUP", createdDate: "2025-03-10T00:00:00Z" },
      { productId: "P3", sku: "SOLO", createdDate: "2025-01-01T00:00:00Z" }
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].value).toBe("DUP")
    expect(groups[0].products.map((product) => product.productId)).toEqual(["P1", "P2"])
  })
})

describe("missing drill-down", () => {
  it("filters by absent field within the rule scope and pages", () => {
    const payload = missingProductsPayload(upcRule, 2, 25)
    expect(payload.filter).toContain("-upc:*")
    expect(payload.filter).toContain("isVariant:true")
    expect(payload.offset).toBe(50)
  })
})
