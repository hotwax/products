import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { createIdentification, expireIdentification, updateIdentification } from "@/api/pim"
import type { IdentificationCreate, IdentificationKey } from "@/domain/types/pim"
import type { ProductIdentification } from "@/domain/types/product"
import { qk } from "@/queries/keys"

/** Identification list edits: optimistic add/expire with snapshot rollback. */
export function useIdentificationMutations(productId: () => string) {
  const queryClient = useQueryClient()
  const listKey = () => qk.product.identifications(productId())

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey() })
    queryClient.invalidateQueries({ queryKey: qk.product.audit(productId()) })
    queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
    queryClient.invalidateQueries({ queryKey: qk.quality.all, refetchType: "active" })
  }

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: listKey() })
    return queryClient.getQueryData<ProductIdentification[]>(listKey())
  }

  const add = useMutation({
    mutationFn: (payload: IdentificationCreate) => createIdentification(productId(), payload),
    onMutate: async (payload) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductIdentification[]>(listKey(), (rows = []) => [
        ...rows,
        {
          productId: productId(),
          goodIdentificationTypeId: payload.goodIdentificationTypeId,
          typeDescription: payload.goodIdentificationTypeId,
          idValue: payload.idValue,
          fromDate: new Date().toISOString(),
          thruDate: null,
          active: true
        }
      ])
      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: invalidate
  })

  const update = useMutation({
    mutationFn: ({ key, idValue }: { key: IdentificationKey; idValue: string }) =>
      updateIdentification(productId(), key, idValue),
    onMutate: async ({ key, idValue }) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductIdentification[]>(listKey(), (rows = []) =>
        rows.map((row) =>
          row.goodIdentificationTypeId === key.goodIdentificationTypeId && row.fromDate === key.fromDate
            ? { ...row, idValue }
            : row
        )
      )
      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: invalidate
  })

  const expire = useMutation({
    mutationFn: (key: IdentificationKey) => expireIdentification(productId(), key),
    onMutate: async (key) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductIdentification[]>(listKey(), (rows = []) =>
        rows.map((row) =>
          row.goodIdentificationTypeId === key.goodIdentificationTypeId && row.fromDate === key.fromDate
            ? { ...row, thruDate: new Date().toISOString(), active: false }
            : row
        )
      )
      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: invalidate
  })

  return { add, update, expire }
}
