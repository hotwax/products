<template>
  <template v-if="staleUnderEdit">
    <ion-note color="warning">
      {{ translate("Underlying data changed") }}
    </ion-note>
  </template>
  <ion-button
    fill="clear"
    size="small"
    :disabled="!dirty || saving"
    @click="$emit('reset')"
  >
    {{ translate("Reset") }}
  </ion-button>
  <ion-button
    size="small"
    :disabled="!canSave || !dirty || saving"
    @click="$emit('save')"
  >
    <ion-spinner
      v-if="saving"
      name="crescent"
    />
    <template v-else>
      {{ translate("Save") }}
    </template>
  </ion-button>
</template>

<script setup lang="ts">
import { IonButton, IonNote, IonSpinner } from "@ionic/vue"
import { translate } from "@common"

withDefaults(defineProps<{
  dirty: boolean
  saving: boolean
  canSave?: boolean
  staleUnderEdit?: boolean
}>(), {
  canSave: true
})

defineEmits<{
  (event: "save"): void
  (event: "reset"): void
}>()
</script>
