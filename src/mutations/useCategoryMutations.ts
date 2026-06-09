import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { addProductCategoryMember, expireProductCategoryMember } from "@/api/pim"
import type { ProductCategoryMembership } from "@/domain/types/product"
import { qk } from "@/queries/keys"

export function useCategoryMutations(productId: () => string) {
  const queryClient = useQueryClient()
  const listKey = () => qk.product.categories(productId())

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: listKey() })

    return queryClient.getQueryData<ProductCategoryMembership[]>(listKey())
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey() })
  }

  const add = useMutation({
    mutationFn: (payload: { productCategoryId: string; categoryName: string }) =>
      addProductCategoryMember(productId(), payload.productCategoryId),
    onMutate: async (payload) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductCategoryMembership[]>(listKey(), (rows = []) => [
        ...rows,
        {
          productCategoryId: payload.productCategoryId,
          categoryName: payload.categoryName,
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

  const expire = useMutation({
    mutationFn: ({ productCategoryId, fromDate }: { productCategoryId: string; fromDate: string }) =>
      expireProductCategoryMember(productId(), productCategoryId, fromDate),
    onMutate: async ({ productCategoryId }) => {
      const previous = await snapshot()
      queryClient.setQueryData<ProductCategoryMembership[]>(listKey(), (rows = []) =>
        rows.map((row) =>
          row.productCategoryId === productCategoryId
            ? { ...row, thruDate: new Date().toISOString(), active: false }
            : row
        )
      )

      return { previous }
    },
    onError: (_error, _payload, context) => queryClient.setQueryData(listKey(), context?.previous),
    onSettled: invalidate
  })

  return { add, expire }
}
