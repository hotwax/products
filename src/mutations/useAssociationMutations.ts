import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { createAssociation, expireAssociation, reactivateAssociation, resequenceAssociations, updateAssociation } from "@/api/pim"
import type { AssociationCreate, AssociationKey, AssociationUpdate } from "@/domain/types/pim"
import type { ProductAssociation } from "@/domain/types/product"
import { qk } from "@/queries/keys"

const sameRow = (row: ProductAssociation, key: AssociationKey) =>
  row.productIdTo === key.productIdTo && row.productAssocTypeId === key.productAssocTypeId && row.fromDate === key.fromDate

/** Association list edits (substitutes, kit components, generic links): optimistic with rollback.
 *  Both endpoints' association caches are touched, so the related product's detail stays fresh too. */
export function useAssociationMutations(productId: () => string) {
  const queryClient = useQueryClient()
  const listKey = () => qk.product.associations(productId())

  const invalidate = (relatedProductId?: string) => {
    queryClient.invalidateQueries({ queryKey: listKey() })
    if(relatedProductId) {queryClient.invalidateQueries({ queryKey: qk.product.associations(relatedProductId) })}
    queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
  }

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: listKey() })

    return queryClient.getQueryData<ProductAssociation[]>(listKey())
  }

  const add = useMutation({
    mutationFn: (payload: AssociationCreate & { relatedName?: string; relatedImageUrl?: string; relatedSku?: string }) =>
      createAssociation(productId(), payload),
    onMutate: async (payload) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductAssociation[]>(listKey(), (rows = []) => [
        ...rows,
        {
          productId: productId(),
          productIdTo: payload.productIdTo,
          productAssocTypeId: payload.productAssocTypeId,
          fromDate: new Date().toISOString(),
          thruDate: null,
          active: true,
          direction: "outgoing",
          sequenceNum: payload.sequenceNum ?? null,
          quantity: payload.quantity ?? null,
          scrapFactor: payload.scrapFactor ?? null,
          instruction: payload.instruction ?? "",
          reason: payload.reason ?? "",
          relatedProductId: payload.productIdTo,
          relatedName: payload.relatedName ?? payload.productIdTo,
          relatedSku: payload.relatedSku ?? "",
          relatedImageUrl: payload.relatedImageUrl ?? ""
        }
      ])

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: (_data, _error, payload) => invalidate(payload.productIdTo)
  })

  const update = useMutation({
    mutationFn: (payload: AssociationUpdate) => updateAssociation(productId(), payload),
    onMutate: async (payload) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductAssociation[]>(listKey(), (rows = []) =>
        rows.map((row) => (sameRow(row, payload) ? { ...row, ...payload } : row)))

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: () => invalidate()
  })

  const expire = useMutation({
    mutationFn: ({ key, thruDate }: { key: AssociationKey; thruDate?: string }) =>
      expireAssociation(productId(), key, thruDate),
    onMutate: async ({ key, thruDate }) => {
      const previous = await snapshot()
      const effective = thruDate ?? new Date().toISOString()
      queryClient.setQueryData<ProductAssociation[]>(listKey(), (rows = []) =>
        rows.map((row) =>
          sameRow(row, key) ? { ...row, thruDate: effective, active: new Date(effective).getTime() > Date.now() } : row))

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: (_data, _error, payload) => invalidate(payload.key.productIdTo)
  })

  const reactivate = useMutation({
    mutationFn: (key: AssociationKey) => reactivateAssociation(productId(), key),
    onMutate: async (key) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductAssociation[]>(listKey(), (rows = []) =>
        rows.map((row) => (sameRow(row, key) ? { ...row, thruDate: null, active: true } : row)))

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: (_data, _error, key) => invalidate(key.productIdTo)
  })

  const resequence = useMutation({
    mutationFn: (items: (AssociationKey & { sequenceNum: number })[]) => resequenceAssociations(productId(), items),
    onMutate: async (items) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductAssociation[]>(listKey(), (rows = []) =>
        rows.map((row) => {
          const item = items.find((entry) => sameRow(row, entry))

          return item ? { ...row, sequenceNum: item.sequenceNum } : row
        }))

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: () => invalidate()
  })

  return { add, update, expire, reactivate, resequence }
}
