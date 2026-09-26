import { PRODUCT_CALENDAR_MAPPING_TYPE } from "@/utils/productCalendarMappings"
import { request, responseList } from "./http"

export interface ProductCalendarPage {
  calendarRows: Record<string, unknown>[]
  totalCount: number
  pageIndex: number
  pageSize: number
}

export async function fetchProductCalendar(
  productStoreId: string,
  pageIndex = 0,
  pageSize = 50,
  keyword = ""
): Promise<ProductCalendarPage> {
  if(!productStoreId) {return { calendarRows: [], totalCount: 0, pageIndex, pageSize }}

  const response = await request({
    url: "oms/productStoreProductCalendar",
    method: "get",
    params: {
      productStoreId,
      pageIndex,
      pageSize,
      keyword: keyword.trim()
    }
  })
  const data = response && typeof response === "object" && !Array.isArray(response)
    ? response as Record<string, unknown>
    : {}
  const calendarRows = Array.isArray(data.calendarRows)
    ? data.calendarRows as Record<string, unknown>[]
    : responseList(response)

  return {
    calendarRows,
    totalCount: Number(data.totalCount ?? calendarRows.length),
    pageIndex: Number(data.pageIndex ?? pageIndex),
    pageSize: Number(data.pageSize ?? pageSize)
  }
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
