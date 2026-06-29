import { describe, expect, it } from "vitest"
import { productScopeFilters, productSearchQueryText, productSort, rowSalesAnalyticsPayload, tagFacetPayload, workbenchSearchPayload } from "../productQuery"
import type { ProductSearchParams } from "../../types/product"

const params: ProductSearchParams = {
  queryString: "crew tee",
  productTypeId: "FINISHED_GOOD",
  productKind: "Variants",
  productStoreId: "PIM_STORE",
  tags: ["summer"],
  sort: "Updated",
  pageSize: 25
}

describe("productScopeFilters", () => {
  it("builds scope filters from every active facet", () => {
    expect(productScopeFilters(params)).toEqual([
      "docType:PRODUCT",
      "productTypeId:FINISHED_GOOD",
      "isVariant:true",
      "productStoreIds:PIM_STORE",
      "tags:\"summer\""
    ])
  })

  it("treats All selections as no filter", () => {
    expect(productScopeFilters({ productTypeId: "All", productStoreId: "All", productKind: "All", tags: [] })).toEqual([
      "docType:PRODUCT"
    ])
  })
})

describe("search text", () => {
  it("tokenizes and targets searchText", () => {
    expect(productSearchQueryText(" crew  tee ")).toBe("*crew tee*")
  })

  it("escapes solr specials", () => {
    expect(productSearchQueryText("a+b")).toBe("*a\\+b*")
  })

  it("matches all docs when empty", () => {
    expect(productSearchQueryText("   ")).toBe("*:*")
  })
})

describe("payloads", () => {
  it("pages with offset and applies AND semantics", () => {
    const payload = workbenchSearchPayload(params, 2)
    expect(payload.offset).toBe(50)
    expect(payload.limit).toBe(25)
    expect(payload.params).toEqual({
      "defType": "edismax",
      "q.op": "OR",
      "qf": "productId groupId parentProductName productName internalName sku"
    })
    expect(payload.sort).toBe(productSort("Updated"))
  })

  it("builds one batched row sales analytics facet for visible products", () => {
    const payload = rowSalesAnalyticsPayload(["SKU-1", "SKU+2", "SKU-1"], "2026-06-01T00:00:00Z")

    expect(payload.limit).toBe(0)
    expect(payload.params).toEqual({ "q.op": "AND" })
    expect(payload.filter).toEqual([
      "docType: ORDER",
      "orderTypeId: SALES_ORDER",
      "-orderStatusId: ORDER_CANCELLED",
      "-orderItemStatusId: ITEM_CANCELLED",
      "productId: (\"SKU\\-1\" OR \"SKU\\+2\")",
      "orderDate: [2026-06-01T00:00:00Z TO NOW]"
    ])
    expect(payload.facet?.byDay).toEqual({
      type: "range",
      field: "orderDate",
      start: "2026-06-01T00:00:00Z",
      end: "NOW",
      gap: "+1DAY",
      facet: {
        byProduct: { type: "terms", field: "productId", limit: 2 }
      }
    })
  })

  it("excludes the tag filter from the tag facet scope", () => {
    const payload = tagFacetPayload(params)
    expect(payload.filter).not.toContain("tags:\"summer\"")
    expect(payload.facet?.tags).toBeTruthy()
  })
})
