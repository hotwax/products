import { DateTime, Settings } from "luxon"
import { defineStore } from "pinia"
import { api, commonUtil, translate } from "@common"
import { useAuth } from "@common/composables/useAuth"

import logger from "@/logger"
import { showToast } from "@/utils"

export const useUserStore = defineStore("user", {
  state: () => ({
    current: {} as any,
    permissions: [] as string[],
    currentProductStore: {
      productStoreId: "",
      storeName: "None"
    } as any,
    pwaState: {
      updateExists: false,
      registration: null as any
    },
    timeZones: [] as any[],
    oms: "",
    fetchStatus: {
      profile: "none",
      permissions: "none"
    } as any
  }),
  getters: {
    getPermissions: (state) => state.permissions,
    getUserProfile: (state) => state.current,
    getPwaState: (state) => state.pwaState,
    getCurrentProductStore: (state) => state.currentProductStore,
    getUserTimeZone: (state) => state.current.timeZone,
    getAvailableTimeZones: (state) => state.timeZones,
    hasPermission: (state) => (permissionId: string): boolean => {
      if(!permissionId) {return true}

      if(permissionId.includes(" OR ")) {
        return permissionId.split(" OR ").some((part) => useUserStore().hasPermission(part.trim()))
      }

      if(permissionId.includes(" AND ")) {
        return permissionId.split(" AND ").every((part) => useUserStore().hasPermission(part.trim()))
      }

      return state.permissions.includes(permissionId)
    }
  },
  actions: {
    async fetchUserProfile() {
      this.fetchStatus.profile = "pending"

      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
          baseURL: commonUtil.getMaargURL()
        })
        this.current = userProfileResp.data
        useAuth().updateUserId(this.current.userId)

        if(this.current.timeZone) {Settings.defaultZone = this.current.timeZone}
        this.fetchStatus.profile = "success"
      } catch (error: any) {
        await showToast(translate("Failed to fetch user profile information"))
        logger.error("Failed to fetch user profile information", error)
        useAuth().clearAuth()
        this.fetchStatus.profile = "error"

        return Promise.reject(error)
      }
    },
    async fetchPermissions() {
      this.fetchStatus.permissions = "pending"
      const serverPermissions: string[] = []
      const viewSize = 200
      let viewIndex = 0

      try {
        let hasMore = true
        while(hasMore) {
          const resp = await api({
            url: commonUtil.isMoqui() ? "admin/user/permissions" : "getPermissions",
            method: "GET",
            baseURL: commonUtil.getOmsURL(),
            params: { viewIndex, viewSize }
          }) as any

          const docs = resp?.data?.docs ?? []
          if(resp?.status === 200 && docs.length && !commonUtil.hasError(resp)) {
            serverPermissions.push(...docs.map((permission: any) => permission.permissionId).filter(Boolean))
            viewIndex += 1
          } else {
            hasMore = false
          }
        }

        this.permissions = serverPermissions
        this.fetchStatus.permissions = "success"
      } catch (error: any) {
        this.fetchStatus.permissions = "error"
        logger.error("Failed to fetch permissions", error)

        return Promise.reject(error)
      }
    },
    async fetchProductStores() {
      try {
        const productStoresResp = await api({
          url: "admin/productStores",
          method: "get",
          baseURL: commonUtil.getMaargURL()
        })
        this.current.stores = Array.isArray(productStoresResp.data) ? productStoresResp.data : []
        this.current.stores.push({
          productStoreId: "",
          storeName: "None"
        })
        this.setCurrentProductStore(this.current.stores[0])
      } catch (error: any) {
        logger.error("Failed to fetch product stores", error)
      }
    },
    setCurrentProductStore(productStoreInfo: any) {
      let productStore = productStoreInfo
      if(productStoreInfo?.productStoreId && !productStoreInfo.storeName) {
        productStore = this.current.stores?.find((store: any) => store.productStoreId === productStoreInfo.productStoreId)
      }

      this.currentProductStore = productStore
    },
    async setUserTimeZone(tzId: string) {
      if(this.current.timeZone === tzId) {return tzId}

      try {
        const resp = await api({
          url: "admin/user/profile",
          method: "post",
          baseURL: commonUtil.getMaargURL(),
          data: {
            userId: this.current.userId,
            tzId
          }
        }) as any

        if(resp?.status !== 200) {throw resp}

        this.current.timeZone = tzId
        Settings.defaultZone = tzId
        await showToast(translate("Time zone updated successfully"))

        return tzId
      } catch (error: any) {
        logger.error("Failed to update time zone", error)
        await showToast(translate("Failed to update time zone"))

        return Promise.reject(error)
      }
    },
    async fetchAvailableTimeZones() {
      if(this.timeZones.length) {return}

      try {
        const resp = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          baseURL: commonUtil.getMaargURL()
        }) as any

        this.timeZones = (resp.data?.timeZones || []).filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid)
      } catch (error: any) {
        logger.error("Failed to fetch time zones", error)
      }
    },
    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration
      this.pwaState.updateExists = payload.updateExists
    },
    async postLogin() {
      try {
        await this.fetchUserProfile()
        await this.fetchPermissions()
        await this.fetchProductStores()
      } catch (error: any) {
        return Promise.reject(error)
      }
    },
    postLogout() {
      this.$reset()
    }
  },
  persist: true
})
