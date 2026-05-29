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
            router-link="/imports"
            router-direction="root"
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
import { cloudDownloadOutline, pricetagsOutline, settingsOutline } from "ionicons/icons"
import { translate } from "@common"
import { useAuth } from "@common/composables/useAuth"

import router from "@/router"

const { isAuthenticated } = useAuth()
</script>
