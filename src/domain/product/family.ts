import type { ProductAssociation, ProductFeatureApplication, ProductSummary } from "../types/product"

/** Family navigation model (pattern borrowed from the preorder audit detail page):
 *  the detail route always anchors on the PARENT with the variant carried as ?variantId=,
 *  so users land in family context and can jump between siblings instantly. */

export interface FamilyRoute {
  path: string
  query?: { variantId: string }
}

/** Where a product row should navigate: variants open their parent with themselves pre-selected. */
export function familyRouteFor(product: Pick<ProductSummary, "productId" | "isVariant" | "parentProductId">): FamilyRoute {
  if(product.isVariant && product.parentProductId) {
    return { path: `/products/${product.parentProductId}`, query: { variantId: product.productId } }
  }

  return { path: `/products/${product.productId}` }
}

export interface FamilyVariant {
  productId: string
  name: string
  sku: string
  imageUrl: string
  sequenceNum: number | null
}

/** The parent's active variant links → the strip the user jumps around with. */
export function familyVariants(parentAssociations: ProductAssociation[]): FamilyVariant[] {
  return parentAssociations
    .filter((assoc) => assoc.direction === "outgoing" && assoc.productAssocTypeId === "PRODUCT_VARIANT" && assoc.active)
    .map((assoc) => ({
      productId: assoc.relatedProductId,
      name: assoc.relatedName || assoc.relatedProductId,
      sku: assoc.relatedSku,
      imageUrl: assoc.relatedImageUrl,
      sequenceNum: assoc.sequenceNum
    }))
    .sort((a, b) => (a.sequenceNum ?? 0) - (b.sequenceNum ?? 0) || a.name.localeCompare(b.name))
}

/** Feature-value selection per axis for a variant, e.g. { COLOR: "F_RED", SIZE: "F_M" }. */
export function featureSelectionOf(applications: ProductFeatureApplication[]): Record<string, string> {
  const selection: Record<string, string> = {}
  for(const appl of applications) {
    if(appl.active && appl.featureTypeId) {selection[appl.featureTypeId] = appl.productFeatureId}
  }

  return selection
}

/** Preorder-style combo matching: prefer the variant matching the full selection; otherwise fall
 *  back to the first variant that at least carries the just-changed axis value. Returns null when
 *  nothing in the family carries that value. */
export function variantForFeatureSelection(
  variantFeatureSelections: Map<string, Record<string, string>>,
  desiredSelection: Record<string, string>,
  changedAxis: string
): string | null {
  let partialMatch: string | null = null
  for(const [variantId, selection] of variantFeatureSelections) {
    const axes = Object.keys(desiredSelection)
    if(axes.every((axis) => selection[axis] === desiredSelection[axis])) {return variantId}
    if(partialMatch === null && selection[changedAxis] === desiredSelection[changedAxis]) {partialMatch = variantId}
  }

  return partialMatch
}
