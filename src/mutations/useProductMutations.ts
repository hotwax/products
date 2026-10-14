import { useMutation, useQueryClient, type QueryClient } from "@tanstack/vue-query"
import { triggerSolrIndex, updateProductFields } from "@/api/pim"
import type { ProductFieldsPatch } from "@/domain/types/pim"
import type { ProductCore, ProductSummary } from "@/domain/types/product"
import { textValue } from "@/domain/normalize/value"
import { qk } from "@/queries/keys"

const identityFields = ["productName", "internalName", "brandName", "productTypeId"] as const
type FamilyIdentity = Partial<Pick<ProductSummary, typeof identityFields[number]>>
const acceptedIdentities = new WeakMap<QueryClient, Map<string, FamilyIdentity>>()

/** Save a field-card diff. Not optimistic — explicit Save with a pending state; on success the
 *  core slice refetches (all field cards bind to it) and list/quality caches refresh in background. */
export function useUpdateProductFields() {
  const queryClient = useQueryClient()
  const identities = acceptedIdentities.get(queryClient) ?? new Map<string, FamilyIdentity>()
  acceptedIdentities.set(queryClient, identities)

  return useMutation({
    mutationFn: ({ productId, patch }: { productId: string; parentProductId: string; patch: ProductFieldsPatch }) => updateProductFields(productId, patch),
    onSuccess: async (_data, { productId, patch }) => {
      const identity = { ...identities.get(productId) }
      for(const field of identityFields) {
        if(field in patch) {identity[field] = textValue(patch[field])}
      }
      if("productName" in patch && !patch.productName) {identity.productName = productId}
      identities.set(productId, identity)
      await queryClient.invalidateQueries({ queryKey: qk.product.core(productId) })
      queryClient.invalidateQueries({ queryKey: qk.product.audit(productId) })
      queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: qk.quality.all, refetchType: "active" })
    },
    onSettled: (_data, error, { productId, parentProductId }) => triggerSolrIndex(parentProductId, {
      onIndexed: error ? undefined : () => {
        const familyKey = qk.product.family(parentProductId)
        const identity = identities.get(productId) ?? {}
        const state = queryClient.getQueryState<ProductCore>(qk.product.core(productId))
        const current = state?.isInvalidated ? undefined : state?.data
        queryClient.setQueryData<ProductSummary[]>(familyKey, (members) => members?.map((member) => {
          if(member.productId !== productId) {return member}
          const updated = { ...member }
          // A delayed index response must not overwrite a newer accepted save.
          for(const field of identityFields) {
            if(field in identity) {updated[field] = current ? current[field] : identity[field]!}
          }
          if("productName" in identity && !updated.productName && identity.productName !== "") {updated.productName = productId}
          return updated
        }))
        // Single-document indexing is not immediately search-visible. Keep the
        // accepted identity fields instead of refetching and caching old names.
        queryClient.invalidateQueries({ queryKey: familyKey, refetchType: "none" })
      }
    })
  })
}
