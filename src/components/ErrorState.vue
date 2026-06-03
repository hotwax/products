<template>
  <ion-list>
    <ion-item color="danger">
      <ion-label>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
      </ion-label>
      <ion-button
        v-if="retryable"
        slot="end"
        fill="outline"
        color="light"
        size="small"
        @click="$emit('retry')"
      >
        {{ translate("Retry") }}
      </ion-button>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { IonButton, IonItem, IonLabel, IonList } from "@ionic/vue"
import { translate } from "@common"

withDefaults(
  defineProps<{
    title: string
    message: string
    retryable?: boolean
  }>(),
  { retryable: true }
)

defineEmits<{ (event: "retry"): void }>()
</script>
