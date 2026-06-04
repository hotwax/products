import type { ProductSearchParams } from "@/domain/types/product"

/** The single query-key tree. Queries AND mutations import from here, so cache invalidation can
 *  never drift from key construction. Keys nest broad → narrow; invalidating a prefix hits the subtree. */
export const qk = {
  products: {
    all: ["products"] as const,
    search: (params: ProductSearchParams) => ["products", "search", params] as const,
    tagFacets: (scope: Omit<ProductSearchParams, "tags">) => ["products", "tagFacets", scope] as const,
    groupIdFacets: (scope: Omit<ProductSearchParams, "groupIds">) => ["products", "groupIdFacets", scope] as const
  },
  product: {
    root: (productId: string) => ["product", productId] as const,
    core: (productId: string) => ["product", productId, "core"] as const,
    identifications: (productId: string) => ["product", productId, "identifications"] as const,
    associations: (productId: string) => ["product", productId, "associations"] as const,
    family: (productId: string) => ["product", productId, "family"] as const,
    features: (productId: string) => ["product", productId, "features"] as const,
    audit: (productId: string) => ["product", productId, "audit"] as const
  },
  catalog: {
    all: ["catalog"] as const,
    list: (resource: string) => ["catalog", resource] as const,
    features: () => ["catalog", "features"] as const
  },
  quality: {
    all: ["quality"] as const,
    coverage: (ruleIds: string[]) => ["quality", "coverage", [...ruleIds].sort()] as const,
    duplicates: (ruleId: string) => ["quality", "duplicates", ruleId] as const,
    missing: (ruleId: string) => ["quality", "missing", ruleId] as const
  },
  imports: ["imports"] as const,
  indexStatus: ["indexStatus"] as const
} as const
