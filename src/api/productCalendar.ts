import { request, responseList } from "./http"

export const PRODUCT_CALENDAR_DATE_FIELDS = [
  "introductionDate",
  "releaseDate",
  "supportDiscontinuationDate",
  "salesDiscontinuationDate"
] as const

export const PRODUCT_CALENDAR_MAPPING_TYPE = "SHOPIFY_PRODUCT_CALENDAR_DATE"

export async function fetchProductCalendar(productStoreId: string) {
  if(!productStoreId) {return []}

  return responseList(await request({
    url: "oms/productStoreProductCalendar",
    method: "get",
    params: { productStoreId, pageSize: 500, orderByField: "productId" }
  }))
}

export async function fetchProductStoreShops(productStoreId: string) {
  if(!productStoreId) {return []}

  return responseList(await request({
    url: "sob/shopify/shops",
    method: "get",
    params: { productStoreId, pageSize: 200 }
  }))
}

export async function fetchProductCalendarMappings() {
  return responseList(await request({
    url: "sob/shopify/typeMappings",
    method: "get",
    params: { mappedTypeId: PRODUCT_CALENDAR_MAPPING_TYPE, pageSize: 500 }
  }))
}

export async function saveProductCalendarMapping(mapping: Record<string, unknown>) {
  if(!PRODUCT_CALENDAR_DATE_FIELDS.includes(mapping.mappedKey as typeof PRODUCT_CALENDAR_DATE_FIELDS[number])) {
    throw new Error("Unsupported product calendar field")
  }

  return request({
    url: "sob/shopify/typeMappings",
    method: "post",
    data: { ...mapping, mappedTypeId: PRODUCT_CALENDAR_MAPPING_TYPE }
  })
}
