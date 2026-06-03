import type { CatalogOption, FeatureAxis, ProductFeatureApplication } from "../types/product"
import { isActive, isoDate, numberValue, textValue } from "./value"

type Raw = Record<string, unknown>

export const FEATURE_APPL_TYPE = {
  standard: "STANDARD_FEATURE",
  selectable: "SELECTABLE_FEATURE",
  distinguishing: "DISTINGUISHING_FEAT"
} as const

/** ProductFeatureAppl row joined client-side with the feature catalog → ProductFeatureApplication. */
export function normalizeFeatureApplication(
  record: Raw,
  features: Map<string, { description: string; featureTypeId: string }>,
  featureTypeLabels: Map<string, string>
): ProductFeatureApplication {
  const productFeatureId = textValue(record.productFeatureId)
  const feature = features.get(productFeatureId)
  const featureTypeId = feature?.featureTypeId ?? ""
  const fromDate = isoDate(record.fromDate) ?? ""
  const thruDate = isoDate(record.thruDate)

  return {
    productId: textValue(record.productId),
    productFeatureId,
    productFeatureApplTypeId: textValue(record.productFeatureApplTypeId),
    featureTypeId,
    featureTypeDescription: featureTypeLabels.get(featureTypeId) ?? featureTypeId,
    description: feature?.description ?? productFeatureId,
    fromDate,
    thruDate,
    active: isActive(fromDate, thruDate),
    sequenceNum: numberValue(record.sequenceNum)
  }
}

export function featureCatalogMap(records: Raw[]): Map<string, { description: string; featureTypeId: string }> {
  const map = new Map<string, { description: string; featureTypeId: string }>()
  for(const record of records) {
    map.set(textValue(record.productFeatureId), {
      description: textValue(record.description) || textValue(record.productFeatureId),
      featureTypeId: textValue(record.productFeatureTypeId)
    })
  }

  return map
}

/** Group active applications by feature type → the axes the Features section renders as chip rows. */
export function buildFeatureAxes(applications: ProductFeatureApplication[]): FeatureAxis[] {
  const byType = new Map<string, FeatureAxis>()
  for(const appl of applications) {
    if(!appl.active) {continue}
    let axis = byType.get(appl.featureTypeId)
    if(!axis) {
      axis = { featureTypeId: appl.featureTypeId, featureTypeDescription: appl.featureTypeDescription, applications: [] }
      byType.set(appl.featureTypeId, axis)
    }
    axis.applications.push(appl)
  }
  for(const axis of byType.values()) {
    axis.applications.sort((a, b) => (a.sequenceNum ?? 0) - (b.sequenceNum ?? 0) || a.description.localeCompare(b.description))
  }

  return [...byType.values()].sort((a, b) => a.featureTypeDescription.localeCompare(b.featureTypeDescription))
}

/** Options for an "add feature" picker: catalog features of a type not yet applied. */
export function availableFeatureOptions(
  catalog: Raw[],
  featureTypeId: string,
  applied: ProductFeatureApplication[]
): CatalogOption[] {
  const appliedIds = new Set(applied.filter((appl) => appl.active).map((appl) => appl.productFeatureId))

  return catalog
    .filter((record) => textValue(record.productFeatureTypeId) === featureTypeId)
    .filter((record) => !appliedIds.has(textValue(record.productFeatureId)))
    .map((record) => ({ id: textValue(record.productFeatureId), label: textValue(record.description) || textValue(record.productFeatureId) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
