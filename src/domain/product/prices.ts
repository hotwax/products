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
    price.currencyUomId === context.currencyUomId &&
    (price.productPricePurposeId || "LISTING") === context.productPricePurposeId &&
    price.productStoreId === context.productStoreId &&
    price.productStoreGroupId === context.productStoreGroupId)
}
