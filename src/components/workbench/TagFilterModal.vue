<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filter by tags") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('dismiss')">{{ translate("Close") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="facets.length">
        <ion-item
          v-for="facet in facets"
          :key="facet.value"
          button
          @click="$emit('toggle', facet.value)"
        >
          <ion-checkbox
            slot="start"
            :checked="selected.includes(facet.value)"
          />
          <ion-label>{{ facet.value }}</ion-label>
          <ion-badge
            slot="end"
            color="light"
          >
            {{ facet.count }}
          </ion-badge>
        </ion-item>
      </ion-list>
      <EmptyState
        v-else
        :title="translate('No tags')"
        :message="translate('No tags found for the current scope')"
      />
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonBadge, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonItem, IonLabel, IonList, IonModal, IonTitle, IonToolbar
} from "@ionic/vue"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import type { TagFacet } from "@/domain/types/product"

defineProps<{
  isOpen: boolean
  facets: TagFacet[]
  selected: string[]
}>()

defineEmits<{
  (event: "toggle", tag: string): void
  (event: "dismiss"): void
}>()
</script>
