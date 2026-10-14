import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { triggerSolrIndex, updateProductFields } from "@/api/pim"
import type { ProductFieldsPatch } from "@/domain/types/pim"
import { qk } from "@/queries/keys"

/** Save a field-card diff. Not optimistic — explicit Save with a pending state; on success the
 *  core slice refetches (all field cards bind to it) and list/quality caches refresh in background. */
export function useUpdateProductFields() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, patch }: { productId: string; parentProductId: string; patch: ProductFieldsPatch }) => updateProductFields(productId, patch),
    onSuccess: async (_data, { productId }) => {
      await queryClient.invalidateQueries({ queryKey: qk.product.core(productId) })
      queryClient.invalidateQueries({ queryKey: qk.product.audit(productId) })
      queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: qk.quality.all, refetchType: "active" })
    },
    onSettled: (_data, _error, { parentProductId }) => triggerSolrIndex(parentProductId)
  })
}
