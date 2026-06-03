<template>
  <CardSection :title="translate('Change history')">
    <ion-list
      v-if="entries.length"
      lines="full"
    >
      <ion-item
        v-for="entry in entries.slice(0, limit)"
        :key="entry.id"
      >
        <ion-label>
          <h3>{{ fieldLabel(entry) }}</h3>
          <p>
            <template v-if="entry.oldValue">
              {{ entry.oldValue }} →
            </template>{{ entry.newValue || "—" }}
          </p>
        </ion-label>
        <ion-note slot="end">
          {{ when(entry.changedDate) }}<template v-if="entry.changedByUserId">
            · {{ entry.changedByUserId }}
          </template>
        </ion-note>
      </ion-item>
    </ion-list>
    <p
      v-else
      class="history-empty"
    >
      {{ translate("No recorded changes yet") }}
    </p>
  </CardSection>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList, IonNote } from "@ionic/vue"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import type { ProductHistoryEntry } from "@/domain/types/product"

withDefaults(defineProps<{ entries: ProductHistoryEntry[]; limit?: number }>(), { limit: 10 })

const fieldLabel = (entry: ProductHistoryEntry) => {
  const entityName = entry.changedEntityName.split(".").pop() ?? entry.changedEntityName

  return entry.changedFieldName ? `${entityName}.${entry.changedFieldName}` : entityName
}

const when = (iso: string) => (iso ? new Date(iso).toLocaleString() : "")
</script>

<style scoped>
.history-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
}
</style>
