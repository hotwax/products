import { describe, expect, it } from "vitest"
import { activePricesForTypeContext } from "../prices"
import type { ProductPrice } from "@/domain/types/product"

const price = (overrides: Partial<ProductPrice>): ProductPrice => ({
  productPriceTypeId: "DEFAULT_PRICE",
  productPricePurposeId: "LISTING",
  currencyUomId: "USD",
  productStoreId: "STORE",
  productStoreGroupId: "GROUP",
  price: 10,
  fromDate: "2026-06-01T00:00:00Z",
  thruDate: null,
  active: true,
  ...overrides
})

describe("price context helpers", () => {
  it("keeps expiry candidates scoped to the edited price context", () => {
    const prices = [
      price({ fromDate: "2026-06-01T00:00:00Z", price: 20 }),
      price({ currencyUomId: "CAD", fromDate: "2026-06-02T00:00:00Z", price: 21 }),
      price({ productStoreId: "OTHER_STORE", fromDate: "2026-06-03T00:00:00Z", price: 22 }),
      price({ productStoreGroupId: "OTHER_GROUP", fromDate: "2026-06-04T00:00:00Z", price: 23 }),
      price({ productPricePurposeId: "PURCHASE", fromDate: "2026-06-05T00:00:00Z", price: 24 }),
      price({ productPriceTypeId: "LIST_PRICE", fromDate: "2026-06-06T00:00:00Z", price: 25 }),
      price({ fromDate: "2026-06-07T00:00:00Z", price: 26, active: false, thruDate: "2026-06-08T00:00:00Z" })
    ]

    expect(activePricesForTypeContext(prices, "DEFAULT_PRICE", {
      currencyUomId: "USD",
      productPricePurposeId: "LISTING",
      productStoreId: "STORE",
      productStoreGroupId: "GROUP"
    })).toEqual([prices[0]])
  })
})
