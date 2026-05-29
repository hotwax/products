<template>
  <ion-list>
    <ion-item>
      <ion-label>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
      </ion-label>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList } from "@ionic/vue"

defineProps<{
  title: string
  message: string
}>()
</script>
