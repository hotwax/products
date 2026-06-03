<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Imports") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refetch()">
            {{ translate("Refresh") }}
          </ion-button>
        </ion-buttons>
        <ion-progress-bar
          v-if="isFetching"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ErrorState
        v-if="isError"
        :title="translate('Import history failed')"
        :message="errorText"
        @retry="refetch"
      />

      <template v-else>
        <ion-list lines="none">
          <ion-list-header>
            <ion-label>{{ translate("Recently synced product updates") }}</ion-label>
          </ion-list-header>
          <ion-searchbar
            v-model="query"
            :placeholder="translate('Search by product, SKU, shop')"
          />
        </ion-list>

        <ion-list lines="full">
          <ion-item
            v-for="entry in filteredEntries"
            :key="entry.id"
            button
            :router-link="`/products/${entry.productId}`"
          >
            <ion-label>
              <h3>{{ entry.productId }}</h3>
              <p v-if="entry.parentProductId">
                {{ translate("Parent") }}: {{ entry.parentProductId }}
              </p>
              <p v-if="entry.sku">
                SKU: {{ entry.sku }}
              </p>
              <p v-if="entry.message">
                {{ entry.message }}
              </p>
            </ion-label>
            <div
              slot="end"
              class="entry-end"
            >
              <ion-badge :color="entry.status === 'Synced' ? 'success' : 'medium'">
                {{ entry.status }}
              </ion-badge>
              <ion-note v-if="entry.shopId">
                {{ translate("Shop") }}: {{ entry.shopId }}
              </ion-note>
              <ion-note v-if="entry.createdDate">
                {{ new Date(entry.createdDate).toLocaleString() }}
              </ion-note>
            </div>
          </ion-item>
        </ion-list>

        <EmptyState
          v-if="!isLoading && !filteredEntries.length"
          :title="translate('No product import history')"
          :message="translate('Product update history is empty or unavailable for this OMS.')"
        />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonMenuButton,
  IonNote, IonPage, IonProgressBar, IonSearchbar, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { errorMessage } from "@/api/http"
import { importHistoryOptions } from "@/queries/catalog"

const importsQuery = useQuery(importHistoryOptions())
const query = ref("")

const filteredEntries = computed(() => {
  const entries = importsQuery.data.value ?? []
  const normalized = query.value.trim().toLowerCase()
  if(!normalized) {return entries}

  return entries.filter((entry) =>
    [entry.productId, entry.parentProductId, entry.sku, entry.shopId, entry.message].some((value) =>
      value.toLowerCase().includes(normalized)))
})

const isLoading = importsQuery.isLoading
const isFetching = importsQuery.isFetching
const isError = importsQuery.isError
const errorText = computed(() => errorMessage(importsQuery.error.value, translate("Import history is unavailable")))
const refetch = () => importsQuery.refetch()
</script>

<style scoped>
.entry-end {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.entry-end ion-note {
  font-size: 12px;
}
</style>
