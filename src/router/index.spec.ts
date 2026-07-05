import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@common"

import router from "./index"
import { useUserStore } from "@/store/user"

const authState = vi.hoisted(() => ({
  isAuthenticated: { value: true }
}))

const commonUtilMock = vi.hoisted(() => ({
  getOmsURL: vi.fn(() => "https://oms.example/rest/s1/"),
  hasError: vi.fn(() => false),
  isMoqui: vi.fn(() => true),
  showToast: vi.fn()
}))

vi.mock("@common", () => ({
  Login: { template: "<div />" },
  api: vi.fn(),
  commonUtil: commonUtilMock,
  cookieHelper: () => ({
    get: vi.fn()
  }),
  translate: (message: string) => message
}))

vi.mock("@common/composables/useAuth", () => ({
  useAuth: () => authState
}))

vi.mock("@/utils", () => ({
  showToast: vi.fn()
}))

vi.mock("@/views/DataFixDuplicates.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/views/DataFixMissing.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/views/Imports.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/views/ProductCreate.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/views/ProductDetail.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/views/ProductWorkbench.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/views/Settings.vue", () => ({ default: { template: "<div />" } }))

const permissionResponse = (docs: { permissionId: string }[]) => ({
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
  data: { docs }
}) as any

describe("router permissions", () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(api).mockReset()
    commonUtilMock.hasError.mockReturnValue(false)
    commonUtilMock.isMoqui.mockReturnValue(true)
    authState.isAuthenticated.value = true

    if(router.currentRoute.value.path !== "/") {
      await router.replace("/")
      await router.isReady()
    }
  })

  it("loads permissions on authenticated routes without page-level permission metadata", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "COMMON_ADMIN" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    await router.push("/settings")
    await router.isReady()

    expect(api).toHaveBeenCalledWith({
      url: "admin/user/permissions",
      method: "GET",
      baseURL: "https://oms.example/rest/s1/",
      params: { viewIndex: 0, viewSize: 200 }
    })
    expect(useUserStore().permissions).toEqual(["COMMON_ADMIN"])
  })
})
