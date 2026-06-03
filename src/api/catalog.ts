import { request, responseList } from "./http"

/** Reads served by oms/admin on origin/main (entity ops + data documents + utility services). */

type Raw = Record<string, unknown>

/** Generic DataDocument view query (co.hotwax.oms.common.CommonServices.get#DataDocumentView). */
export async function fetchDataDocument(
  dataDocumentId: string,
  customParametersMap: Record<string, unknown>,
  options: { pageSize?: number; filterByDate?: boolean } = {}
): Promise<Raw[]> {
  const data = {
    dataDocumentId,
    pageIndex: 0,
    pageSize: options.pageSize ?? 200,
    filterByDate: options.filterByDate ?? false,
    customParametersMap
  }
  const response = await request<{ entityValueList?: Raw[] }>({ url: "oms/dataDocumentView", method: "post", data })
  return response.entityValueList ?? responseList(response)
}

/** Field-level audit trail (GoodIdentification.idValue carries enable-audit-log upstream). */
export async function fetchEntityAuditLogs(productId: string, pageSize = 50): Promise<Raw[]> {
  return responseList(
    await request({
      url: "admin/entityAuditLogs",
      method: "get",
      params: { pkPrimaryValue: productId, pageSize, orderByField: "-changedDate" }
    })
  )
}

export async function fetchImportHistories(pageSize = 50): Promise<Raw[]> {
  return responseList(
    await request({
      url: "oms/products/productUpdateHistories",
      method: "get",
      params: { pageSize, orderByField: "-lastUpdatedStamp" }
    })
  )
}

export async function fetchProductStores(): Promise<Raw[]> {
  return responseList(await request({ url: "admin/productStores", method: "get", params: { pageSize: 100 } }))
}
