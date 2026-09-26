import { beforeEach, describe, expect, it, vi } from "vitest"
import { request } from "../http"

vi.mock("../http", () => ({
  request: vi.fn(),
  responseList: vi.fn((value: unknown) => value)
}))

import { fetchProductCalendar, fetchProductCalendarMappings } from "../productCalendar"

describe("product calendar API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches a requested calendar page and parses the total count", async () => {
    const page = {
      calendarRows: [{ productId: "M101831" }],
      totalCount: 101,
      pageIndex: 2,
      pageSize: 50
    }
    vi.mocked(request).mockResolvedValueOnce(page)

    await expect(fetchProductCalendar("RAILS", 2, 50, "M101831")).resolves.toEqual(page)

    expect(request).toHaveBeenCalledWith({
      url: "oms/productStoreProductCalendar",
      method: "get",
      params: {
        productStoreId: "RAILS",
        pageIndex: 2,
        pageSize: 50,
        keyword: "M101831"
      }
    })
  })

  it.each(["M101831", "Abominable Hoodie", "V_abominable-hoodie"])(
    "passes %s as the server-side calendar search keyword",
    async (keyword) => {
      vi.mocked(request).mockResolvedValueOnce({
        calendarRows: [],
        totalCount: 0,
        pageIndex: 0,
        pageSize: 50
      })

      await fetchProductCalendar("RAILS", 0, 50, keyword)

      expect(vi.mocked(request).mock.calls[0][0]).toMatchObject({
        params: expect.objectContaining({
          productStoreId: "RAILS",
          pageIndex: 0,
          pageSize: 50,
          keyword
        })
      })
    }
  )

  it("reads only calendar metafield mappings", async () => {
    vi.mocked(request).mockResolvedValueOnce([])

    await fetchProductCalendarMappings()

    expect(request).toHaveBeenCalledWith({
      url: "sob/shopify/typeMappings",
      method: "get",
      params: { mappedTypeId: "SHOPIFY_PRODUCT_CALENDAR_DATE", pageSize: 500 }
    })
  })
})
