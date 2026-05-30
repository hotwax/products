import type { PresellState, ProductSummary } from "@/types/product"

// The pre-order management app classifies presell state by catalog category membership
// (PCCT_PREORDR / PCCT_BACKORDER). Those category types are the canonical signal, but they
// are not always populated in the search index. As a fallback we read the merchandising tags
// (HC:Pre-Order / HC:Backorder), which are what this catalog currently carries. Keeping both
// paths here means we can drop the tag fallback once the catalog-category data lands.
export const PRESELL_CATEGORY = {
  preorder: "PCCT_PREORDR",
  backorder: "PCCT_BACKORDER"
} as const

export const PRESELL_TAG = {
  preorder: "HC:Pre-Order",
  backorder: "HC:Backorder"
} as const

export function getPresellState(product: Pick<ProductSummary, "catalogCategoryTypeIds" | "tags">): PresellState {
  const categories = product.catalogCategoryTypeIds || []
  if(categories.includes(PRESELL_CATEGORY.preorder)) {return "preorder"}
  if(categories.includes(PRESELL_CATEGORY.backorder)) {return "backorder"}

  const tags = product.tags || []
  if(tags.includes(PRESELL_TAG.preorder)) {return "preorder"}
  if(tags.includes(PRESELL_TAG.backorder)) {return "backorder"}

  return null
}

export function presellLabel(state: PresellState): string {
  if(state === "preorder") {return "Pre-order"}
  if(state === "backorder") {return "Back-order"}

  return ""
}

export function presellColor(state: PresellState): string {
  if(state === "preorder") {return "tertiary"}
  if(state === "backorder") {return "warning"}

  return "medium"
}

// Tags that already carry their own meaning elsewhere in the row, so the generic tag chips skip them.
const RESERVED_TAGS = new Set<string>([PRESELL_TAG.preorder, PRESELL_TAG.backorder])

export function displayableTags(tags: string[] = []): string[] {
  return tags.filter((tag) => !RESERVED_TAGS.has(tag))
}
