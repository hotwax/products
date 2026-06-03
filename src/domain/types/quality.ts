import type { ProductSummary } from "./product"

/** Declarative data-quality rule. Both data-fix pages render from the rule registry —
 *  adding a rule is appending one object, never a new page. */
export type QualityScope = "all" | "variants" | "virtuals"
export type QualityRuleKind = "unique-field" | "required-field"

export interface QualityResolution {
  target: "goodIdentification" | "productField"
  /** for unique-field identifier rules, e.g. "SKU" | "UPCA" */
  goodIdentificationTypeId?: string
  /** for required-field rules fixed by patching a product field */
  productField?: string
}

export interface QualityRule {
  id: string
  /** i18n-ready short label, e.g. "SKU" */
  label: string
  /** i18n-ready hint shown on tiles/segments */
  description: string
  kind: QualityRuleKind
  scope: QualityScope
  /** the PIM Solr field the rule checks */
  solrField: string
  resolution?: QualityResolution
}

export interface RuleCoverage {
  ruleId: string
  eligibleTotal: number
  missing: number
  pctComplete: number
}

export interface DuplicateGroup {
  ruleId: string
  value: string
  products: ProductSummary[]
}

/** One pending edit inside the resolve-duplicates modal. */
export interface DuplicateDraft {
  productId: string
  original: string
  value: string
}
