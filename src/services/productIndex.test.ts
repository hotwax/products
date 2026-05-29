import { describe, expect, it } from "vitest"

import { searchIndexedProducts } from "./productIndex"
import type { ProductSummary } from "@/types/product"

function product(overrides: Partial<ProductSummary>): ProductSummary {
  return {
    productId: "",
    productName: "",
    internalName: "",
    productTypeId: "FINISHED_GOOD",
    primarySku: "",
    imageUrl: "",
    brandName: "",
    primaryProductCategoryId: "",
    productStoreIds: [],
    searchText: "",
    isVirtual: false,
    isVariant: false,
    readiness: {
      state: "attention",
      missingCount: 0,
      labels: []
    },
    ...overrides
  }
}

describe("searchIndexedProducts", () => {
  it("filters indexed products by query and product kind before paginating", () => {
    const result = searchIndexedProducts([
      product({ productId: "SKU-100", productName: "Black shirt", primarySku: "SKU-100", isVariant: true }),
      product({ productId: "SKU-101", productName: "Black shirt virtual", primarySku: "STYLE-100", isVirtual: true }),
      product({ productId: "SKU-102", productName: "Blue shirt", primarySku: "SKU-102", isVariant: true }),
      product({ productId: "SKU-103", productName: "Black pants", primarySku: "SKU-103", isVariant: true })
    ], {
      queryString: "black",
      productKind: "Variants",
      pageIndex: 0,
      pageSize: 2
    })

    expect(result.total).toBe(2)
    expect(result.products.map((item) => item.productId)).toEqual(["SKU-100", "SKU-103"])
  })

  it("filters indexed products by product store membership", () => {
    const result = searchIndexedProducts([
      product({ productId: "SKU-100", productName: "Black shirt", productStoreIds: ["STORE_A"] }),
      product({ productId: "SKU-101", productName: "Blue shirt", productStoreIds: ["STORE_B"] })
    ], {
      productStoreId: "STORE_B",
      pageIndex: 0,
      pageSize: 25
    })

    expect(result.products.map((item) => item.productId)).toEqual(["SKU-101"])
  })

  it("keeps products with unknown store membership when a store filter is selected", () => {
    const result = searchIndexedProducts([
      product({ productId: "SKU-100", productName: "Black shirt", productStoreIds: [] })
    ], {
      productStoreId: "STORE_B",
      pageIndex: 0,
      pageSize: 25
    })

    expect(result.products.map((item) => item.productId)).toEqual(["SKU-100"])
  })

  it("matches identifier values captured from the Solr document", () => {
    const result = searchIndexedProducts([
      product({ productId: "SKU-100", productName: "Black shirt", searchText: "000111222333" }),
      product({ productId: "SKU-101", productName: "Blue shirt", searchText: "999888777666" })
    ], {
      queryString: "111222",
      pageIndex: 0,
      pageSize: 25
    })

    expect(result.products.map((item) => item.productId)).toEqual(["SKU-100"])
  })
})
