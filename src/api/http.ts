import { api, axios, commonUtil } from "@common"


/** Thin transport over @common api(). All app endpoints (pim/, oms/, admin/) live under the same
 *  Moqui base (getMaargURL → host + /rest/s1/), so requests use the default base with path prefixes.
 *
 *  Auth: @common sends Authorization: Bearer <jwt>; stock Moqui validates the api_key header instead,
 *  so both are sent — whichever the instance honors wins. */

export interface HttpRequest {
  url: string
  method: "get" | "post" | "put" | "delete"
  params?: Record<string, unknown>
  data?: unknown
}

export async function request<T = any>(config: HttpRequest): Promise<T> {
  const response = await api(config)

  return response.data as T
}

/** Server error → a single human message. Moqui REST errors arrive as {errorCode, errors}. */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  const err = error as any

  return (
    err?.response?.data?.errors ||
    err?.response?.data?.errorMessage ||
    err?.response?.data?._ERROR_MESSAGE_ ||
    err?.message ||
    fallback
  )
}

/** Multipart form-data POST. The global axios interceptor always sets Content-Type: application/json,
 *  which breaks file uploads. This bypasses it by using a fresh axios call with the token injected manually. */
export async function formRequest<T = any>(url: string, data: FormData): Promise<T> {
  const token = commonUtil.getToken()
  const baseURL = commonUtil.getMaargURL()
  const response = await axios({
    url,
    method: "post",
    data,
    baseURL,
    headers: token ? { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } : {}
  })

  return response.data as T
}

/** Moqui entity-list REST responses are either bare arrays or {listName: [...]}-style wrappers. */
export function responseList(data: unknown): Record<string, unknown>[] {
  if(Array.isArray(data)) {return data as Record<string, unknown>[]}
  if(data && typeof data === "object") {
    for(const value of Object.values(data)) {
      if(Array.isArray(value)) {return value as Record<string, unknown>[]}
    }
  }

  return []
}
