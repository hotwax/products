import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@common"
import { useUserStore } from "./user"

const commonUtilMock = vi.hoisted(() => ({
  getMaargURL: vi.fn(() => "https://maarg.example/rest/s1/"),
  getOmsURL: vi.fn(() => "https://oms.example/rest/s1/"),
  hasError: vi.fn(() => false),
  isMoqui: vi.fn(() => true)
}))

vi.mock("@common", () => ({
  api: vi.fn(),
  commonUtil: commonUtilMock,
  translate: (message: string) => message
}))

vi.mock("@common/composables/useAuth", () => ({
  useAuth: () => ({
    clearAuth: vi.fn(),
    updateUserId: vi.fn()
  })
}))

vi.mock("@/utils", () => ({
  showToast: vi.fn()
}))

const permissionResponse = (docs: { permissionId: string }[]) => ({
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
  data: { docs }
}) as any

describe("user store permissions", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(api).mockReset()
    commonUtilMock.hasError.mockReturnValue(false)
    commonUtilMock.isMoqui.mockReturnValue(true)
  })

  it("supports empty, OR, and AND permission expressions", () => {
    const userStore = useUserStore()
    userStore.permissions = ["PIM_PRODUCT_VIEW", "PIM_FEATURE_CREATE"]

    expect(userStore.hasPermission("")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_ADMIN")).toBe(false)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW OR PIM_PRODUCT_ADMIN")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW AND PIM_FEATURE_CREATE")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW AND PIM_FEATURE_ADMIN")).toBe(false)
  })

  it("loads Moqui permissions from admin/user/permissions with pagination", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "PIM_PRODUCT_VIEW" }, { permissionId: "PIM_FEATURE_CREATE" }]))
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "SEARCH_UPDATE" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    await userStore.fetchPermissions()

    expect(api).toHaveBeenNthCalledWith(1, {
      url: "admin/user/permissions",
      method: "GET",
      baseURL: "https://oms.example/rest/s1/",
      params: { viewIndex: 0, viewSize: 200 }
    })
    expect(api).toHaveBeenNthCalledWith(2, {
      url: "admin/user/permissions",
      method: "GET",
      baseURL: "https://oms.example/rest/s1/",
      params: { viewIndex: 1, viewSize: 200 }
    })
    expect(userStore.permissions).toEqual(["PIM_PRODUCT_VIEW", "PIM_FEATURE_CREATE", "SEARCH_UPDATE"])
    expect(userStore.fetchStatus.permissions).toBe("success")
  })

  it("loads legacy permissions from getPermissions", async () => {
    commonUtilMock.isMoqui.mockReturnValue(false)
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "PIM_PRODUCT_ADMIN" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    await userStore.fetchPermissions()

    expect(api).toHaveBeenCalledWith({
      url: "getPermissions",
      method: "GET",
      baseURL: "https://oms.example/rest/s1/",
      params: { viewIndex: 0, viewSize: 200 }
    })
    expect(userStore.permissions).toEqual(["PIM_PRODUCT_ADMIN"])
  })
})
