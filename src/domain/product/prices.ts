import type { ProductPrice } from "../types/product"

/** A ProductPrice belongs to a ProductStoreGroup (there is no per-store field on the record), so a
 *  store's price is the one for its primary store group in the store's currency. */
export interface PriceContext {
  currencyUomId: string
  productStoreGroupId: string
}

/** The Shopify connector reads and writes prices with the PURCHASE purpose. LISTING is what this app
 *  used to save, so both count as the store's price and PURCHASE is what new prices get. */
export const DEFAULT_PRICE_PURPOSE = "PURCHASE"
const PRICE_PURPOSES = [DEFAULT_PRICE_PURPOSE, "LISTING"]

/** HotWax's own price types (the children of HC_PROD_PRICE_TYPE). They always get a field, and any other
 *  type a product carries is added next to them. The backend has no price type list to read yet. */
export const SUPPORTED_PRICE_TYPES = ["DEFAULT_PRICE", "LIST_PRICE", "WHOLESALE_PRICE"]

const PRICE_TYPE_LABELS: Record<string, string> = {
  DEFAULT_PRICE: "Default price",
  LIST_PRICE: "List price",
  WHOLESALE_PRICE: "Wholesale price"
}

export function priceTypeLabel(productPriceTypeId: string): string {
  if(PRICE_TYPE_LABELS[productPriceTypeId]) {return PRICE_TYPE_LABELS[productPriceTypeId]}

  const words = productPriceTypeId.toLowerCase().split("_").filter(Boolean).join(" ")

  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function priceTypesFor(prices: ProductPrice[]): string[] {
  const extraTypes = prices
    .map((price) => price.productPriceTypeId)
    .filter((type, index, all) => type && !SUPPORTED_PRICE_TYPES.includes(type) && all.indexOf(type) === index)

  return [...SUPPORTED_PRICE_TYPES, ...extraTypes]
}

export function priceMatchesContext(price: ProductPrice, context: PriceContext): boolean {
  return price.currencyUomId === context.currencyUomId &&
    price.productStoreGroupId === context.productStoreGroupId &&
    PRICE_PURPOSES.includes(price.productPricePurposeId || DEFAULT_PRICE_PURPOSE)
}

export function activePricesForTypeContext(prices: ProductPrice[], productPriceTypeId: string, context: PriceContext): ProductPrice[] {
  return prices.filter((price) => price.active &&
    price.productPriceTypeId === productPriceTypeId &&
    priceMatchesContext(price, context))
}

export function activePriceForTypeContext(prices: ProductPrice[], productPriceTypeId: string, context: PriceContext): ProductPrice | undefined {
  return activePricesForTypeContext(prices, productPriceTypeId, context)
    .slice()
    .sort((a, b) => priceDateMs(b.fromDate) - priceDateMs(a.fromDate))[0]
}

/** A price that replaces existing ones keeps their purpose, so the connector keeps finding it. */
export function purposeForNewPrice(replacedPrices: ProductPrice[]): string {
  const newest = replacedPrices.slice().sort((a, b) => priceDateMs(b.fromDate) - priceDateMs(a.fromDate))[0]

  return newest?.productPricePurposeId || DEFAULT_PRICE_PURPOSE
}

function priceDateMs(value: string): number {
  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : 0
}
