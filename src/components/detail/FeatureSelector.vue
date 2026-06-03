<template>
  <div class="feature-selector">
    <p class="selector-title">
      {{ translate("Features") }}
    </p>
    <div
      v-for="option in options"
      :key="option.axis"
      class="axis"
    >
      <p class="axis-label">
        {{ option.axis }}
      </p>
      <div class="axis-chips">
        <!-- selected state is driven by a scoped class + CSS vars rather than ion-chip's
             color/outline props: toggling both together on a reused (keyed) element leaves
             Ionic's host classes stale, so the checkmark wouldn't track the changed axis -->
        <ion-chip
          v-for="value in option.values"
          :key="value"
          outline
          class="value-chip"
          :class="{ 'value-chip--selected': selected[option.axis] === value }"
          @click="selected[option.axis] !== value && $emit('select', option.axis, value)"
        >
          <ion-icon
            v-if="selected[option.axis] === value"
            :icon="checkmarkOutline"
          />
          <ion-label>{{ value }}</ion-label>
        </ion-chip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonChip, IonIcon, IonLabel } from "@ionic/vue"
import { checkmarkOutline } from "ionicons/icons"
import { translate } from "@common"
import type { FeatureAxisOption } from "@/domain/product/family"

defineProps<{
  options: FeatureAxisOption[]
  selected: Record<string, string>
}>()

defineEmits<{ (event: "select", axis: string, value: string): void }>()
</script>

<style scoped>
.feature-selector {
  padding: 8px 16px 0;
}

.selector-title {
  margin: 0 0 4px;
  font-weight: 600;
}

.axis-label {
  margin: 8px 0 4px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.axis-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.value-chip {
  cursor: pointer;
}

/* selected = primary-tinted outline chip with a checkmark (matches the design); keeps the label
   readable, unlike a solid fill which clashed with ion-chip's transparent outline background */
.value-chip--selected {
  --color: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  font-weight: 600;
}

.value-chip--selected ion-icon {
  color: var(--ion-color-primary);
}
</style>
