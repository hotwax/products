<template>
  <ion-card>
    <ion-card-content>
      <ion-searchbar
        class="ion-no-padding ion-padding-bottom"
        :value="modelValue"
        :placeholder="placeholder"
        @ion-input="updateSearch"
      />

      <div class="search-filter-grid">
        <slot />
        <ion-button
          color="danger"
          slot="icon-only"
          fill="clear"
          @click="$emit('clear')"
        >
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonSearchbar
} from "@ionic/vue"
import { closeOutline } from "ionicons/icons";

defineProps<{
  modelValue: string
  placeholder: string
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
  (event: "clear"): void
}>()

function updateSearch(event: CustomEvent) {
  emit("update:modelValue", event.detail.value || "")
}
</script>

<style scoped>
.search-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr)) max-content max-content;
  gap: 12px;
  align-items: center;
}

@media (max-width: 640px) {
  .search-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
