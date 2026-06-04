<template>
  <CardSection :title="translate('Dates')">
    <template #action>
      <ion-button
        v-if="canCopyFromParent"
        fill="clear"
        size="small"
        @click="$emit('copyFromParent')"
      >
        {{ translate("Copy from parent") }}
      </ion-button>
    </template>

    <div class="grid-4">
      <ion-input
        v-model="draft.introductionDate"
        type="date"
        :label="translate('Introduction date')"
        label-placement="stacked"
        fill="outline"
      />
      <ion-input
        v-model="draft.releaseDate"
        type="date"
        :label="translate('Release date')"
        label-placement="stacked"
        fill="outline"
      />
      <ion-input
        v-model="draft.supportDiscontinuationDate"
        type="date"
        :label="translate('Support discontinuation date')"
        label-placement="stacked"
        fill="outline"
      />
      <ion-input
        v-model="draft.salesDiscontinuationDate"
        type="date"
        :label="translate('Sales discontinuation')"
        label-placement="stacked"
        fill="outline"
      />
    </div>

    <ion-item
      lines="none"
      class="oos-toggle"
    >
      <ion-toggle v-model="draft.salesDiscWhenNotAvail">
        <ion-label>
          {{ translate("Discontinue when out of stock") }}
          <p>{{ translate("This item will not come back into stock. Do not accept backorders") }}</p>
        </ion-label>
      </ion-toggle>
    </ion-item>

    <template #footer>
      <SaveFooter
        :dirty="dirty"
        :saving="saving"
        :stale-under-edit="staleUnderEdit"
        @save="$emit('save')"
        @reset="$emit('reset')"
      />
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton, IonInput, IonItem, IonLabel, IonToggle } from "@ionic/vue"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"

defineProps<{
  draft: {
    introductionDate: string
    releaseDate: string
    supportDiscontinuationDate: string
    salesDiscontinuationDate: string
    salesDiscWhenNotAvail: boolean
  }
  canCopyFromParent: boolean
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
}>()

defineEmits<{
  (event: "save"): void
  (event: "reset"): void
  (event: "copyFromParent"): void
}>()
</script>

<style scoped>
.grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.oos-toggle {
  margin-top: 8px;
  --padding-start: 0;
}
</style>
