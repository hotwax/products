import { createRouter, createWebHistory } from "@ionic/vue-router"
import type { RouteRecordRaw } from "vue-router"
import { Login, cookieHelper } from "@common"
import { useAuth } from "@common/composables/useAuth"

import DataFixDuplicates from "@/views/DataFixDuplicates.vue"
import DataFixMissing from "@/views/DataFixMissing.vue"
import Imports from "@/views/Imports.vue"
import ProductDetail from "@/views/ProductDetail.vue"
import ProductWorkbench from "@/views/ProductWorkbench.vue"
import Settings from "@/views/Settings.vue"
import { useUserStore } from "@/store/user"

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
    beforeEnter: authGuard
  },
  {
    path: "/data-fixes/duplicates",
    name: "DataFixDuplicates",
    component: DataFixDuplicates,
    beforeEnter: authGuard
  },
  {
    path: "/data-fixes/missing",
    name: "DataFixMissing",
    component: DataFixMissing,
    beforeEnter: authGuard
  },
  {
    path: "/products/:productId",
    name: "ProductDetail",
    component: ProductDetail,
    props: true,
    beforeEnter: authGuard
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
    beforeEnter: authGuard
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

export default router
