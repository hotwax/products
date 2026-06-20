import { createRouter, createWebHistory } from "@ionic/vue-router"
import type { RouteRecordRaw } from "vue-router"
import { Login, commonUtil, cookieHelper, translate } from "@common"
import { useAuth } from "@common/composables/useAuth"

import DataFixDuplicates from "@/views/DataFixDuplicates.vue"
import DataFixMissing from "@/views/DataFixMissing.vue"
import Imports from "@/views/Imports.vue"
import ProductCreate from "@/views/ProductCreate.vue"
import ProductDetail from "@/views/ProductDetail.vue"
import ProductWorkbench from "@/views/ProductWorkbench.vue"
import Settings from "@/views/Settings.vue"
import { useUserStore } from "@/store/user"
import { DUPLICATE_RESOLUTION_PERMISSION, PRODUCT_READ_PERMISSION } from "@/auth/permissions"

const authGuard = () => {
  const userStore = useUserStore()
  const oms = cookieHelper().get("oms") as string
  const userId = cookieHelper().get("userId") as string

  if(oms && userId && !userStore.current?.userId) {
    userStore.oms = oms
    userStore.current = {
      ...userStore.current,
      userId
    }
  }

  if(!useAuth().isAuthenticated.value) {
    return { path: "/login" }
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/products"
  },
  {
    path: "/login",
    name: "Login",
    component: Login
  },
  {
    path: "/products",
    name: "ProductWorkbench",
    component: ProductWorkbench,
    beforeEnter: authGuard,
    meta: { permissionId: PRODUCT_READ_PERMISSION }
  },
  {
    path: "/data-fixes/duplicates",
    name: "DataFixDuplicates",
    component: DataFixDuplicates,
    beforeEnter: authGuard,
    meta: { permissionId: DUPLICATE_RESOLUTION_PERMISSION }
  },
  {
    path: "/data-fixes/missing",
    name: "DataFixMissing",
    component: DataFixMissing,
    beforeEnter: authGuard,
    meta: { permissionId: PRODUCT_READ_PERMISSION }
  },
  {
    path: "/products/create",
    name: "ProductCreate",
    component: ProductCreate,
    beforeEnter: authGuard
  },
  {
    path: "/products/:productId",
    name: "ProductDetail",
    component: ProductDetail,
    props: true,
    beforeEnter: authGuard,
    meta: { permissionId: PRODUCT_READ_PERMISSION }
  },
  {
    // identifiers/relationships/features/sections all folded into the detail editor
    path: "/products/:productId/:section",
    redirect: (to) => `/products/${to.params.productId}`
  },
  {
    path: "/imports",
    name: "Imports",
    component: Imports,
    beforeEnter: authGuard,
    meta: { permissionId: PRODUCT_READ_PERMISSION }
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/products"
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from) => {
  const permissionId = to.meta.permissionId as string | undefined
  if(!permissionId || !useAuth().isAuthenticated.value) {return}

  const userStore = useUserStore()
  if(userStore.fetchStatus.permissions === "none") {
    await userStore.fetchPermissions().catch(() => undefined)
  }

  if(userStore.hasPermission(permissionId)) {return}

  let redirectToPath = from.path
  if(redirectToPath === "/login" || redirectToPath === "/" || !from.name) {
    redirectToPath = "/settings"
  } else {
    commonUtil.showToast(translate("You do not have permission to access this page"))
  }

  return { path: redirectToPath }
})

export default router
