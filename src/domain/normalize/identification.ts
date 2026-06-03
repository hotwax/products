import type { CatalogOption, ProductIdentification } from "../types/product"
import { isActive, isoDate, textValue } from "./value"

type Raw = Record<string, unknown>

export function normalizeIdentification(record: Raw, typeLabels: Map<string, string> = new Map()): ProductIdentification {
  const typeId = textValue(record.goodIdentificationTypeId)
  const fromDate = isoDate(record.fromDate) ?? ""
  const thruDate = isoDate(record.thruDate)

  return {
    productId: textValue(record.productId),
    goodIdentificationTypeId: typeId,
    typeDescription: typeLabels.get(typeId) ?? typeId,
    idValue: textValue(record.idValue),
    fromDate,
    thruDate,
    active: isActive(fromDate, thruDate)
  }
}

export function normalizeIdentifications(records: Raw[], typeLabels?: Map<string, string>): ProductIdentification[] {
  return records
    .map((record) => normalizeIdentification(record, typeLabels))
    .sort((a, b) => a.goodIdentificationTypeId.localeCompare(b.goodIdentificationTypeId) || a.fromDate.localeCompare(b.fromDate))
}

/** Pick the active value for a type (SKU, UPCA, ...), preferring the earliest active row. */
export function activeIdentificationValue(identifications: ProductIdentification[], typeId: string): string {
  const match = identifications.find((row) => row.active && row.goodIdentificationTypeId === typeId)

  return match?.idValue ?? ""
}

export function normalizeCatalogOption(record: Raw, idField: string, labelField = "description"): CatalogOption {
  const id = textValue(record[idField])

  return { id, label: textValue(record[labelField]) || id }
}

export function catalogOptionMap(options: CatalogOption[]): Map<string, string> {
  return new Map(options.map((option) => [option.id, option.label]))
}
