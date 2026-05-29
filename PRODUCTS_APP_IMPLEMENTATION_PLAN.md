# Products App Implementation Plan

## Goal

Build `products` as an accxui app that becomes HotWax's lightweight operational PIM: a product information management workspace optimized for OMS configuration, fulfillment correctness, availability, financial posting, and downstream channel readiness.

This is broader than AS Beauty. AS Beauty is a useful forcing function, but the app should migrate all product-information-management capabilities that matter to an OMS into one focused app.

## Product Thesis

Most enterprise PIM systems optimize for product experience management: rich content, digital shelf syndication, translations, assets, and channel publishing. HotWax needs a lighter, OMS-first PIM:

- A retailer should be able to answer whether a SKU is sellable, fulfillable, ship-ready, compliant, financially postable, and correctly mapped across channels.
- Product setup should be organized around the operational decisions the OMS makes: routing, ATP, kit explosion, substitution, inventory identity, returns, tax/GL/entity mapping, and 3PL/ERP/shop integrations.
- The app should expose product configuration without replacing the OFBiz/Moqui product model. Data should stay in `Product`, `GoodIdentification`, `ProductAssoc`, `ProductAttribute`, category membership, DataDocuments, Data Manager, and existing sync/history entities.
- The UI should avoid becoming a generic spreadsheet clone. It should group information by job-to-be-done and show quality/readiness gaps directly.

## Research Summary

Good PIM patterns worth adopting:

- **Central source of product truth:** PIM systems centralize product data and governance so downstream commerce, marketplace, ERP, and supply-chain systems receive consistent product definitions.
- **Flexible catalog model:** Mature PIMs organize products through categories, families/templates, attributes, attribute groups, variants, and product associations.
- **Quality and completeness:** Strong PIMs do not just store fields. They score whether product data is complete and consistent for a specific channel, locale, family, or operational purpose.
- **Operational lifecycle:** Retailers need product data creation, enrichment, import/export, validation, release, and change monitoring because product records change daily.
- **Channel-specific requirements:** Google/marketplace feeds force stable product IDs, titles, descriptions, images, availability, price, product identifiers, measurements, and variant attributes. Shopify separates product, variant, inventory item, bundles, and metafield concepts.
- **OMS-specific PIM needs:** Retailers need SKU identity, variant/kit relationships, inventory tracking, ship dimensions, customs/trade data, handling flags, channel exposure, product-store/category mapping, substitutions, tax/GL/legal-entity attributes, and sync/error history.

Sources reviewed:

- Akeneo catalog structure: categories, families, family variants, attribute groups, associations.
- Akeneo data quality: enrichment and consistency scoring, product-grid/product-form quality indicators, update behavior after imports or saves.
- Salsify PIM positioning: central source of truth, data quality, collaboration, channel/regional versions, validation rules, workflow.
- GS1 Global Data Model: harmonized foundational product attributes for listing, ordering, moving, storing, and selling.
- Google Merchant Center product data specification: stable product IDs, product identifiers, availability, product measurements, variant attributes.
- Shopify Admin API: product, variant, inventory item, metafields, and product bundle/component behavior.
- Microsoft Dynamics 365 PIM documentation: shared product definition, categorization, identifiers, attributes, product masters/variants, release to legal entities, product maintenance workspace.

## Product Boundary

Own in `products`:

- Product search and product readiness review.
- Product identity, aliases, barcodes, GTIN/UPC/EAN/HS codes.
- Product master fields relevant to OMS.
- Product-store, catalog, and category assignment that controls where a product is sellable and how it is exposed by channel/store.
- Category membership and browse/grouping context.
- Product selectable features for variant axes and shopper/storefront option semantics.
- Product/variant relationships.
- Kit/BOM component setup and validation.
- Substitute/fallback relationships, especially GWP and operational substitutions.
- Logistics, shipping, handling, and trade metadata.
- Financial attributes needed for tax, GL, brand, and legal entity posting.
- Shopify shop/product/variant mapping and channel/store sync visibility.
- Light product order analytics for operational context: order volume, units sold, cancellation/return signals, and fulfillment exception signals.
- Product import/export review and product setup batch workflows.
- Product data quality/readiness scoring.

Do not own here:

- Real-time inventory balances, safety stock, oversell policy, pool/channel allocation, and ATP policy. Those belong in Sourcing & Availability, though this app can show focused read-only context.
- Live order exceptions, CSR actions, returns, refunds, and cancellation operations. Those belong in order-manager.
- Job execution mechanics and generic DataDocument/export management. Those belong in job-manager, though products can link to relevant import/export logs.
- Rich DAM/PXM authoring as a primary goal. Product images and content should be visible enough for identification and channel readiness, not become a full asset-management suite.

## Data Model Alignment

Use OFBiz/Moqui entities first:

- `Product`: core product identity, names, product type, virtual/variant flags, dimensions, weights, taxable flag, origin geo, category pointer, BOM level, brand display field.
- `GoodIdentification`: SKU, UPC-A, UPC-E, EAN, GTIN-style identifiers, HS code, ERP identifiers, acquired SKU aliases, marketplace IDs.
- `GoodIdentificationType`: available identifier vocabulary and new alias types when needed.
- `ProductAssoc`: variants, components, substitutes, accessories, and other product relationships. Use `PRODUCT_COMPONENT` for BOM lines and `PRODUCT_SUBSTITUTE` for fallback/substitution logic.
- `ProductAssocType`: relationship vocabulary.
- `ProductAttribute`: flexible OMS metadata where the base model has no strong field, such as hazmat class, heat sensitivity, handling notes, legal entity code, GL account, ERP tax code, channel flags.
- `ProductCategory` and `ProductCategoryMember`: category membership, operational grouping, Shopify collection/category feed membership, preorder/backorder grouping, and browse readiness.
- `ProdCatalog`, `ProdCatalogCategory`, and `ProductStoreCatalog`: catalog assignment path from product store to browse/root/sales categories. These entities matter because Shopify order ingestion and storefront/product-store eligibility use catalog/category membership, not just a product's primary category.
- `ProductStore`, `ProductStoreGroup`, `ProductStoreSetting`, `ProductStoreFacility`, and `ProductStoreFacilityGroup`: store/channel configuration and product-store operational context. Product setup screens should show how a product is exposed through stores without owning inventory pool policy.
- `ProductFeatureType`, `ProductFeature`, and `ProductFeatureAppl`: selectable feature vocabulary and product feature applications. Shopify product option sync already maps option names/values into `ProductFeatureType` and `ProductFeature`, then applies them with `productFeatureApplTypeId = SELECTABLE_FEATURE`.
- `ProductKeyword`: Shopify tags and search/grouping signals when they are managed as product keywords.
- `ProductUpdateHistory`: Shopify/sync-origin product change history.
- `ShopifyShop`, `ShopifyShopProduct`, `ShopifyShopAndProduct`, and `ShopifyShopTypeMapping`: Shopify shop, product/variant ID mapping, product-store relationship, and shop-specific type/weight/payment/gift-card mappings. These are critical screens, not background metadata.
- `OrderHeader`, `OrderItem`, `OrderItemShipGroup`, `ReturnItem`, and Shopify order item history views/entities: read-only source for light product order analytics. The products app should not become order-manager, but it should show enough demand and issue context to explain why a product configuration matters.
- `SystemMessage`, `SystemMessageRemote`, and Data Manager logs: import/sync/error context.
- DataDocuments: read-optimized product lists and product readiness views.

Moqui API principle:

- The app calls Moqui APIs through `@common` `api`.
- Start with existing direct reads and DataDocument views.
- Use service-backed write APIs for changes that require validation, replacement/expiry behavior, or multi-entity updates.
- Avoid broad direct entity writes from the UI for complex edits such as BOM, identifiers, substitutes, logistics attributes, and financial attributes.

## App Architecture

The app should live as an accxui workspace app:

- Canonical app path: `/Users/adityapatel/Documents/GitHub/accxui/apps/products`.
- Local app checkout path can remain `/Users/adityapatel/Documents/GitHub/products`, symlinked into `accxui/apps/products`, matching the order-manager model.
- Run from the workspace root with `pnpm --filter products dev` and `pnpm --filter products build`.
- Mirror `apps/order-manager` and `apps/job-manager` for `main.ts`, router, user store, i18n, logger, Pinia, and auth guard.
- Use core Ionic components. Do not use `ion-grid`, `ion-row`, `ion-col`, or Ionic grid utility layouts.
- Do not write CSS or modify existing CSS unless explicitly requested.
- Keep all screens mobile-compatible and avoid duplicate summary cards.

## UX Model

### 1. Product Workbench

Purpose: find products and prioritize setup gaps.

Core UI:

- Search by product ID, SKU, UPC/barcode, acquired SKU alias, product name, Shopify product ID, category, brand, legal entity, and sync status.
- Filter by readiness state: missing identifiers, missing logistics data, missing financial attributes, BOM incomplete, substitute gaps, sync errors, recently changed, imported with warnings.
- List rows should show one concise identity block plus readiness chips. Do not repeat the same brand/SKU/product ID in multiple places.

Backbone:

- Prefer DataDocument-based list/search.
- Fallback to direct `oms/products` only for narrow reads.

### 2. Product Detail

Purpose: one operational product record, organized by OMS decisions.

Sections:

- Overview: product identity, type, status, brand, primary category, image, virtual/variant flags.
- Readiness: OMS readiness score and missing-action checklist.
- Identifiers: SKU, UPC/EAN/GTIN, HS code, ERP ID, acquired SKU aliases, channel IDs.
- Relationships: variants, parent/child links, BOM components, substitutes.
- Selectable features: option axes and values applied to this product, including Shopify-origin sequence where present.
- Logistics and compliance: dimensions, weights, country of origin, HS code, hazmat/heat-sensitive flags, handling notes.
- Financial setup: taxable, tax code, GL account, brand/legal entity, source system, effective dates where available.
- Product-store and catalog exposure: stores, catalogs, browse/root categories, category membership, product-store settings that affect product interpretation.
- Shopify mapping: shop, Shopify product ID, Shopify variant ID, parent/variant mapping, Shopify handle, tags, sync status, type mappings.
- Light analytics: recent orders, units, cancellations, returns, and fulfillment exceptions for this product.
- History: recent product updates, sync messages, import logs.

### 3. Product Store, Catalog, And Category Manager

Purpose: make it clear where a product is sellable and which product-store/catalog/category path exposes it.

Capabilities:

- Show product-store exposure through `ProductStoreCatalog`, `ProdCatalog`, `ProdCatalogCategory`, and `ProductCategoryMember`.
- Show primary category separately from store/catalog category membership so the UI does not collapse different semantics into one field.
- Manage category membership where product setup owns it, including active dates and category purpose where available.
- Surface product-store settings that affect product interpretation, such as Shopify product identifier strategy and order-item explosion behavior, as read-only context unless the app is explicitly editing store setup.
- Support channel readiness checks like "not in any active selling category", "mapped to a store but missing Shopify mapping", and "category membership expired".

### 4. Selectable Feature Manager

Purpose: manage variant option axes and selectable values in the OFBiz model.

Capabilities:

- Show `ProductFeatureType` as the option axis, such as color, size, scent, shade, or pack size.
- Show `ProductFeature` as the selected value.
- Show `ProductFeatureAppl` rows with `SELECTABLE_FEATURE`, sequence, active dates, and Shopify-origin option order when available.
- Add/update/expire selectable features through service-backed APIs so the app can avoid duplicate feature values and broken option axes.
- Make variant/feature consistency visible: parent product options, variant product feature applications, and Shopify option mapping should reconcile.

### 5. Shopify Shop Mapping Manager

Purpose: make Shopify mapping a managed product setup surface, not hidden sync plumbing.

Capabilities:

- Show all `ShopifyShopProduct` records for a product grouped by `ShopifyShop` and product store.
- Distinguish Shopify parent product IDs from variant product IDs.
- Show Shopify handle, tags, last sync/update history, and whether the mapping was created from SKU, barcode, or Shopify product ID strategy.
- Manage or repair mappings through a service-backed flow when the mapping exists but points to the wrong OMS product.
- Show shop-specific mappings from `ShopifyShopTypeMapping` where they affect product setup, such as gift-card products, weight units, and type conversions.
- Link directly to sync history and import/correction queue for the mapped Shopify product.

### 6. BOM And Kit Manager

Purpose: make kits operationally correct for fulfillment and ATP.

Capabilities:

- View parent kit and active components.
- Add/update/expire component lines using `ProductAssoc` with `PRODUCT_COMPONENT`.
- Validate missing components, duplicate active components, zero or negative quantities, expired relationships, inactive products, and circular/nested kit risk.
- Show calculated component demand for a kit quantity.
- Show read-only kit ATP summary when available from sourcing/availability APIs.

### 7. Substitute Manager

Purpose: manage approved fallback product relationships.

Capabilities:

- Manage `PRODUCT_SUBSTITUTE` relationships.
- Use sequence as priority.
- Support active dates and notes/attributes for reason or channel where the data model supports it.
- Initially focus on GWP and operational substitutions, not merchandising recommendations.

### 8. Identifier And Alias Manager

Purpose: make product identity clear across systems.

Capabilities:

- Display identifiers grouped by type.
- Add/update/expire active identifiers safely.
- Highlight duplicate active values and missing primary SKU.
- Support acquired SKU alias mapping without changing ERP product master records.
- Treat HS code as a first-class identifier where the existing model uses `GoodIdentification`.

### 9. Logistics And Trade Metadata

Purpose: make SKU data usable by warehouse, carrier, customs, and marketplace feeds.

Capabilities:

- Show product and shipping dimensions/weights with UOM.
- Show origin country/geo and HS code.
- Show handling flags: hazmat, heat-sensitive, fragile, liquid/aerosol, special packing note.
- Validate the minimum operational set for each product type/family.

### 10. Financial Attributes

Purpose: support clean order-line posting to ERP/ledger systems.

Capabilities:

- Show taxable flag, tax code, GL account, brand, legal entity, and financial source.
- Highlight missing values that would block financial export or reconciliation.
- Keep tax calculation itself out of this app; this app owns product-level setup and mapping.

### 11. Import, Review, And Correction Queue

Purpose: help operators correct product data after sync/import.

Capabilities:

- Show latest product imports, Shopify sync changes, product update histories, and SystemMessage/Data Manager errors.
- Open an error queue filtered to affected products.
- Provide guided correction links to the right product detail section.
- Export readiness gaps for bulk correction through job-manager/Data Manager where appropriate.

### 12. Light Product Order Analytics

Purpose: show operational impact without moving order management into this app.

Capabilities:

- Show read-only product demand context: recent order count, units sold, open units, cancelled units, returned units, and exchange/replacement signals where available.
- Show fulfillment issue context: rejected items, backorder/preorder tags, unfillable quantities, or reservation exceptions when available through existing order DataDocuments/views.
- Segment analytics by product store/channel and date range.
- Link to order-manager filtered by product instead of reimplementing order workflows.
- Use analytics only to guide product setup decisions, such as "this SKU has order volume but missing ship dimensions" or "this kit has cancellations because component mapping is broken."

### 13. Readiness Score

Purpose: make product data quality actionable for OMS operations.

Score dimensions:

- Identity readiness: SKU/barcode/channel mapping present, no duplicate active identifiers.
- Sellability readiness: product type, category, product-store/channel exposure.
- Store/catalog readiness: active product-store catalog path, active category membership, and no expired store exposure.
- Feature readiness: required selectable features exist and variant/Shopify option mappings reconcile.
- Fulfillment readiness: dimensions, shipping weight, handling flags, BOM/substitution validity where applicable.
- Availability readiness: variant/component relationships and inventory-tracking prerequisites.
- Compliance readiness: HS code, country of origin, hazmat/heat-sensitive data where relevant.
- Finance readiness: tax code, taxable flag, GL/legal entity/brand mapping.
- Shopify readiness: shop mapping exists, parent/variant IDs are consistent, product identifier strategy is satisfied, and latest sync has no critical errors.
- Sync readiness: no unresolved import/sync errors for critical fields.

Important product decision:

- Readiness should be purpose-specific. A product can be ready for OMS fulfillment but not ready for Google Shopping. Do not collapse every requirement into one generic percentage.

## Implementation Phases

### Phase 0: Research And Contract Lock

Deliverables:

- Keep this plan as the product direction.
- Verify current `accxui` wrapper path and symlink strategy.
- Verify existing product DataDocuments and direct Moqui routes on the target branch.
- Draft the initial product DataDocument contract:
  - `ProductsProductSummary`
  - `ProductsProductIdentity`
  - `ProductsProductRelationships`
  - `ProductsProductStoreCatalog`
  - `ProductsProductSelectableFeatures`
  - `ProductsProductShopifyMappings`
  - `ProductsProductOrderAnalytics`
  - `ProductsProductReadiness`
  - optional `ProductsProductSyncHistory`

Acceptance:

- A developer can name which existing APIs power the first read-only UI.
- Backend gaps are listed as service contracts, not blockers to frontend scaffolding.

### Phase 1: Accxui App Scaffold

Deliverables:

- Create `products` app under the accxui workspace using order-manager/job-manager conventions.
- Routes:
  - `/products`
  - `/products/:productId`
  - `/products/:productId/identifiers`
  - `/products/:productId/relationships`
  - `/products/:productId/stores`
  - `/products/:productId/features`
  - `/products/:productId/shopify`
  - `/products/:productId/logistics`
  - `/products/:productId/financials`
  - `/products/:productId/analytics`
  - `/imports`
  - `/settings`
- App shell and menu using core Ionic components.
- User store, auth guard, i18n, logger, and `@common` API wiring.

Acceptance:

- `pnpm --filter products build` works from `/Users/adityapatel/Documents/GitHub/accxui`.
- No custom CSS is added.
- No `ion-grid`, `ion-row`, or `ion-col`.

### Phase 2: Product Workbench And Detail Read Models

Deliverables:

- Product search service and Pinia store.
- Product summary list view.
- Product detail overview with readiness placeholders fed by a local normalizer.
- Read-only store/catalog exposure panel.
- Read-only selectable features panel.
- Read-only Shopify mapping panel.
- Read-only analytics panel with links to order-manager.
- Normalizers that map raw Moqui/DataDocument records into stable app types.

Acceptance:

- Search by product ID/SKU/name works when the underlying DataDocument or direct route supports it.
- Empty, loading, and error states exist.
- Product detail does not duplicate identity data across sections.
- Store/catalog, features, Shopify mapping, and analytics can start as read-only even when write APIs are not ready.

### Phase 3: Product Store, Catalog, Shopify Mapping, And Feature Read Models

Deliverables:

- Product-store/catalog service and Pinia store module.
- Selectable feature service and Pinia store module.
- Shopify mapping service and Pinia store module.
- Product analytics service and Pinia store module.
- Detail subsections for stores, features, Shopify, and analytics.

Acceptance:

- A user can see which stores/catalogs/categories expose the product.
- A user can see selectable feature axes and values applied to the product.
- A user can see Shopify shop/product/variant mappings and latest sync status.
- A user can see basic product order context without leaving the product record.

### Phase 4: Identifier And Alias Management

Deliverables:

- Identifier tab/list.
- Safe create/update/expire flow for `GoodIdentification`.
- Duplicate active identifier warning.
- Alias type handling for acquired SKU / ERP / marketplace IDs.

Acceptance:

- A user can see all identifiers for a product and understand which one is primary for OMS use.
- Write flows call a service-backed API, not arbitrary direct entity writes, once backend service exists.

### Phase 5: Product Store, Catalog, Shopify Mapping, And Selectable Feature Writes

Deliverables:

- Category membership add/update/expire flow.
- Product-store/catalog exposure flow where product setup owns the association.
- Selectable feature add/update/expire flow.
- Shopify mapping repair flow for mismatched or missing `ShopifyShopProduct` records.
- Service-backed validation for duplicates, expired memberships, and parent/variant option mismatches.

Acceptance:

- Product-store/category exposure can be corrected without editing unrelated store configuration.
- Selectable feature writes preserve `ProductFeatureType`, `ProductFeature`, `ProductFeatureAppl`, `SELECTABLE_FEATURE`, sequence, and effective-date semantics.
- Shopify mapping repair is explicit, auditable, and scoped to product mapping rather than broad resync.

### Phase 6: Relationships, BOM, And Substitutes

Deliverables:

- Relationship view for variants, components, substitutes.
- BOM component manager using `ProductAssoc` and `PRODUCT_COMPONENT`.
- Substitute manager using `ProductAssoc` and `PRODUCT_SUBSTITUTE`.
- Client-side validation mirrors backend expectations.

Acceptance:

- Kit component rows show component product, quantity, active dates, and validity.
- Nested/circular risk is visible before save.
- GWP/substitute priority ordering is clear.

### Phase 7: Logistics, Compliance, And Financial Setup

Deliverables:

- Logistics view and edit flow.
- Financial setup view and edit flow.
- Attribute mapping vocabulary for operational fields that are not strong base fields.

Acceptance:

- Operators can identify whether a SKU is warehouse/carrier/customs-ready.
- Operators can identify whether a SKU is financially postable.
- The app treats Product base fields, GoodIdentification, and ProductAttribute consistently.

### Phase 8: Readiness Engine

Deliverables:

- Readiness rule definitions grouped by purpose.
- Product readiness badges in workbench.
- Detail checklist showing missing fields and deep links to the correction section.
- Store/catalog, selectable feature, Shopify mapping, and analytics-informed readiness rules.
- Tests for each readiness dimension.

Acceptance:

- A product can be scored independently for OMS fulfillment, channel/listing, compliance, and financial readiness.
- Readiness rules are data-driven enough to adjust without rewriting views.

### Phase 9: Import, Sync, And Correction Queue

Deliverables:

- Import/history view.
- Product-specific sync history from `ProductUpdateHistory` and SystemMessage/Data Manager logs where available.
- Correction queue filtered by product readiness gaps and import errors.

Acceptance:

- Operators can move from a failed import/sync signal to the exact product section that needs correction.
- Bulk correction is linked to job-manager/Data Manager rather than duplicated.

### Phase 10: Light Analytics Hardening

Deliverables:

- Product-order analytics DataDocument or service contract.
- Product detail analytics filters by product store/channel/date range.
- Order-manager deep links from analytics rows.

Acceptance:

- Analytics stays read-only and explainable.
- Analytics does not duplicate order-manager actions.
- Product readiness can incorporate high-volume product risk without making analytics mandatory for all screens.

### Phase 11: Hardening And Migration

Deliverables:

- Migrate existing product-management capabilities from legacy apps/modules into `products`.
- Add route-level permissions.
- Add mobile regression tests for key screens.
- Add docs for entity mapping and backend service contracts.

Acceptance:

- Product setup responsibilities are consolidated in `products`.
- Other apps link to products instead of reimplementing product configuration screens.

## Initial Backend Service Contracts

These should be service-backed Moqui APIs when writes are needed:

- `GET /rest/s1/admin/products/{productId}/productData`
- `PUT /rest/s1/admin/products/{productId}/productData`
- `GET /rest/s1/admin/products/{productId}/identifications`
- `POST /rest/s1/admin/products/{productId}/identifications`
- `PUT /rest/s1/admin/products/{productId}/identifications/{goodIdentificationTypeId}/{fromDate}`
- `DELETE /rest/s1/admin/products/{productId}/identifications/{goodIdentificationTypeId}/{fromDate}`
- `GET /rest/s1/admin/products/{productId}/relationships`
- `GET /rest/s1/admin/products/{productId}/storeCatalog`
- `POST /rest/s1/admin/products/{productId}/categoryMemberships`
- `PUT /rest/s1/admin/products/{productId}/categoryMemberships/{productCategoryId}/{fromDate}`
- `DELETE /rest/s1/admin/products/{productId}/categoryMemberships/{productCategoryId}/{fromDate}`
- `GET /rest/s1/admin/products/{productId}/selectableFeatures`
- `POST /rest/s1/admin/products/{productId}/selectableFeatures`
- `PUT /rest/s1/admin/products/{productId}/selectableFeatures/{productFeatureId}`
- `DELETE /rest/s1/admin/products/{productId}/selectableFeatures/{productFeatureId}`
- `GET /rest/s1/admin/products/{productId}/shopifyMappings`
- `POST /rest/s1/admin/products/{productId}/shopifyMappings`
- `PUT /rest/s1/admin/products/{productId}/shopifyMappings/{shopId}/{shopifyProductId}`
- `DELETE /rest/s1/admin/products/{productId}/shopifyMappings/{shopId}/{shopifyProductId}`
- `GET /rest/s1/admin/products/{productId}/bom`
- `POST /rest/s1/admin/products/{productId}/bom/components`
- `PUT /rest/s1/admin/products/{productId}/bom/components/{productIdTo}/{fromDate}`
- `DELETE /rest/s1/admin/products/{productId}/bom/components/{productIdTo}/{fromDate}`
- `POST /rest/s1/admin/products/{productId}/bom/validate`
- `GET /rest/s1/admin/products/{productId}/substitutes`
- `POST /rest/s1/admin/products/{productId}/substitutes`
- `PUT /rest/s1/admin/products/{productId}/substitutes/{productIdTo}/{fromDate}`
- `DELETE /rest/s1/admin/products/{productId}/substitutes/{productIdTo}/{fromDate}`
- `GET /rest/s1/admin/products/{productId}/logisticsAttributes`
- `PUT /rest/s1/admin/products/{productId}/logisticsAttributes`
- `GET /rest/s1/admin/products/{productId}/financialAttributes`
- `PUT /rest/s1/admin/products/{productId}/financialAttributes`
- `GET /rest/s1/admin/products/{productId}/orderAnalytics`
- `GET /rest/s1/admin/products/{productId}/readiness`

Existing reads to reuse early:

- `GET /rest/s1/oms/products`
- `GET /rest/s1/oms/products/{productId}`
- `GET /rest/s1/oms/products/{productId}/variants`
- `GET /rest/s1/oms/products/productUpdateHistories`
- `GET /rest/s1/oms/goodIdentificationTypes`
- `POST /rest/s1/oms/dataDocumentView`
- Data Manager and SystemMessage routes where available in `hotwax-maarg-util`.

## Testing Strategy

Unit tests:

- Product record normalizers.
- Identifier grouping and duplicate detection.
- Store/catalog exposure normalizers.
- Selectable feature normalizers and duplicate option detection.
- Shopify mapping normalizers and parent/variant reconciliation.
- Product order analytics normalizers.
- BOM validation and component quantity display.
- Substitute priority normalization.
- Logistics/financial attribute mapping.
- Readiness rule evaluation.

Component tests:

- Product workbench loading, empty, error, and result states.
- Product detail section navigation.
- Store/catalog panel.
- Selectable feature panel.
- Shopify mapping panel.
- Light analytics panel.
- Identifier list and edit modal.
- BOM component manager.
- Readiness checklist and deep links.

Integration/manual tests:

- Search a product by SKU and product ID.
- Open a kit product and verify component rows.
- Open a product exposed to Shopify and verify shop/product/variant mappings.
- Open a product with selectable features and verify option axes/values.
- Open a product with product-store catalog/category exposure and verify store readiness.
- Open a product with recent orders and verify analytics remain read-only with order-manager links.
- Open a product with missing dimensions and verify fulfillment-readiness gap.
- Open a product with missing tax/GL/legal entity attributes and verify financial-readiness gap.
- Open a product with sync/import history and verify correction queue links.

Mobile checks:

- Product list works on narrow viewport.
- Detail sections remain navigable without side-by-side layouts.
- Forms use Ionic inputs/selects/modals/action sheets, not CSS-heavy custom layouts.

## Open Decisions Before Coding

1. Confirm repository wiring: standalone `/Users/adityapatel/Documents/GitHub/products` checkout symlinked into `/Users/adityapatel/Documents/GitHub/accxui/apps/products`, or direct app folder only.
2. Confirm initial permission ID for route gating.
3. Confirm first product list source: existing `OmsProduct` DataDocument, new `ProductsProductSummary`, or direct `oms/products` read.
4. Confirm operational attribute vocabulary for `ProductAttribute` names: hazmat, heat-sensitive, legal entity, GL account, ERP tax code, handling notes.
5. Confirm whether acquired SKU aliases should use a new `GoodIdentificationType` or an existing identifier type.
6. Confirm if kit ATP is read-only from Sourcing & Availability in this app or computed by a backend product-readiness API.
7. Confirm which product-store/catalog associations this app can edit directly versus only display as store setup context.
8. Confirm whether Shopify mapping repair should be enabled in phase 1 writes or kept read-only until sync repair services exist.
9. Confirm initial analytics window and metrics: recommended default is 30 days, grouped by product store/channel.

## First Build Recommendation

Start with a read-first app:

1. Scaffold the accxui `products` app.
2. Build product workbench and product detail from existing Moqui reads.
3. Add read-only product-store/catalog, selectable feature, Shopify mapping, and light analytics panels.
4. Add readiness scoring in the frontend normalizer using available fields.
5. Add identifiers and relationship views read-only.
6. Only then add service-backed writes for identifiers, product-store/category exposure, selectable features, Shopify mappings, BOM components, substitutes, logistics, and financial fields.

This avoids blocking on API gaps while keeping the architecture honest: reads prove the UI and entity mapping, writes are added only where the workflow and validation are clear.
