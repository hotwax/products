import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { resolveDuplicateIdentifiers } from "@/api/pim"
import type { DedupChange } from "@/domain/types/pim"
import { qk } from "@/queries/keys"

/** Resolve duplicate identifier values through pim's transactional bulk endpoint.
 *  Success invalidates the quality subtree (groups + coverage) and the workbench lists —
 *  pim reindexes the affected products server-side, so a refetch sees fresh facets. */
export function useResolveDuplicates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: DedupChange[]) => resolveDuplicateIdentifiers(changes),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.quality.all }),
        queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
      ])
    }
  })
}
