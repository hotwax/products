import { infiniteQueryOptions } from "@tanstack/vue-query"
import { fetchProductCalendar } from "@/api/productCalendar"
import { qk } from "./keys"

const PRODUCT_CALENDAR_PAGE_SIZE = 50

export function productCalendarOptions(productStoreId: string, keyword: string) {
  const normalizedKeyword = keyword.trim()

  return infiniteQueryOptions({
    queryKey: qk.productCalendar.search(productStoreId, normalizedKeyword),
    enabled: Boolean(productStoreId),
    queryFn: ({ pageParam }) => fetchProductCalendar(
      productStoreId,
      pageParam,
      PRODUCT_CALENDAR_PAGE_SIZE,
      normalizedKeyword
    ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.calendarRows.length, 0)

      return loaded < lastPage.totalCount ? pages.length : undefined
    }
  })
}
