import { describe, expect, it } from "vitest"
import { DEFAULT_PRODUCT_IDENTIFICATION_PREF, parseProductIdentificationPref, productIdentifierValue } from "../identification"

describe("product identifier values", () => {
  it("reads a document field and a goodIdentifications entry", () => {
    const product = { productId: "P1", goodIdentifications: ["SKU/T-R-S", "UPCA/195692243528"] }

    expect(productIdentifierValue("productId", product)).toBe("P1")
    expect(productIdentifierValue("SKU", product)).toBe("T-R-S")
    expect(productIdentifierValue("UPCA", product)).toBe("195692243528")
  })

  it("treats a never-set value as missing, including the text null the index stores for it", () => {
    const product = { productId: "113714", goodIdentifications: ["SKU/null", "UPCA/undefined", "ERP_ID/ "] }

    expect(productIdentifierValue("SKU", product)).toBe("")
    expect(productIdentifierValue("UPCA", product)).toBe("")
    expect(productIdentifierValue("ERP_ID", product)).toBe("")
    expect(productIdentifierValue("GTIN", product)).toBe("")
    expect(productIdentifierValue("productId", product)).toBe("113714")
  })

  it("returns nothing without an identifier or a product", () => {
    expect(productIdentifierValue("", { productId: "P1" })).toBe("")
    expect(productIdentifierValue("SKU", null)).toBe("")
    expect(productIdentifierValue("SKU", {})).toBe("")
  })
})

describe("product identifier preference", () => {
  it("falls back to the shared default when the store has no usable setting", () => {
    expect(parseProductIdentificationPref(undefined)).toEqual(DEFAULT_PRODUCT_IDENTIFICATION_PREF)
    expect(parseProductIdentificationPref("not json")).toEqual(DEFAULT_PRODUCT_IDENTIFICATION_PREF)
  })

  it("reads the saved primary and secondary identifiers", () => {
    expect(parseProductIdentificationPref(JSON.stringify({ primaryId: "UPCA", secondaryId: "" }))).toEqual({ primaryId: "UPCA", secondaryId: "" })
  })
})
