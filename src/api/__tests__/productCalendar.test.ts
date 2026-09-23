import { beforeEach, describe, expect, it, vi } from "vitest"
import { request, responseList } from "../http"

vi.mock("../http", () => ({
  request: vi.fn(),
  responseList: vi.fn((value: unknown) => value)
}))

import { fetchProductCalendar, fetchProductCalendarMappings } from "../productCalendar"

describe("product calendar API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches calendar dates within the selected ProductStore", async () => {
    vi.mocked(request).mockResolvedValueOnce([])

    await fetchProductCalendar("RAILS")

    expect(request).toHaveBeenCalledWith({
      url: "oms/productStoreProductCalendar",
      method: "get",
      params: { productStoreId: "RAILS", pageSize: 500, orderByField: "productId" }
    })
    expect(responseList).toHaveBeenCalledWith([])
  })

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
