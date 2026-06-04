import type {
  AssociationCreate, AssociationKey, AssociationUpdate, DedupChange, FeatureApply, FeatureCreate,
  IdentificationCreate, IdentificationKey, ProductFieldsPatch
} from "@/domain/types/pim"
import { request, responseList } from "./http"

/** All calls against the oms component (/rest/s1/oms/...) — writes plus the reference reads it owns. */

type Raw = Record<string, unknown>

// ---------- product ----------
export function fetchProductRecord(productId: string): Promise<Raw> {
  return request<Raw>({ url: `oms/products/${productId}`, method: "get" })
}

export function updateProductFields(productId: string, patch: ProductFieldsPatch): Promise<unknown> {
  return request({ url: `oms/products/${productId}`, method: "put", data: patch })
}

// ---------- identifications ----------
export function fetchIdentifications(productId: string): Promise<Raw[]> {
  return request({ url: `oms/products/${productId}/identifications`, method: "get", params: { pageSize: 200 } }).then(responseList)
}

export function createIdentification(productId: string, payload: IdentificationCreate): Promise<unknown> {
  return request({ url: `oms/products/${productId}/identifications`, method: "post", data: payload })
}

export function updateIdentification(productId: string, key: IdentificationKey, idValue: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/identifications`, method: "put", data: { ...key, idValue } })
}

export function expireIdentification(productId: string, key: IdentificationKey): Promise<unknown> {
  return request({ url: `oms/products/${productId}/identifications/expire`, method: "post", data: key })
}

// ---------- associations ----------
export function fetchAssociations(productId: string): Promise<Raw[]> {
  return request({ url: `oms/products/${productId}/associations`, method: "get", params: { pageSize: 500 } }).then(responseList)
}

export function createAssociation(productId: string, payload: AssociationCreate): Promise<unknown> {
  return request({ url: `oms/products/${productId}/associations`, method: "post", data: payload })
}

export function updateAssociation(productId: string, payload: AssociationUpdate): Promise<unknown> {
  return request({ url: `oms/products/${productId}/associations`, method: "put", data: payload })
}

export function expireAssociation(productId: string, key: AssociationKey, thruDate?: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/associations/expire`, method: "post", data: { ...key, thruDate } })
}

export function reactivateAssociation(productId: string, key: AssociationKey): Promise<unknown> {
  return request({ url: `oms/products/${productId}/associations/reactivate`, method: "post", data: key })
}

export function resequenceAssociations(productId: string, items: (AssociationKey & { sequenceNum: number })[]): Promise<unknown> {
  return request({ url: `oms/products/${productId}/associations/resequence`, method: "post", data: { items } })
}

// ---------- features ----------
export function fetchFeatureApplications(productId: string): Promise<Raw[]> {
  return request({ url: `oms/products/${productId}/features`, method: "get", params: { pageSize: 500 } }).then(responseList)
}

export function applyFeature(productId: string, payload: FeatureApply): Promise<unknown> {
  return request({ url: `oms/products/${productId}/features`, method: "post", data: payload })
}

export function removeFeatureApplication(productId: string, productFeatureId: string, fromDate: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/features/remove`, method: "post", data: { productFeatureId, fromDate } })
}

export function createFeature(payload: FeatureCreate): Promise<{ productFeatureId: string }> {
  return request({ url: "oms/features", method: "post", data: payload })
}

// ---------- reference catalogs ----------
export function fetchFeatureCatalog(): Promise<Raw[]> {
  return request({ url: "oms/features", method: "get", params: { pageSize: 500, orderByField: "description" } }).then(responseList)
}

export function fetchCatalogList(resource: "productTypes" | "featureTypes" | "featureApplTypes" | "associationTypes" | "identificationTypes" | "boxTypes"): Promise<Raw[]> {
  return request({ url: `oms/${resource}`, method: "get", params: { pageSize: 200 } }).then(responseList)
}

/** Units of measure of a given type (UT_LENGTH_MEASURE, UT_WEIGHT_MEASURE). */
export function fetchUoms(uomTypeEnumId: string): Promise<Raw[]> {
  return request({ url: "oms/uoms", method: "get", params: { uomTypeEnumId, pageSize: 200 } }).then(responseList)
}

// ---------- data quality ----------
export function resolveDuplicateIdentifiers(changes: DedupChange[]): Promise<{ updatedCount: number }> {
  return request({ url: "oms/dedup/resolveIdentifiers", method: "post", data: { changes } })
}

// ---------- index ----------
export function reindexProducts(productIds?: string[]): Promise<{ indexedCount: number }> {
  return request({ url: "oms/reindex", method: "post", data: productIds?.length ? { productIds } : {} })
}

export interface PimIndexStatus {
  solrUrl: string
  core: string
  reachable: boolean
  documentCount: number | null
  productCount: number | null
}

export function fetchIndexStatus(): Promise<PimIndexStatus> {
  return request({ url: "oms/indexStatus", method: "get" })
}
