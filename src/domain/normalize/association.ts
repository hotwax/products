import type { AssociationGroups, ProductAssociation } from "../types/product"
import { isActive, isoDate, numberValue, textValue } from "./value"

type Raw = Record<string, unknown>

export const ASSOC_TYPE = {
  variant: "PRODUCT_VARIANT",
  component: "PRODUCT_COMPONENT",
  substitute: "PRODUCT_SUBSTITUTE"
} as const

/** A ProductsProductAssociations data-document row (or plain ProductAssoc record) → ProductAssociation.
 *  `viewedProductId` decides direction; related* fields describe the product on the other end. */
export function normalizeAssociation(record: Raw, viewedProductId: string): ProductAssociation {
  const productId = textValue(record.productId)
  const productIdTo = textValue(record.productIdTo)
  const direction: ProductAssociation["direction"] = productId === viewedProductId ? "outgoing" : "incoming"
  const relatedProductId = direction === "outgoing" ? productIdTo : productId
  const fromDate = isoDate(record.fromDate) ?? ""
  const thruDate = isoDate(record.thruDate)

  return {
    productId,
    productIdTo,
    productAssocTypeId: textValue(record.productAssocTypeId),
    fromDate,
    thruDate,
    active: isActive(fromDate, thruDate),
    direction,
    sequenceNum: numberValue(record.sequenceNum),
    quantity: numberValue(record.quantity),
    scrapFactor: numberValue(record.scrapFactor),
    instruction: textValue(record.instruction),
    reason: textValue(record.reason),
    relatedProductId,
    relatedName: textValue(direction === "outgoing"
      ? record.toProductName ?? record.productToName ?? record.relatedProductName
      : record.mainProductName ?? record.productName ?? record.relatedProductName),
    relatedSku: textValue(direction === "outgoing" ? record.toSku ?? record.relatedSku : record.sku ?? record.relatedSku),
    relatedImageUrl: textValue(direction === "outgoing" ? record.toImageUrl ?? record.relatedImageUrl : record.imageUrl ?? record.relatedImageUrl)
  }
}

export function normalizeAssociations(records: Raw[], viewedProductId: string): ProductAssociation[] {
  return records
    .map((record) => normalizeAssociation(record, viewedProductId))
    .sort((a, b) => (a.sequenceNum ?? 0) - (b.sequenceNum ?? 0) || a.fromDate.localeCompare(b.fromDate))
}

/** Split outgoing associations into the groups the detail page renders as cards. */
export function groupAssociations(associations: ProductAssociation[]): AssociationGroups {
  const groups: AssociationGroups = { variants: [], components: [], substitutes: [], other: [] }
  for(const assoc of associations) {
    if(assoc.direction !== "outgoing") {
      groups.other.push(assoc)
    } else if(assoc.productAssocTypeId === ASSOC_TYPE.variant) {
      groups.variants.push(assoc)
    } else if(assoc.productAssocTypeId === ASSOC_TYPE.component) {
      groups.components.push(assoc)
    } else if(assoc.productAssocTypeId === ASSOC_TYPE.substitute) {
      groups.substitutes.push(assoc)
    } else {
      groups.other.push(assoc)
    }
  }

  return groups
}

/** "expires in N days" helper for scheduled-expiry badges. null = no thruDate, 0 = expired. */
export function expiresInDays(assoc: ProductAssociation, now = Date.now()): number | null {
  if(!assoc.thruDate) {return null}
  const diff = new Date(assoc.thruDate).getTime() - now

  return diff <= 0 ? 0 : Math.ceil(diff / 86_400_000)
}
