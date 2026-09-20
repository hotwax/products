import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildAppUrl } from "@common"
import {
  getActiveCalendarMappings,
  getCalendarMappingManagementHref,
} from "../productCalendarMappings"

vi.mock("@common", () => ({
  buildAppUrl: vi.fn((_appId: string, path = "") => `https://company.example${path}`),
}))

describe("product calendar Shopify mappings", () => {
  beforeEach(() => {
    vi.mocked(buildAppUrl).mockReset().mockImplementation((_appId, path = "") => `https://company.example${path}`)
  })

  it("counts only active calendar mappings for linked shops", () => {
    expect(getActiveCalendarMappings(
      [{ shopId: "B" }, { shopId: "A" }],
      [
        { shopId: "A", mappedTypeId: "SHOPIFY_PRODUCT_CALENDAR_DATE", mappedKey: "releaseDate", mappedValue: "calendar:launch" },
        { shopId: "B", mappedTypeId: "SHOPIFY_PRODUCT_CALENDAR_DATE", mappedKey: "introductionDate", mappedValue: "" },
        { shopId: "C", mappedTypeId: "SHOPIFY_PRODUCT_CALENDAR_DATE", mappedKey: "releaseDate", mappedValue: "calendar:other" },
      ],
    )).toHaveLength(1)
  })

  it("uses the first stable linked shop for the Company Product Sync URL", () => {
    expect(getCalendarMappingManagementHref([{ shopId: "B" }, { shopId: "A" }]))
      .toBe("https://company.example/shopify-connection-details/A/product-sync")
    expect(buildAppUrl).toHaveBeenCalledWith("company", "/shopify-connection-details/A/product-sync")
  })

  it("returns null when no linked shop is available", () => {
    expect(getCalendarMappingManagementHref([])).toBeNull()
  })

  it("returns null when the Company app URL is unavailable", () => {
    vi.mocked(buildAppUrl).mockReturnValueOnce(null)

    expect(getCalendarMappingManagementHref([{ shopId: "A" }])).toBeNull()
  })
})
