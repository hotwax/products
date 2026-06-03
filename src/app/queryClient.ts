import { QueryClient } from "@tanstack/vue-query"

/** One client for the app. Ionic apps regain window focus constantly (tab switches, device wake),
 *  so focus-refetch stays off; staleness + explicit invalidation drive freshness instead. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  }
})
