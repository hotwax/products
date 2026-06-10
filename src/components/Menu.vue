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
        <ion-menu-toggle :auto-hide="false">
          <ion-item
            button
            router-link="/products"
            router-direction="root"
            :class="{ selected: selectedPage.includes('/products') }"
          >
            <ion-icon
              slot="start"
              :icon="pricetagsOutline"
            />
            <ion-label>{{ translate("Product workbench") }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
        <ion-menu-toggle :auto-hide="false">
          <ion-item
            button
            router-link="/data-fixes/duplicates"
            router-direction="root"
            :class="{ selected: selectedPage === '/data-fixes/duplicates' }"
          >
            <ion-icon
              slot="start"
              :icon="copyOutline"
            />
            <ion-label>{{ translate("Duplicate identifiers") }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
        <ion-menu-toggle :auto-hide="false">
          <ion-item
            button
            router-link="/data-fixes/missing"
            router-direction="root"
            :class="{ selected: selectedPage === '/data-fixes/missing' }"
          >
            <ion-icon
              slot="start"
              :icon="alertCircleOutline"
            />
            <ion-label>{{ translate("Missing values") }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
        <ion-menu-toggle :auto-hide="false">
          <ion-item
            button
            router-link="/imports"
            router-direction="root"
            :class="{ selected: selectedPage === '/imports' }"
          >
            <ion-icon
              slot="start"
              :icon="cloudDownloadOutline"
            />
            <ion-label>{{ translate("Imports") }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
        <ion-menu-toggle :auto-hide="false">
          <ion-item
            button
            router-link="/settings"
            router-direction="root"
            :class="{ selected: selectedPage === '/settings' }"
          >
            <ion-icon
              slot="start"
              :icon="settingsOutline"
            />
            <ion-label>{{ translate("Settings") }}</ion-label>
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

import router from "@/router"
import { computed } from "vue"

const { isAuthenticated } = useAuth()

const selectedPage = computed(() => {
  return router.currentRoute.value.path
})
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
