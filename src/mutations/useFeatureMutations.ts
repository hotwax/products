import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { applyFeature, createFeature, removeFeatureApplication } from "@/api/pim"
import type { FeatureApply, FeatureCreate } from "@/domain/types/pim"
import type { ProductFeatureApplication } from "@/domain/types/product"
import { qk } from "@/queries/keys"
import { DateTime } from "luxon"

/** Feature chip edits: optimistic apply/remove; creating a brand-new feature value first writes the
 *  catalog row (idempotent server-side) then applies it. */
export function useFeatureMutations(productId: () => string) {
  const queryClient = useQueryClient()
  const listKey = () => qk.product.features(productId())

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey() })
    queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
  }

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: listKey() })

    return queryClient.getQueryData<ProductFeatureApplication[]>(listKey())
  }

  const apply = useMutation({
    mutationFn: (payload: FeatureApply & { description?: string; featureTypeId?: string; featureTypeDescription?: string }) =>
      applyFeature(productId(), payload),
    onMutate: async (payload) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductFeatureApplication[]>(listKey(), (rows = []) => [
        ...rows,
        {
          productId: productId(),
          productFeatureId: payload.productFeatureId,
          productFeatureApplTypeId: payload.productFeatureApplTypeId ?? "STANDARD_FEATURE",
          featureTypeId: payload.featureTypeId ?? "",
          featureTypeDescription: payload.featureTypeDescription ?? payload.featureTypeId ?? "",
          description: payload.description ?? payload.productFeatureId,
          fromDate: new Date().toISOString(),
          thruDate: null,
          active: true,
          sequenceNum: payload.sequenceNum ?? null
        }
      ])

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: invalidate
  })

  const remove = useMutation({
    mutationFn: ({ productId, productFeatureId, fromDate }: { productId: string, productFeatureId: string; fromDate: string }) =>
      removeFeatureApplication(productId, productFeatureId, fromDate, DateTime.now().toMillis()),
    onMutate: async ({ productFeatureId, fromDate }) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductFeatureApplication[]>(listKey(), (rows = []) =>
        rows.map((row) =>
          row.productFeatureId === productFeatureId && row.fromDate === fromDate
            ? { ...row, thruDate: new Date().toISOString(), active: false }
            : row))

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: invalidate
  })

  /** "add color" with a value that doesn't exist yet: create the catalog feature, then apply it. */
  const createAndApply = useMutation({
    mutationFn: async (payload: FeatureCreate & { productFeatureApplTypeId?: string }) => {
      const { productFeatureId } = await createFeature(payload)
      await applyFeature(productId(), { productFeatureId, productFeatureApplTypeId: payload.productFeatureApplTypeId })

      return productFeatureId
    },
    onSettled: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: qk.catalog.features() })
    }
  })

  return { apply, remove, createAndApply }
}
