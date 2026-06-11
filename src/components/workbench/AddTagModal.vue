<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Add tag") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            :disabled="!selected.size"
            @click="confirm"
          >
            {{ translate("Add") }} <span v-if="selected.size">({{ selected.size }})</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="translate('Search or enter new tag')"
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
          @click="toggleSelect(facet.value)"
        >
          <ion-checkbox
            slot="start"
            :checked="selected.has(facet.value)"
            @ion-change.stop
          />
          <ion-label>{{ facet.value }}</ion-label>
        </ion-item>
      </ion-list>

      <div
        v-else
        class="empty-state"
      >
        <p>{{ searchQuery.trim() ? translate("No tag found for") + ' "' + searchQuery.trim() + '"' : translate("No tags available") }}</p>
        <ion-button
          v-if="searchQuery.trim()"
          @click="addNew"
        >
          {{ translate("Add") }} "{{ searchQuery.trim() }}"
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonModal, IonSearchbar, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref, watch } from "vue"
import { translate } from "@common"
import type { TagFacet } from "@/domain/types/product"

const props = defineProps<{
  isOpen: boolean
  facets: TagFacet[]
}>()

const emit = defineEmits<{
  (event: "add", tags: string[]): void
  (event: "dismiss"): void
}>()

const searchQuery = ref("")
const selected = ref(new Set<string>())

watch(() => props.isOpen, (open) => {
  if(!open) {
    searchQuery.value = ""
    selected.value = new Set()
  }
})

const filteredFacets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if(!q) return props.facets
  return props.facets.filter(f => f.value.toLowerCase().includes(q))
})

const toggleSelect = (tag: string) => {
  const next = new Set(selected.value)
  next.has(tag) ? next.delete(tag) : next.add(tag)
  selected.value = next
}

const confirm = () => {
  if(!selected.value.size) return
  emit("add", [...selected.value])
}

const addNew = () => {
  const tag = searchQuery.value.trim()
  if(tag) emit("add", [tag])
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
  text-align: center;
  color: var(--ion-color-medium);
}
</style>
