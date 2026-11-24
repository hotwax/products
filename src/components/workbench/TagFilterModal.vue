<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filter by tags") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('dismiss')">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="facets.length">
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="translate('Search tags')"
          @ion-input="searchQuery = $event.detail.value ?? ''"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="filteredFacets.length">
        <ion-item
          v-for="facet in filteredFacets"
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
        v-else-if="searchQuery.trim()"
        :title="translate('No matching tags')"
        :message="translate('No tags found matching &quot;{query}&quot;', { query: searchQuery.trim() })"
      />
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
  IonBadge, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref, watch } from "vue"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import type { TagFacet } from "@/domain/types/product"

const props = defineProps<{
  isOpen: boolean
  facets: TagFacet[]
  selected: string[]
}>()

defineEmits<{
  (event: "toggle", tag: string): void
  (event: "dismiss"): void
}>()

const searchQuery = ref("")

watch(() => props.isOpen, (open) => {
  if (!open) {
    searchQuery.value = ""
  }
})

const filteredFacets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.facets
  return props.facets.filter((facet) => facet.value.toLowerCase().includes(q))
})
</script>
