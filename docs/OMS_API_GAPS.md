# Products App OMS API Gaps

This MVP uses the live `test-oms` / `test-maarg` read APIs that are currently available. The app is intentionally scoped so lookup and detail pages work with today’s API surface, while product-management writes remain blocked until service-backed APIs exist.

## Confirmed Read Sources

- `POST /rest/s1/oms/dataDocumentView` with `dataDocumentId = OmsProduct`
  - Best first product workbench source.
  - Use the DataDocument default projection. Passing `fieldsToSelect` returned empty row objects in live probing.
- `GET /rest/s1/oms/products`
  - Direct product list fallback.
- `GET /rest/s1/oms/products/{productId}`
  - Product overview record.
- `GET /rest/s1/oms/products/{productId}/variants`
  - Variant relationship rows through `ProductAssoc` with `PRODUCT_VARIANT`.
- `GET /rest/s1/oms/products/productUpdateHistories`
  - Product sync/update history where rows exist.
- `GET /rest/s1/oms/goodIdentificationTypes`
  - Identifier vocabulary.
- `GET /rest/s1/admin/productCategories/member?productId={productId}`
  - Product category membership.
- `POST /rest/s1/oms/dataDocumentView` with the catalog mapping DataDocuments in `/Users/adityapatel/Documents/GitHub/oms/data/ProductsCatalogMappingDataDocuments.xml`
  - `ProductsProductCategoryMembers` fetches all category memberships for the product.
  - `ProductsCatalogCategoryLookup` resolves each category to every catalog/category purpose where it is configured.
  - `ProductsProductStoreCatalogLookup` resolves catalogs to product stores.
  - The frontend joins these read models so one product can display multiple store/catalog/category mappings without requiring write APIs.
- `GET /rest/s1/admin/productCategories`
  - Category lookup.
- `GET /rest/s1/admin/productStores`
  - Product-store context.
- `GET /rest/s1/admin/productStores/{productStoreId}/settings`
  - Store settings context.
- `GET /rest/s1/admin/shopifyShops`
  - Shopify shop context. Frontend must whitelist display fields because the response can include secret-like configuration fields.

## MVP Runtime Boundaries

- Product list uses `OmsProduct` first and filters initial load to `FINISHED_GOOD`.
- Product detail uses `oms/products/{productId}` for identity and `oms/products/{productId}/variants` for variant relationships.
- Store/catalog exposure uses the Products catalog mapping DataDocuments first and falls back to `admin/productCategories/member` if those documents are not installed yet.
- Identifiers are read from `OmsProduct` joined rows when `goodIdentificationTypeId` and `idValue` are present.
- Logistics, financials, selectable features, Shopify mapping repair, BOM, substitutes, and analytics expose honest empty or API-gap states when product-scoped APIs are missing.
- Analytics defaults to a 30-day window as requested.

## Missing Product-Scoped Read APIs

- Product aggregate read:
  - `GET /rest/s1/admin/products/{productId}/productData`
  - Should return overview, identifiers, relationships, store/catalog exposure, selectable features, Shopify mappings, logistics, financials, readiness, analytics, and history in one stable shape.
- Product identifiers:
  - `GET /rest/s1/admin/products/{productId}/identifications`
  - Needed to avoid relying on `OmsProduct` join rows for `GoodIdentification`.
- Selectable features:
  - `GET /rest/s1/admin/products/{productId}/selectableFeatures`
  - Must include `ProductFeatureType`, `ProductFeature`, `ProductFeatureAppl`, `SELECTABLE_FEATURE`, sequence, active dates, and Shopify option order when available.
- Store/catalog exposure:
  - The read-only page can be powered by `ProductsProductCategoryMembers`, `ProductsCatalogCategoryLookup`, and `ProductsProductStoreCatalogLookup`.
  - A future service-backed aggregate endpoint can still replace the client-side join if payload size becomes a problem.
- Shopify mappings:
  - `GET /rest/s1/admin/products/{productId}/shopifyMappings`
  - Must distinguish Shopify parent product ID from variant ID and include shop/product-store context.
- BOM and substitutes:
  - `GET /rest/s1/admin/products/{productId}/bom`
  - `GET /rest/s1/admin/products/{productId}/substitutes`
- Logistics and financial attributes:
  - `GET /rest/s1/admin/products/{productId}/logisticsAttributes`
  - `GET /rest/s1/admin/products/{productId}/financialAttributes`
- Product analytics:
  - `GET /rest/s1/admin/products/{productId}/orderAnalytics?days=30`
  - Should return order count, units sold, cancelled units, returned units, and fulfillment exceptions grouped by product store/channel.
- Product readiness:
  - `GET /rest/s1/admin/products/{productId}/readiness`
  - Should score purpose-specific readiness, not one generic percentage.

## Missing Write APIs

The app should manage these records from day one at the product-workflow level, but each write needs a service-backed endpoint because direct entity writes do not handle validation, expiry, replacement, duplicates, or audit behavior safely.

- Identifier and alias management:
  - `POST /rest/s1/admin/products/{productId}/identifications`
  - `PUT /rest/s1/admin/products/{productId}/identifications/{goodIdentificationTypeId}/{fromDate}`
  - `DELETE /rest/s1/admin/products/{productId}/identifications/{goodIdentificationTypeId}/{fromDate}`
- Category membership and product-store/catalog exposure:
  - `POST /rest/s1/admin/products/{productId}/categoryMemberships`
  - `PUT /rest/s1/admin/products/{productId}/categoryMemberships/{productCategoryId}/{fromDate}`
  - `DELETE /rest/s1/admin/products/{productId}/categoryMemberships/{productCategoryId}/{fromDate}`
- Selectable features:
  - `POST /rest/s1/admin/products/{productId}/selectableFeatures`
  - `PUT /rest/s1/admin/products/{productId}/selectableFeatures/{productFeatureId}`
  - `DELETE /rest/s1/admin/products/{productId}/selectableFeatures/{productFeatureId}`
- Shopify mapping repair:
  - `POST /rest/s1/admin/products/{productId}/shopifyMappings`
  - `PUT /rest/s1/admin/products/{productId}/shopifyMappings/{shopId}/{shopifyProductId}`
  - `DELETE /rest/s1/admin/products/{productId}/shopifyMappings/{shopId}/{shopifyProductId}`
- BOM components:
  - `POST /rest/s1/admin/products/{productId}/bom/components`
  - `PUT /rest/s1/admin/products/{productId}/bom/components/{productIdTo}/{fromDate}`
  - `DELETE /rest/s1/admin/products/{productId}/bom/components/{productIdTo}/{fromDate}`
  - `POST /rest/s1/admin/products/{productId}/bom/validate`
- Substitutes:
  - `POST /rest/s1/admin/products/{productId}/substitutes`
  - `PUT /rest/s1/admin/products/{productId}/substitutes/{productIdTo}/{fromDate}`
  - `DELETE /rest/s1/admin/products/{productId}/substitutes/{productIdTo}/{fromDate}`
- Logistics and financials:
  - `PUT /rest/s1/admin/products/{productId}/logisticsAttributes`
  - `PUT /rest/s1/admin/products/{productId}/financialAttributes`

## User Decisions Captured

- No permission gate for the MVP routes.
- First product list source can be chosen pragmatically; current implementation uses `OmsProduct` first.
- Product attributes are open-ended. The app should not hardcode a closed vocabulary.
- Acquired SKU aliases should use `GoodIdentificationType`.
- Kit ATP is read-only.
- Product-store/catalog associations should be manageable from this app once service-backed APIs exist.
- Shopify mapping repair should be available day one once the repair API exists.
- Analytics default window is 30 days.
