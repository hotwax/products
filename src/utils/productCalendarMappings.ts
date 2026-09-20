import { buildAppUrl } from "@common"

export const PRODUCT_CALENDAR_MAPPING_TYPE = "SHOPIFY_PRODUCT_CALENDAR_DATE"

type ShopifyShop = { shopId?: unknown }
type ShopifyTypeMapping = {
  shopId?: unknown
  mappedTypeId?: unknown
  mappedValue?: unknown
}

function stableShopIds(shops: ShopifyShop[]) {
  return [...new Set(shops
    .map((shop) => String(shop.shopId ?? "").trim())
    .filter(Boolean))]
    .sort()
}

export function getActiveCalendarMappings(shops: ShopifyShop[], mappings: ShopifyTypeMapping[]) {
  const shopIds = new Set(stableShopIds(shops))

  return mappings.filter((mapping) => (
    mapping.mappedTypeId === PRODUCT_CALENDAR_MAPPING_TYPE
    && shopIds.has(String(mapping.shopId ?? "").trim())
    && Boolean(String(mapping.mappedValue ?? "").trim())
  ))
}

export function getCalendarMappingManagementHref(shops: ShopifyShop[]) {
  const shopId = stableShopIds(shops)[0]
  if (!shopId) return null

  return buildAppUrl("company", `/shopify-connection-details/${encodeURIComponent(shopId)}/product-sync`)
}
