import type {
  AssociationCreate, AssociationKey, AssociationUpdate, DedupChange, FeatureApply, FeatureCreate,
  IdentificationCreate, IdentificationKey, ProductFieldsPatch
} from "@/domain/types/pim"
import { request, responseList } from "./http"

/** All calls against the pim component (/rest/s1/pim/...) — writes plus the reference reads it owns. */

type Raw = Record<string, unknown>

// ---------- product ----------
export async function fetchProductRecord(productId: string): Promise<Raw> {
  return request<Raw>({ url: `pim/products/${productId}`, method: "get" })
}

export async function updateProductFields(productId: string, patch: ProductFieldsPatch): Promise<void> {
  await request({ url: `pim/products/${productId}`, method: "put", data: patch })
}

// ---------- identifications ----------
export async function fetchIdentifications(productId: string): Promise<Raw[]> {
  return responseList(await request({ url: `pim/products/${productId}/identifications`, method: "get", params: { pageSize: 200 } }))
}

export async function createIdentification(productId: string, payload: IdentificationCreate): Promise<void> {
  await request({ url: `pim/products/${productId}/identifications`, method: "post", data: payload })
}

export async function updateIdentification(productId: string, key: IdentificationKey, idValue: string): Promise<void> {
  await request({ url: `pim/products/${productId}/identifications`, method: "put", data: { ...key, idValue } })
}

export async function expireIdentification(productId: string, key: IdentificationKey): Promise<void> {
  await request({ url: `pim/products/${productId}/identifications/expire`, method: "post", data: key })
}

// ---------- associations ----------
export async function fetchAssociations(productId: string): Promise<Raw[]> {
  return responseList(await request({ url: `pim/products/${productId}/associations`, method: "get", params: { pageSize: 500 } }))
}

export async function createAssociation(productId: string, payload: AssociationCreate): Promise<void> {
  await request({ url: `pim/products/${productId}/associations`, method: "post", data: payload })
}

export async function updateAssociation(productId: string, payload: AssociationUpdate): Promise<void> {
  await request({ url: `pim/products/${productId}/associations`, method: "put", data: payload })
}

export async function expireAssociation(productId: string, key: AssociationKey, thruDate?: string): Promise<void> {
  await request({ url: `pim/products/${productId}/associations/expire`, method: "post", data: { ...key, thruDate } })
}

export async function reactivateAssociation(productId: string, key: AssociationKey): Promise<void> {
  await request({ url: `pim/products/${productId}/associations/reactivate`, method: "post", data: key })
}

export async function resequenceAssociations(productId: string, items: (AssociationKey & { sequenceNum: number })[]): Promise<void> {
  await request({ url: `pim/products/${productId}/associations/resequence`, method: "post", data: { items } })
}

// ---------- features ----------
export async function fetchFeatureApplications(productId: string): Promise<Raw[]> {
  return responseList(await request({ url: `pim/products/${productId}/features`, method: "get", params: { pageSize: 500 } }))
}

export async function applyFeature(productId: string, payload: FeatureApply): Promise<void> {
  await request({ url: `pim/products/${productId}/features`, method: "post", data: payload })
}

export async function removeFeatureApplication(productId: string, productFeatureId: string, fromDate: string): Promise<void> {
  await request({ url: `pim/products/${productId}/features/remove`, method: "post", data: { productFeatureId, fromDate } })
}

export async function createFeature(payload: FeatureCreate): Promise<{ productFeatureId: string }> {
  return request({ url: "pim/features", method: "post", data: payload })
}

// ---------- reference catalogs ----------
export async function fetchFeatureCatalog(): Promise<Raw[]> {
  return responseList(await request({ url: "pim/features", method: "get", params: { pageSize: 500, orderByField: "description" } }))
}

export async function fetchCatalogList(resource: "productTypes" | "featureTypes" | "featureApplTypes" | "associationTypes" | "identificationTypes" | "boxTypes"): Promise<Raw[]> {
  return responseList(await request({ url: `pim/${resource}`, method: "get", params: { pageSize: 200 } }))
}

// ---------- data quality ----------
export async function resolveDuplicateIdentifiers(changes: DedupChange[]): Promise<{ updatedCount: number }> {
  return request({ url: "pim/dedup/resolveIdentifiers", method: "post", data: { changes } })
}

// ---------- index ----------
export async function reindexProducts(productIds?: string[]): Promise<{ indexedCount: number }> {
  return request({ url: "pim/reindex", method: "post", data: productIds?.length ? { productIds } : {} })
}

export interface PimIndexStatus {
  solrUrl: string
  core: string
  reachable: boolean
  documentCount: number | null
  productCount: number | null
}

export async function fetchIndexStatus(): Promise<PimIndexStatus> {
  return request({ url: "pim/indexStatus", method: "get" })
}
