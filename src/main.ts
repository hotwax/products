import { createApp } from "vue"
import { IonicVue } from "@ionic/vue"
import { createPinia } from "pinia"
import piniaPluginPersistedstate from "pinia-plugin-persistedstate"
import { createDxpI18n, initialiseConfig } from "@common"
import { VueQueryPlugin, vueQueryOptions } from "./app/vueQuery"

import "@ionic/vue/css/core.css"
import "@ionic/vue/css/normalize.css"
import "@ionic/vue/css/structure.css"
import "@ionic/vue/css/typography.css"
import "@ionic/vue/css/padding.css"
import "@ionic/vue/css/display.css"
import "@ionic/vue/css/palettes/dark.system.css"
import "@common/css/settings.css"
import "@common/css/theme.css"

import App from "./App.vue"
import localeMessages from "./locales"
import logger from "./logger"
import router from "./router"
import { useUserStore } from "./store/user"

const pinia = createPinia().use(piniaPluginPersistedstate)
const i18n = createDxpI18n(localeMessages)

const app = createApp(App)
  .use(IonicVue, {
    mode: "md",
    innerHTMLTemplatesEnabled: true
  })
  .use(logger, {
    level: import.meta.env.VITE_DEFAULT_LOG_LEVEL
  })
  .use(i18n)
  .use(pinia)
  .use(VueQueryPlugin, vueQueryOptions)
  .use(router)

initialiseConfig({
  postLogin: useUserStore().postLogin,
  postLogout: useUserStore().postLogout,
  get oms() { return useUserStore().oms },
  set oms(val) { useUserStore().oms = val },
  get current() { return useUserStore().current },
  set current(val) { useUserStore().current = val },
  router
})

if(import.meta.env.DEV) {
  import("./dev/autoLogin").then(({ tryDevAutoLogin }) => tryDevAutoLogin())
}

router.isReady().then(() => {
  app.mount("#app")
})
