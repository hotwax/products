<template>
  <ion-menu
    side="start"
    content-id="main-content"
    type="overlay"
    :disabled="!isAuthenticated || router.currentRoute.value.path === '/login'"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Products") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-menu-toggle
          v-for="item in menuItems"
          :key="item.path"
          :auto-hide="false"
        >
          <ion-item
            button
            :router-link="item.path"
            router-direction="root"
            :class="{ selected: isSelected(item.path) }"
          >
            <ion-icon
              slot="start"
              :icon="item.icon"
            />
            <ion-label>{{ translate(item.label) }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle, IonTitle, IonToolbar } from "@ionic/vue"
import { alertCircleOutline, cloudDownloadOutline, copyOutline, pricetagsOutline, settingsOutline } from "ionicons/icons"
import { translate } from "@common"
import { useAuth } from "@common/composables/useAuth"
import { computed } from "vue"

import router from "@/router"
import { useUserStore } from "@/store/user"
import Actions from "@/authorization/actions"

const { isAuthenticated } = useAuth()
const userStore = useUserStore()

const menuItems = computed(() => [
  { path: "/products", label: "Product workbench", icon: pricetagsOutline, permissionId: Actions.APP_PRODUCTS_VIEW },
  { path: "/data-fixes/duplicates", label: "Duplicate identifiers", icon: copyOutline, permissionId: Actions.APP_DUPLICATE_RESOLUTION },
  { path: "/data-fixes/missing", label: "Missing values", icon: alertCircleOutline, permissionId: Actions.APP_PRODUCTS_VIEW },
  { path: "/imports", label: "Imports", icon: cloudDownloadOutline, permissionId: Actions.APP_PRODUCTS_VIEW },
  { path: "/settings", label: "Settings", icon: settingsOutline, permissionId: Actions.APP_SETTINGS_VIEW }
].filter((item) => !item.permissionId || userStore.hasPermission(item.permissionId)))

const selectedPage = computed(() => router.currentRoute.value.path)

const isSelected = (path: string) =>
  path === "/products" ? selectedPage.value.includes("/products") : selectedPage.value === path
</script>

<style scoped>
  ion-menu.md ion-item.selected ion-icon {
    color: var(--ion-color-secondary);
  }
  ion-menu.ios ion-item.selected ion-icon {
    color: var(--ion-color-secondary);
  }
  ion-item.selected {
    --color: var(--ion-color-secondary);
  }
</style>
