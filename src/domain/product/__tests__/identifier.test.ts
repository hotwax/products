import { describe, expect, it } from "vitest"
import { getPrimaryProductIdentifier, getSecondaryProductIdentifier } from "../identifier"

describe("product identifiers", () => {
  it("uses the preferred identifier before product-name fallbacks", () => {
    expect(getPrimaryProductIdentifier({ primaryId: "SKU" }, {
      productId: "P1",
      productName: "Black / 28",
      internalName: "Black 28",
      sku: "WP06-28-Black"
    })).toBe("WP06-28-Black")
  })

  it("supports good-identification records when the flat field is absent", () => {
    expect(getPrimaryProductIdentifier({ primaryId: "SKU" }, {
      productId: "P1",
      productName: "Black / 28",
      goodIdentifications: [{ type: "SKU", value: "WP06-28-Black" }]
    })).toBe("WP06-28-Black")
  })

  it("falls back to the product id for missing secondary identifiers", () => {
    expect(getSecondaryProductIdentifier({ secondaryId: "UPC" }, {
      productId: "P1",
      productName: "Black / 28"
    })).toBe("P1")
  })
})
