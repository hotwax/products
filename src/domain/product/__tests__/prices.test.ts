import { describe, expect, it } from "vitest"
import type { ProductPrice } from "@/domain/types/product"
import {
  DEFAULT_PRICE_PURPOSE, activePriceForTypeContext, activePricesForTypeContext, priceTypeLabel, priceTypesFor, purposeForNewPrice
} from "../prices"

const price = (overrides: Partial<ProductPrice>): ProductPrice => ({
  productPriceTypeId: "LIST_PRICE",
  productPricePurposeId: "PURCHASE",
  currencyUomId: "USD",
  productStoreId: "",
  productStoreGroupId: "GROUP",
  price: 10,
  fromDate: "2026-06-01T00:00:00Z",
  thruDate: null,
  active: true,
  ...overrides
})

const context = { currencyUomId: "USD", productStoreGroupId: "GROUP" }

describe("a store's price", () => {
  it("is the price for its store group and currency, even though the record names no store", () => {
    const connectorPrice = price({ price: 180 })

    expect(activePriceForTypeContext([connectorPrice], "LIST_PRICE", context)).toBe(connectorPrice)
  })

  it("keeps expiry candidates to the type, currency, and store group being edited", () => {
    const prices = [
      price({ price: 20 }),
      price({ currencyUomId: "CAD", price: 21 }),
      price({ productStoreGroupId: "OTHER_GROUP", price: 22 }),
      price({ productPriceTypeId: "DEFAULT_PRICE", price: 23 }),
      price({ price: 24, active: false, thruDate: "2026-06-08T00:00:00Z" }),
      price({ productPricePurposeId: "RECURRING_CHARGE", price: 25 })
    ]

    expect(activePricesForTypeContext(prices, "LIST_PRICE", context)).toEqual([prices[0]])
  })

  it("counts both PURCHASE and the LISTING prices this app used to save", () => {
    const purchase = price({ fromDate: "2026-06-01T00:00:00Z" })
    const listing = price({ productPricePurposeId: "LISTING", fromDate: "2026-06-02T00:00:00Z" })

    expect(activePricesForTypeContext([purchase, listing], "LIST_PRICE", context)).toEqual([purchase, listing])
  })

  it("takes the latest active price when several match", () => {
    const older = price({ fromDate: "2026-05-01T00:00:00Z", price: 15 })
    const newer = price({ fromDate: "2026-06-01T00:00:00Z", price: 20 })

    expect(activePriceForTypeContext([older, newer], "LIST_PRICE", context)).toBe(newer)
    expect(activePriceForTypeContext([], "LIST_PRICE", context)).toBeUndefined()
  })

  it("gives a replacement the purpose of the price it replaces, PURCHASE when there is none", () => {
    expect(purposeForNewPrice([price({ productPricePurposeId: "LISTING", fromDate: "2026-06-02T00:00:00Z" }), price({})])).toBe("LISTING")
    expect(purposeForNewPrice([])).toBe(DEFAULT_PRICE_PURPOSE)
  })
})

describe("price types", () => {
  it("always includes the HotWax types, then any other type the product carries once", () => {
    const prices = [price({ productPriceTypeId: "MINIMUM_PRICE" }), price({ productPriceTypeId: "MINIMUM_PRICE" }), price({ productPriceTypeId: "LIST_PRICE" })]

    expect(priceTypesFor([])).toEqual(["DEFAULT_PRICE", "LIST_PRICE", "WHOLESALE_PRICE"])
    expect(priceTypesFor(prices)).toEqual(["DEFAULT_PRICE", "LIST_PRICE", "WHOLESALE_PRICE", "MINIMUM_PRICE"])
  })

  it("labels known types and spells out the others", () => {
    expect(priceTypeLabel("LIST_PRICE")).toBe("List price")
    expect(priceTypeLabel("SPECIAL_PROMO_PRICE")).toBe("Special promo price")
  })
})
