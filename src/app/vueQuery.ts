import { VueQueryPlugin, type VueQueryPluginOptions } from "@tanstack/vue-query"
import { queryClient } from "./queryClient"

export { VueQueryPlugin }

export const vueQueryOptions: VueQueryPluginOptions = {
  queryClient
}
