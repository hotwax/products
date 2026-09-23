import { request, responseList } from "./http"
import { PRODUCT_CALENDAR_MAPPING_TYPE } from "@/utils/productCalendarMappings"

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
