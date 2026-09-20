import { beforeEach, describe, expect, it, vi } from "vitest"
import { request, responseList } from "../http"

vi.mock("../http", () => ({
  request: vi.fn(),
  responseList: vi.fn((value: unknown) => value)
}))

import { fetchProductCalendar, saveProductCalendarMapping } from "../productCalendar"

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

  it("does not save a Shopify mapping outside the four lifecycle date fields", async () => {
    await expect(saveProductCalendarMapping({
      shopId: "SHOP_1",
      mappedKey: "productCategoryId",
      mappedValue: "launch:date"
    })).rejects.toThrow("Unsupported product calendar field")

    expect(request).not.toHaveBeenCalled()
  })
})
