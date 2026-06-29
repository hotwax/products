import type { ProductPrice } from "../types/product"

export interface PriceContext {
  currencyUomId: string
  productPricePurposeId: string
  productStoreId: string
  productStoreGroupId: string
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

export function priceMatchesContext(price: ProductPrice, context: PriceContext): boolean {
  return price.currencyUomId === context.currencyUomId &&
    (price.productPricePurposeId || "LISTING") === context.productPricePurposeId &&
    price.productStoreId === context.productStoreId &&
    price.productStoreGroupId === context.productStoreGroupId
}

function priceDateMs(value: string): number {
  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : 0
}
