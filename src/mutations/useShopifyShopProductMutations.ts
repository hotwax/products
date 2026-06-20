import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { deleteShopifyShopProduct, triggerSolrIndex, upsertShopifyShopProduct } from "@/api/pim"
import type { ShopifyShopProduct } from "@/domain/types/product"
import { qk } from "@/queries/keys"

export function useShopifyShopProductMutations(productId: () => string, parentProductId: () => string) {
  const queryClient = useQueryClient()
  const listKey = () => qk.product.shopifyShopProducts(productId())

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: listKey() })

    return queryClient.getQueryData<ShopifyShopProduct[]>(listKey())
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey() })
    triggerSolrIndex(parentProductId())
  }

  const upsert = useMutation({
    mutationFn: (payload: { shopId: string; shopifyProductId: string; shopifyInventoryItemId: string }) =>
      upsertShopifyShopProduct({ productId: productId(), ...payload }),
    onMutate: async (payload) => {
      const previous = await snapshot()
      queryClient.setQueryData<ShopifyShopProduct[]>(listKey(), (rows = []) => {
        const idx = rows.findIndex((r) => r.shopId === payload.shopId)
        const entry: ShopifyShopProduct = { productId: productId(), ...payload }

        return idx === -1 ? [...rows, entry] : rows.map((r, i) => (i === idx ? entry : r))
      })

      return { previous }
    },
    onError: (_e, _p, ctx) => queryClient.setQueryData(listKey(), ctx?.previous),
    onSettled: invalidate
  })

  const remove = useMutation({
    mutationFn: (shopId: string) => deleteShopifyShopProduct(productId(), shopId),
    onMutate: async (shopId) => {
      const previous = await snapshot()
      queryClient.setQueryData<ShopifyShopProduct[]>(listKey(), (rows = []) =>
        rows.filter((r) => r.shopId !== shopId)
      )

      return { previous }
    },
    onError: (_e, _p, ctx) => queryClient.setQueryData(listKey(), ctx?.previous),
    onSettled: invalidate
  })

  return { upsert, remove }
}
