<template>
  <ion-card>
    <ion-card-header v-if="title || $slots.action">
      <div class="section-head">
        <ion-card-title class="section-title">
          {{ title }}
        </ion-card-title>
        <slot name="action" />
      </div>
    </ion-card-header>
    <ion-card-content>
      <slot />
    </ion-card-content>
    <div
      v-if="$slots.footer"
      class="section-footer"
    >
      <slot name="footer" />
    </div>
  </ion-card>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from "@ionic/vue"

defineProps<{ title?: string }>()
</script>

<style scoped>
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-title {
  font-size: 18px;
}

.section-footer {
  border-top: 1px solid var(--ion-color-step-150, #d9d9de);
  padding: 4px 8px;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>
