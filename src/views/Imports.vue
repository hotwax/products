<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Imports</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="productsStore.fetchImports()">
            Refresh
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-progress-bar
        v-if="importsLoading"
        type="indeterminate"
      />

      <ErrorState
        v-if="importsError"
        title="Import history failed"
        :message="importsError"
      />

      <ion-list v-else>
        <ion-list-header>
          <ion-label>Recent product updates</ion-label>
        </ion-list-header>
        <ion-item
          v-for="item in imports"
          :key="`${item.source}-${item.timestamp}-${item.message}`"
        >
          <ion-label>
            <h2>{{ item.source }}</h2>
            <p>{{ item.message || "No details" }}</p>
            <p>{{ item.timestamp }}</p>
          </ion-label>
          <ion-note slot="end">
            {{ item.status }}
          </ion-note>
        </ion-item>
      </ion-list>

      <EmptyState
        v-if="!importsLoading && !importsError && !imports.length"
        title="No product import history"
        message="Product update history is empty or unavailable for this OMS."
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonNote,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { storeToRefs } from "pinia"
import { onMounted } from "vue"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"

const productsStore = useProductsStore()
const { imports, importsLoading, importsError } = storeToRefs(productsStore)

onMounted(() => productsStore.fetchImports())
</script>
