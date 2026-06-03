import type { PresellState } from "../types/product"

/** Presell classification. The canonical signal is catalog-category membership
 *  (PCCT_PREORDR / PCCT_BACKORDER); the merchandising tags (HC:Pre-Order / HC:Backorder) are the
 *  fallback this catalog currently carries. Both paths kept so the tag fallback can be dropped
 *  once category data is indexed. */
export const PRESELL_CATEGORY = {
  preorder: "PCCT_PREORDR",
  backorder: "PCCT_BACKORDER"
} as const

export const PRESELL_TAG = {
  preorder: "HC:Pre-Order",
  backorder: "HC:Backorder"
} as const

export function getPresellState(product: { tags?: string[]; catalogCategoryTypeIds?: string[] }): PresellState {
  const categories = product.catalogCategoryTypeIds ?? []
  if(categories.includes(PRESELL_CATEGORY.preorder)) {return "preorder"}
  if(categories.includes(PRESELL_CATEGORY.backorder)) {return "backorder"}

  const tags = product.tags ?? []
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

const RESERVED_TAGS = new Set<string>([PRESELL_TAG.preorder, PRESELL_TAG.backorder])

export function displayableTags(tags: string[] = []): string[] {
  return tags.filter((tag) => !RESERVED_TAGS.has(tag))
}
