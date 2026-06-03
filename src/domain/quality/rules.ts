import type { QualityRule } from "../types/quality"

/** The data-quality rule registry — the single source for BOTH data-fix pages.
 *
 *  Contract: a `unique-field` rule appears as a segment on the Duplicate identifiers page;
 *  a `required-field` rule appears as a coverage tile (and drill-down) on the Missing values page.
 *  Adding a rule here is all it takes — the pages render from this list. Scope controls which
 *  slice of the catalog the rule applies to (UPC only makes sense per-variant, etc.). */
export const QUALITY_RULES: QualityRule[] = [
  {
    id: "unique-sku",
    label: "SKU",
    description: "Each product should have a unique SKU",
    kind: "unique-field",
    scope: "all",
    solrField: "sku",
    resolution: { target: "goodIdentification", goodIdentificationTypeId: "SKU" }
  },
  {
    id: "unique-upc",
    label: "UPC",
    description: "Each variant should have a unique UPC",
    kind: "unique-field",
    scope: "variants",
    solrField: "upc",
    resolution: { target: "goodIdentification", goodIdentificationTypeId: "UPCA" }
  },
  {
    id: "required-upc",
    label: "UPC",
    description: "Variants without a UPC",
    kind: "required-field",
    scope: "variants",
    solrField: "upc",
    resolution: { target: "goodIdentification", goodIdentificationTypeId: "UPCA" }
  },
  {
    id: "required-sku",
    label: "SKU",
    description: "Products without a SKU",
    kind: "required-field",
    scope: "all",
    solrField: "sku",
    resolution: { target: "goodIdentification", goodIdentificationTypeId: "SKU" }
  },
  {
    id: "required-image",
    label: "Image",
    description: "Products without an image",
    kind: "required-field",
    scope: "all",
    solrField: "mainImageUrl",
    resolution: { target: "productField", productField: "smallImageUrl" }
  },
  {
    id: "required-brand",
    label: "Brand",
    description: "Products without a brand name",
    kind: "required-field",
    scope: "all",
    solrField: "brandName",
    resolution: { target: "productField", productField: "brandName" }
  },
  {
    id: "required-primary-category",
    label: "Primary category",
    description: "Products without a primary category",
    kind: "required-field",
    scope: "all",
    solrField: "primaryProductCategoryId",
    resolution: { target: "productField", productField: "primaryProductCategoryId" }
  },
  {
    id: "required-tags",
    label: "Tags",
    description: "Products without tags",
    kind: "required-field",
    scope: "all",
    solrField: "tags"
  }
]

export function ruleById(ruleId: string): QualityRule | undefined {
  return QUALITY_RULES.find((rule) => rule.id === ruleId)
}

export function rulesByKind(kind: QualityRule["kind"]): QualityRule[] {
  return QUALITY_RULES.filter((rule) => rule.kind === kind)
}

/** "Look up another field" support: a transient rule flowing through the same engine/queries. */
export function adHocRequiredRule(solrField: string): QualityRule {
  const field = solrField.trim().replace(/[^A-Za-z0-9_]/g, "")

  return {
    id: `adhoc:${field}`,
    label: field,
    description: `Products without ${field}`,
    kind: "required-field",
    scope: "all",
    solrField: field
  }
}
