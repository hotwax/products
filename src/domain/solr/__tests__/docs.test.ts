import { describe, expect, it } from "vitest"
import { latestProductDocs } from "../docs"

describe("latestProductDocs", () => {
  it("keeps the newest Solr document for each product id", () => {
    const docs = latestProductDocs([
      { productId: "P1", mainImageUrl: null, _version_: 10 },
      { productId: "P2", mainImageUrl: "http://p2", _version_: 20 },
      { productId: "P1", mainImageUrl: "http://p1", _version_: 30 }
    ])

    expect(docs).toEqual([
      { productId: "P1", mainImageUrl: "http://p1", _version_: 30 },
      { productId: "P2", mainImageUrl: "http://p2", _version_: 20 }
    ])
  })
})
