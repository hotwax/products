import { describe, expect, it, vi } from "vitest"
import { triggerSolrIndex } from "../pim"
import { request } from "../http"

vi.mock("../http", () => ({
  request: vi.fn(() => Promise.resolve({})),
  responseList: vi.fn((data: unknown) => data)
}))

vi.mock("@/store/user", () => ({
  useUserStore: vi.fn()
}))

const mockedRequest = vi.mocked(request)

describe("triggerSolrIndex", () => {
  it("uses the canonical admin product indexing endpoint", () => {
    mockedRequest.mockClear()

    triggerSolrIndex("M101989", { indexVariants: false })

    expect(mockedRequest).toHaveBeenCalledWith({
      url: "admin/solr/indexProduct",
      method: "post",
      data: {
        productId: "M101989",
        indexVariants: false
      }
    })
  })
})
