import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { updateProductFields } from "@/api/pim"
import type { ProductFieldsPatch } from "@/domain/types/pim"
import { qk } from "@/queries/keys"

/** Save a field-card diff. Not optimistic — explicit Save with a pending state; on success the
 *  core slice refetches (all field cards bind to it) and list/quality caches refresh in background
 *  (pim reindexes the product server-side as part of the update). */
export function useUpdateProductFields(productId: () => string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: ProductFieldsPatch) => updateProductFields(productId(), patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.product.core(productId()) })
      queryClient.invalidateQueries({ queryKey: qk.product.audit(productId()) })
      queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: qk.quality.all, refetchType: "active" })
    }
  })
}
