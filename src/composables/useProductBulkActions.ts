import { api, logger, translate } from "@common"
import { computed, ref } from "vue"
import bulkActionsConfig from "@/config/bulkActions.json"
import Actions from "@/authorization/actions"
import { useUserStore } from "@/store/user"
import { useToast } from "@/composables/useToast"

export type BulkActionKey = keyof typeof bulkActionsConfig

export interface ProductBulkActionItem {
  id: string
  label: string
  destructive?: boolean
  disabled?: boolean
  fill?: "outline" | "solid"
  run: () => void | Promise<void>
}

export function useProductBulkActions(
  selectedIds: () => string[],
  handlers: {
    onAddTag: () => void
    onActionCompleted?: () => void
  }
) {
  const user = useUserStore()
  const toast = useToast()
  const busy = ref(false)
  const configuredMdmIds = ref<string[]>([])
  const checkedMdm = ref(false)

  const canUpdate = computed(() => user.hasPermission(Actions.APP_PRODUCT_UPDATE))

  async function checkConfiguredMdmConfigs() {
    if(checkedMdm.value) {return}
    try {
      const configIds = Object.values(bulkActionsConfig)
        .map((a) => a.configId)
        .filter(Boolean)

      if(!configIds.length) {
        checkedMdm.value = true
        return
      }

      const { data } = await api({
        url: "admin/dataManager",
        method: "GET",
        params: { configId: configIds.join(","), configId_op: "in", pageSize: configIds.length }
      })
      if(Array.isArray(data)) {
        configuredMdmIds.value = data.map((row: any) => row.configId)
      }
    } catch(e) {
      logger.warn("Could not fetch MDM configs on this OMS", e)
    } finally {
      checkedMdm.value = true
    }
  }

  void checkConfiguredMdmConfigs()

  const actions = computed<ProductBulkActionItem[]>(() => {
    if(!canUpdate.value) {return []}

    const list: ProductBulkActionItem[] = [
      {
        id: "addTag",
        label: translate("Add tag"),
        disabled: busy.value,
        run: () => handlers.onAddTag()
      }
    ]

    for(const [key, config] of Object.entries(bulkActionsConfig)) {
      if(config.type === "mdm" && config.configId) {
        const isConfigured = configuredMdmIds.value.includes(config.configId)
        if(isConfigured) {
          list.push({
            id: key,
            label: translate(config.label),
            disabled: busy.value,
            run: () => runMdmAction(key as BulkActionKey)
          })
        }
      }
    }

    return list
  })

  async function runMdmAction(key: BulkActionKey) {
    const ids = [...new Set(selectedIds())]
    if(!ids.length || busy.value) {return}

    const config = bulkActionsConfig[key]
    if(!config || !config.configId) {return}

    busy.value = true
    try {
      const rows = ids.map((id) => `"${id.replaceAll('"', '""')}"`)
      const csv = `"productId"\r\n` + rows.join("\r\n")

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const fileName = `${key}_${config.configId}_${Date.now()}.csv`

      const formData = new FormData()
      formData.append("configId", config.configId)
      formData.append("contentFile", blob, fileName)

      const response = await api({
        url: "admin/uploadDataManagerFile",
        method: "POST",
        data: formData
      })

      if(response?.data?.logId) {
        toast.success(translate("Bulk request submitted for {count} products (ID: {logId})", { count: ids.length, logId: response.data.logId }))
      } else {
        toast.success(translate("Bulk request submitted for {count} products", { count: ids.length }))
      }
      handlers.onActionCompleted?.()
    } catch(error) {
      logger.error("Failed to submit product bulk action", error)
      toast.error(error, translate("Could not submit bulk action. Check MDM configuration."))
    } finally {
      busy.value = false
    }
  }

  return {
    actions,
    busy
  }
}
