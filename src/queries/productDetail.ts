import { queryOptions } from "@tanstack/vue-query"
import { fetchAssociations, fetchFeatureApplications, fetchFeatureCatalog, fetchIdentifications, fetchProductRecord } from "@/api/pim"
import { fetchEntityAuditLogs } from "@/api/catalog"
import { normalizeProductCore } from "@/domain/normalize/product"
import { catalogOptionMap , normalizeIdentifications } from "@/domain/normalize/identification"
import { normalizeAssociations } from "@/domain/normalize/association"
import { featureCatalogMap, normalizeFeatureApplication } from "@/domain/normalize/feature"
import { normalizeAuditEntry } from "@/domain/normalize/history"
import { qk } from "./keys"
import { featureTypesOptions, identificationTypesOptions } from "./catalog"
import { queryClient } from "@/app/queryClient"

/** Product detail = independent parallel queries. Cards load/fail/refresh on their own; a save
 *  invalidates exactly the slice it touched. The parent/variant segment is a key swap on productId. */

export function productCoreOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.core(productId),
    queryFn: async () => normalizeProductCore(await fetchProductRecord(productId)),
    staleTime: 15_000
  })
}

export function identificationsOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.identifications(productId),
    queryFn: async () => {
      const [rows, types] = await Promise.all([
        fetchIdentifications(productId),
        queryClient.ensureQueryData(identificationTypesOptions())
      ])

      return normalizeIdentifications(rows, catalogOptionMap(types))
    }
  })
}

export function associationsOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.associations(productId),
    queryFn: async () => normalizeAssociations(await fetchAssociations(productId), productId)
  })
}

export function featureApplicationsOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.features(productId),
    queryFn: async () => {
      const [rows, catalog, types] = await Promise.all([
        fetchFeatureApplications(productId),
        queryClient.ensureQueryData(featureCatalogOptions()),
        queryClient.ensureQueryData(featureTypesOptions())
      ])
      const features = featureCatalogMap(catalog)
      const typeLabels = catalogOptionMap(types)

      return rows.map((row) => normalizeFeatureApplication(row, features, typeLabels))
    }
  })
}

export function auditHistoryOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.audit(productId),
    queryFn: async () => (await fetchEntityAuditLogs(productId)).map(normalizeAuditEntry),
    staleTime: 60_000
  })
}

/** Full ProductFeature catalog rows (raw) — shared by feature pickers and appl normalization. */
export function featureCatalogOptions() {
  return queryOptions({
    queryKey: qk.catalog.features(),
    queryFn: fetchFeatureCatalog,
    staleTime: Infinity
  })
}
