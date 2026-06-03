import { commonUtil, cookieHelper, logger } from "@common"
import { useAuth } from "@common/composables/useAuth"
import { accxuiConfig } from "@common/core/configRegistry"

import { useUserStore } from "@/store/user"

export async function tryDevAutoLogin(): Promise<void> {
  if(!import.meta.env.DEV) {return}
  if(import.meta.env.VITE_DEV_AUTO_LOGIN === "false") {return}

  const oms = import.meta.env.VITE_DEV_OMS as string | undefined
  const username = import.meta.env.VITE_DEV_USERNAME as string | undefined
  const password = import.meta.env.VITE_DEV_PASSWORD as string | undefined

  if(!oms || !username || !password) {return}

  const auth = useAuth()
  const userStore = useUserStore()
  if(auth.isAuthenticated.value && cookieHelper().get("oms") === oms && commonUtil.getMaargURL()) {return}

  try {
    userStore.oms = oms
    accxuiConfig.value.oms = oms
    auth.updateOMS(oms)
    cookieHelper().set("oms", oms)
    await auth.fetchLoginOptions()
    await auth.login(username, password)
    userStore.current = {
      ...userStore.current,
      userId: userStore.current.userId || cookieHelper().get("userId")
    }
    accxuiConfig.value.oms = oms
    accxuiConfig.value.current = userStore.current
    const router = accxuiConfig.value.router
    if(router?.currentRoute?.value?.name === "Login" || router?.currentRoute?.value?.path === "/login") {
      await router.replace("/")
    }
    logger.info("[dev] auto-login succeeded")
  } catch {
    logger.warn("[dev] auto-login failed; falling back to Login UI")
  }
}
