<template>
  <CardSection :title="translate('Components')">
    <template #action>
      <ion-button
        fill="outline"
        size="small"
        @click="$emit('addComponent')"
      >
        {{ translate("Add components") }}
      </ion-button>
    </template>

    <div
      v-if="components.length"
      class="components-grid"
    >
      <AssociationItem
        v-for="assoc in components"
        :key="`${assoc.relatedProductId}-${assoc.fromDate}`"
        :association="assoc"
        show-quantity
        @expire="$emit('expireComponent', assoc)"
        @reactivate="$emit('reactivateComponent', assoc)"
      />
    </div>
    <p
      v-else
      class="components-empty"
    >
      {{ translate("No components yet — a kit needs at least one") }}
    </p>
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton } from "@ionic/vue"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import AssociationItem from "./AssociationItem.vue"
import type { ProductAssociation } from "@/domain/types/product"

defineProps<{ components: ProductAssociation[] }>()

defineEmits<{
  (event: "addComponent"): void
  (event: "expireComponent", assoc: ProductAssociation): void
  (event: "reactivateComponent", assoc: ProductAssociation): void
}>()
</script>

<style scoped>
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
}

.components-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
}
</style>
