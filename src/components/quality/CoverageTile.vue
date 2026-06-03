<template>
  <ion-card
    button
    :class="{ 'tile-active': active }"
    @click="$emit('select')"
  >
    <ion-card-content>
      <div class="tile-head">
        <span class="tile-label">{{ rule.label }}</span>
        <ion-badge :color="badgeColor">{{ badgeText }}</ion-badge>
      </div>
      <ion-progress-bar
        :value="(coverage?.pctComplete ?? 0) / 100"
        :color="badgeColor"
      />
      <p class="tile-caption">
        {{ captionText }}
      </p>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { IonBadge, IonCard, IonCardContent, IonProgressBar } from "@ionic/vue"
import { computed } from "vue"
import { translate } from "@common"
import type { QualityRule, RuleCoverage } from "@/domain/types/quality"

const props = defineProps<{
  rule: QualityRule
  coverage?: RuleCoverage
  active?: boolean
}>()

defineEmits<{ (event: "select"): void }>()

const missing = computed(() => props.coverage?.missing ?? 0)
const badgeColor = computed(() => (missing.value === 0 ? "success" : "danger"))
const badgeText = computed(() => (missing.value === 0 ? translate("Complete") : `${missing.value} ${translate("missing")}`))
const captionText = computed(() => {
  const scopeLabel = props.rule.scope === "variants" ? translate("variants") : props.rule.scope === "virtuals" ? translate("virtuals") : translate("products")
  return `${props.coverage?.pctComplete ?? 0}% ${translate("complete")} · ${props.coverage?.eligibleTotal ?? 0} ${scopeLabel}`
})
</script>

<style scoped>
.tile-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tile-label {
  font-weight: 600;
}

.tile-caption {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ion-color-medium);
}

.tile-active {
  outline: 2px solid var(--ion-color-primary);
}
</style>
