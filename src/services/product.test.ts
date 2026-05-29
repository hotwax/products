import { beforeEach, describe, expect, it, vi } from "vitest"

import { fetchAllProductSearchDocuments, getProductAssocTypes, getProductDetail, searchProducts } from "./product"
import { buildAssocTypeCatalog } from "@/utils/productAssocTypes"

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  runSolrQuery: vi.fn(),
  searchSolrProducts: vi.fn()
}))

vi.mock("@common", () => ({
  api: mocks.api,
  useSolrSearch: () => ({
    runSolrQuery: mocks.runSolrQuery,
    searchProducts: mocks.searchSolrProducts
  })
}))

describe("searchProducts", () => {
  beforeEach(() => {
    mocks.searchSolrProducts.mockReset()
  })

  it("queries Solr directly for exact product ID and SKU searches", async () => {
    mocks.searchSolrProducts.mockResolvedValueOnce({
      products: [
        {
          productId: "MH09-XS-Blue-01",
          productName: "Blue Tee",
          productTypeId: "FINISHED_GOOD",
          isVariant: true
        }
      ],
      total: 1
    })

    const result = await searchProducts({
      queryString: "MH09-XS-Blue-01",
      productTypeId: "FINISHED_GOOD",
      productKind: "All",
      productStoreId: "All",
      pageSize: 25,
      pageIndex: 0
    })

    expect(mocks.searchSolrProducts).toHaveBeenCalledWith({
      keyword: "MH09-XS-Blue-01",
      viewSize: 25,
      viewIndex: 0,
      filters: {
        productTypeId: { value: "FINISHED_GOOD" },
        isVirtual: { value: [true, false], op: "OR" }
      }
    })
    expect(result.total).toBe(1)
    expect(result.products[0]).toMatchObject({
      productId: "MH09-XS-Blue-01",
      productName: "Blue Tee",
      productTypeId: "FINISHED_GOOD",
      isVariant: true
    })
  })

  it("passes an explicitly selected store filter to Solr", async () => {
    mocks.searchSolrProducts.mockResolvedValueOnce({ products: [], total: 0 })

    await searchProducts({
      queryString: "MH09",
      productTypeId: "FINISHED_GOOD",
      productKind: "All",
      productStoreId: "STORE_A",
      pageSize: 10,
      pageIndex: 2
    })

    expect(mocks.searchSolrProducts).toHaveBeenCalledWith({
      keyword: "MH09",
      viewSize: 10,
      viewIndex: 2,
      filters: {
        productTypeId: { value: "FINISHED_GOOD" },
        productStoreId: { value: "STORE_A" },
        isVirtual: { value: [true, false], op: "OR" }
      }
    })
  })

  it("passes store filters to Solr for unsearched browse results", async () => {
    mocks.searchSolrProducts.mockResolvedValueOnce({ products: [], total: 0 })

    await searchProducts({
      productTypeId: "All",
      productKind: "Virtuals",
      productStoreId: "STORE_A",
      pageSize: 10,
      pageIndex: 2
    })

    expect(mocks.searchSolrProducts).toHaveBeenCalledWith({
      keyword: undefined,
      viewSize: 10,
      viewIndex: 2,
      filters: {
        productStoreId: { value: "STORE_A" },
        isVirtual: { value: true }
      }
    })
  })
})

describe("fetchAllProductSearchDocuments", () => {
  beforeEach(() => {
    mocks.api.mockReset()
  })

  it("fetches every Solr product page and normalizes the results", async () => {
    mocks.api
      .mockResolvedValueOnce({
        data: {
          count: 3,
          docs: [
            { productId: "SKU-1", productName: "First", productTypeId: "FINISHED_GOOD", isVariant: "Y" },
            { productId: "SKU-2", productName: "Second", productTypeId: "FINISHED_GOOD", isVirtual: "Y" }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          count: 3,
          docs: [
            { productId: "SKU-3", productName: "Third", productTypeId: "FINISHED_GOOD" }
          ]
        }
      })

    const products = await fetchAllProductSearchDocuments(2)

    expect(mocks.api).toHaveBeenCalledTimes(2)
    expect(mocks.api.mock.calls[0][0].data).toMatchObject({ dataDocumentId: "OmsProduct", pageSize: 2, pageIndex: 0 })
    expect(mocks.api.mock.calls[1][0].data).toMatchObject({ dataDocumentId: "OmsProduct", pageSize: 2, pageIndex: 1 })
    expect(products.map((product) => product.productId)).toEqual(["SKU-1", "SKU-2", "SKU-3"])
    expect(products[0].isVariant).toBe(true)
    expect(products[1].isVirtual).toBe(true)
  })
})

describe("getProductAssocTypes", () => {
  beforeEach(() => {
    mocks.api.mockReset()
  })

  it("hits the OmsProductAssocType data document and normalizes the response", async () => {
    mocks.api.mockResolvedValueOnce({
      data: {
        docs: [
          { productAssocTypeId: "PRODUCT_COMPLEMENT", description: "Complementary or Cross-Sell", parentTypeId: "", parentDescription: "" },
          { productAssocTypeId: "MANUF_COMPONENT", description: "Manufacturing Bill of Materials", parentTypeId: "PRODUCT_COMPONENT", parentDescription: "Actual Product Component" },
          { productAssocTypeId: "", description: "junk row" }
        ],
        count: 3
      }
    })

    const rows = await getProductAssocTypes()

    expect(mocks.api).toHaveBeenCalledWith(expect.objectContaining({
      url: "oms/dataDocumentView",
      method: "post",
      data: expect.objectContaining({ dataDocumentId: "OmsProductAssocType" })
    }))
    expect(rows).toEqual([
      { productAssocTypeId: "PRODUCT_COMPLEMENT", description: "Complementary or Cross-Sell", parentTypeId: "", parentDescription: "" },
      { productAssocTypeId: "MANUF_COMPONENT", description: "Manufacturing Bill of Materials", parentTypeId: "PRODUCT_COMPONENT", parentDescription: "Actual Product Component" }
    ])
  })

  it("builds the association type catalog from OMS rows only", () => {
    const catalog = buildAssocTypeCatalog([
      { productAssocTypeId: "PRODUCT_COMPLEMENT", description: "Complementary or Cross-Sell", parentTypeId: "", parentDescription: "" },
      { productAssocTypeId: "MANUF_COMPONENT", description: "Manufacturing Bill of Materials", parentTypeId: "PRODUCT_COMPONENT", parentDescription: "Actual Product Component" }
    ])

    expect(catalog.map((entry) => entry.typeId)).toEqual(["PRODUCT_COMPLEMENT", "MANUF_COMPONENT"])
    const complement = catalog.find((entry) => entry.typeId === "PRODUCT_COMPLEMENT")!
    expect(complement.label).toBe("Complementary or Cross-Sell")
    expect(complement.description).toBe("Complementary or Cross-Sell")

    const component = catalog.find((entry) => entry.typeId === "MANUF_COMPONENT")!
    expect(component.parentTypeId).toBe("PRODUCT_COMPONENT")
    expect(component.supportsBom).toBe(true)
  })
})

describe("getProductDetail", () => {
  beforeEach(() => {
    mocks.api.mockReset()
  })

  it("joins product category membership to catalog and product store lookup documents", async () => {
    mocks.api.mockImplementation((request) => {
      if(request.url === "oms/products/SKU-1") {
        return Promise.resolve({ data: { productId: "SKU-1", productName: "Mapped product", productTypeId: "FINISHED_GOOD" } })
      }
      if(request.url === "admin/entityAuditLogs") {
        return Promise.resolve({ data: [] })
      }
      if(request.url === "admin/goodIdentifications" || request.url === "performFind") {
        return Promise.resolve({ data: [] })
      }
      if(request.data?.dataDocumentId === "ProductsProductAssociations") {
        return Promise.resolve({ data: { docs: [], count: 0 } })
      }
      if(request.data?.dataDocumentId === "ProductsProductCategoryMembers") {
        return Promise.resolve({
          data: {
            docs: [
              { productId: "SKU-1", productCategoryId: "CAT-A", fromDate: "2026-01-01 00:00:00.000" }
            ],
            count: 1
          }
        })
      }
      if(request.data?.dataDocumentId === "ProductsCatalogCategoryLookup") {
        return Promise.resolve({
          data: {
            docs: [
              {
                prodCatalogId: "CATALOG-A",
                catalogName: "Main Catalog",
                productCategoryId: "CAT-A",
                categoryName: "Shirts",
                prodCatalogCategoryTypeId: "PCCT_BROWSE_ROOT",
                categoryTypeDescription: "Browse Root"
              }
            ],
            count: 1
          }
        })
      }
      if(request.data?.dataDocumentId === "ProductsProductStoreCatalogLookup") {
        return Promise.resolve({
          data: {
            docs: [
              {
                productStoreId: "STORE-A",
                storeName: "US Store",
                prodCatalogId: "CATALOG-A",
                catalogName: "Main Catalog"
              }
            ],
            count: 1
          }
        })
      }

      return Promise.resolve({ data: [] })
    })

    const detail = await getProductDetail("SKU-1")

    expect(mocks.api).not.toHaveBeenCalledWith(expect.objectContaining({ url: "oms/products/SKU-1/variants" }))
    expect(detail.relationships).toEqual([])
    expect(detail.storeCatalogs).toMatchObject([
      {
        productStoreId: "STORE-A",
        storeName: "US Store",
        prodCatalogId: "CATALOG-A",
        catalogName: "Main Catalog",
        productCategoryId: "CAT-A",
        categoryName: "Shirts",
        categoryTypeId: "PCCT_BROWSE_ROOT",
        categoryTypeDescription: "Browse Root",
        status: "Active"
      }
    ])
  })

  it("normalizes relationships only from the ProductAssoc data document", async () => {
    mocks.api.mockImplementation((request) => {
      if(request.url === "oms/products/SKU-1") {
        return Promise.resolve({ data: { productId: "SKU-1", productName: "Mapped product", productTypeId: "FINISHED_GOOD" } })
      }
      if(request.url === "admin/entityAuditLogs") {
        return Promise.resolve({ data: [] })
      }
      if(request.url === "admin/goodIdentifications" || request.url === "performFind") {
        return Promise.resolve({ data: [] })
      }
      if(request.data?.dataDocumentId === "ProductsProductAssociations" && request.data.customParametersMap?.productId === "SKU-1") {
        return Promise.resolve({
          data: {
            docs: [
              {
                productId: "SKU-1",
                productIdTo: "SKU-2",
                productAssocTypeId: "PRODUCT_VARIANT",
                sequenceNum: 1,
                assocProductName: "Variant product",
                assocProductTypeId: "FINISHED_GOOD"
              }
            ],
            count: 1
          }
        })
      }
      if(request.data?.dataDocumentId === "ProductsProductAssociations") {
        return Promise.resolve({ data: { docs: [], count: 0 } })
      }
      if(request.data?.dataDocumentId === "ProductsProductCategoryMembers") {
        return Promise.resolve({ data: { docs: [], count: 0 } })
      }

      return Promise.resolve({ data: [] })
    })

    const detail = await getProductDetail("SKU-1")

    expect(detail.relationships).toMatchObject([
      {
        typeId: "PRODUCT_VARIANT",
        relatedProductId: "SKU-2",
        relatedName: "Variant product",
        direction: "outgoing",
        sequenceNum: "1"
      }
    ])
    expect(mocks.api).not.toHaveBeenCalledWith(expect.objectContaining({ url: "oms/products/SKU-1/variants" }))
  })

  it("loads product history from EntityAuditLog", async () => {
    mocks.api.mockImplementation((request) => {
      if(request.url === "oms/products/SKU-1") {
        return Promise.resolve({ data: { productId: "SKU-1", productName: "Mapped product", productTypeId: "FINISHED_GOOD" } })
      }
      if(request.url === "admin/entityAuditLogs") {
        return Promise.resolve({
          data: {
            entityValueList: [
              {
                changedEntityName: "org.apache.ofbiz.product.product.Product",
                pkPrimaryValue: "SKU-1",
                changedFieldName: "productName",
                oldValueText: "Old shirt",
                newValueText: "New shirt",
                changedByUserId: "hotwax.user",
                changedDate: "2026-05-29 10:00:00.000"
              }
            ]
          }
        })
      }
      if(request.url === "admin/goodIdentifications" || request.url === "performFind") {
        return Promise.resolve({ data: [] })
      }
      if(request.data?.dataDocumentId === "ProductsProductAssociations") {
        return Promise.resolve({ data: { docs: [], count: 0 } })
      }
      if(request.data?.dataDocumentId === "ProductsProductCategoryMembers") {
        return Promise.resolve({ data: { docs: [], count: 0 } })
      }

      return Promise.resolve({ data: [] })
    })

    const detail = await getProductDetail("SKU-1")

    expect(mocks.api).toHaveBeenCalledWith(expect.objectContaining({
      url: "admin/entityAuditLogs",
      method: "get",
      params: expect.objectContaining({
        changedEntityName: "org.apache.ofbiz.product.product.Product",
        pkPrimaryValue: "SKU-1",
        orderByField: "-changedDate"
      })
    }))
    expect(detail.histories).toMatchObject([
      {
        source: "productName",
        status: "Changed by hotwax.user",
        message: "Previous value: Old shirt · New value: New shirt",
        productId: "SKU-1"
      }
    ])
  })
})
