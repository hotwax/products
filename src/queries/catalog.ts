import { queryOptions } from "@tanstack/vue-query"
import { fetchCatalogList } from "@/api/pim"
import { fetchImportHistories, fetchProductStores } from "@/api/catalog"
import { normalizeCatalogOption } from "@/domain/normalize/identification"
import { normalizeImportEntry } from "@/domain/normalize/history"
import type { CatalogOption } from "@/domain/types/product"
import { qk } from "./keys"

/** Reference data: effectively immutable per session → staleTime Infinity, explicit refresh only. */

function catalogListOptions(resource: Parameters<typeof fetchCatalogList>[0], idField: string) {
  return queryOptions({
    queryKey: qk.catalog.list(resource),
    queryFn: async (): Promise<CatalogOption[]> =>
      (await fetchCatalogList(resource)).map((row) => normalizeCatalogOption(row, idField)),
    staleTime: Infinity
  })
}

export const productTypesOptions = () => catalogListOptions("productTypes", "productTypeId")
export const featureTypesOptions = () => catalogListOptions("featureTypes", "productFeatureTypeId")
export const featureApplTypesOptions = () => catalogListOptions("featureApplTypes", "productFeatureApplTypeId")
export const associationTypesOptions = () => catalogListOptions("associationTypes", "productAssocTypeId")
export const identificationTypesOptions = () => catalogListOptions("identificationTypes", "goodIdentificationTypeId")
export const boxTypesOptions = () => catalogListOptions("boxTypes", "shipmentBoxTypeId")

export function productStoresOptions() {
  return queryOptions({
    queryKey: qk.catalog.list("productStores"),
    queryFn: async (): Promise<CatalogOption[]> =>
      (await fetchProductStores()).map((row) => ({
        id: String(row.productStoreId ?? ""),
        label: String(row.storeName ?? row.productStoreId ?? "")
      })),
    staleTime: Infinity
  })
}

export function importHistoryOptions() {
  return queryOptions({
    queryKey: qk.imports,
    queryFn: async () => (await fetchImportHistories()).map(normalizeImportEntry)
  })
}
