import { describe, expect, it } from "vitest"
import { parseTagFacets } from "../products"

describe("parseTagFacets", () => {
  it("parses traditional Solr facet_fields array format with alternating names and counts", () => {
    const response = {
      facet_counts: {
        facet_fields: {
          tags: ["Summer", 42, "Casual", 18, "Cotton", 7]
        }
      }
    }
    const facets = parseTagFacets(response)
    expect(facets).toEqual([
      { value: "Summer", count: 42 },
      { value: "Casual", count: 18 },
      { value: "Cotton", count: 7 }
    ])
  })

  it("parses traditional Solr facet_fields when nested in response envelope", () => {
    const response = {
      response: {
        facet_counts: {
          facet_fields: {
            tags: ["Vintage", 5]
          }
        }
      }
    }
    const facets = parseTagFacets(response)
    expect(facets).toEqual([
      { value: "Vintage", count: 5 }
    ])
  })

  it("parses JSON Facet API terms bucket format when available", () => {
    const response = {
      facets: {
        tags: {
          buckets: [
            { val: "Shirts", count: 10 },
            { val: "Pants", count: 4 }
          ]
        }
      }
    }
    const facets = parseTagFacets(response)
    expect(facets).toEqual([
      { value: "Shirts", count: 10 },
      { value: "Pants", count: 4 }
    ])
  })

  it("returns empty array for empty or missing facet structures", () => {
    expect(parseTagFacets(null)).toEqual([])
    expect(parseTagFacets({})).toEqual([])
    expect(parseTagFacets({ facets: {} })).toEqual([])
  })
})
