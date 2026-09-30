<template>
  <CardSection :title="translate('Prices')">
    <template #action>
      <ion-button
        v-if="canCopyFromParent && canEdit"
        fill="clear"
        size="small"
        @click="$emit('copyFromParent')"
      >
        {{ translate("Copy from parent") }}
      </ion-button>
    </template>

    <div class="prices-grid">
      <ion-select
        v-model="draft.currencyUomId"
        :label="translate('Currency')"
        label-placement="stacked"
        interface="popover"
        fill="outline"
        :disabled="!canEdit"
        :class="{ 'ion-invalid': touched && errors.currencyUomId, 'ion-touched': touched }"
        :error-text="errors.currencyUomId"
        @ion-change="touched && validate()"
      >
        <ion-select-option
          v-for="option in currencies"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </ion-select-option>
      </ion-select>

      <ion-input
        v-for="priceType in priceTypes"
        :key="priceType"
        v-model="draft[priceType]"
        :label="translate(priceTypeLabel(priceType))"
        label-placement="stacked"
        fill="outline"
        type="number"
        min="0"
        clear-input
        :disabled="!canEdit"
        :class="{ 'ion-invalid': touched && errors[priceType], 'ion-touched': touched }"
        :error-text="errors[priceType]"
        @ion-blur="touched && validate()"
      />
    </div>

    <template #footer>
      <SaveFooter
        :dirty="dirty"
        :saving="saving"
        :can-save="canEdit"
        :stale-under-edit="staleUnderEdit"
        @save="onSave"
        @reset="$emit('reset')"
      />
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonInput, IonSelect, IonSelectOption } from "@ionic/vue"
import { ref } from "vue"
import { z } from "zod"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import { priceTypeLabel } from "@/domain/product/prices"
import type { CatalogOption } from "@/domain/types/product"

const positivePrice = z.string().trim().refine(
  (v) => v === "" || (!isNaN(Number(v)) && Number(v) > 0),
  { message: "Must be a positive number" }
)

const props = withDefaults(defineProps<{
  /** The currency plus one entry per price type in priceTypes, keyed by price type id. */
  draft: Record<string, string>
  priceTypes: string[]
  currencies: CatalogOption[]
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
  canCopyFromParent?: boolean
  canEdit?: boolean
}>(), {
  canEdit: true
})

const emit = defineEmits<{
  (event: "save"): void
  (event: "reset"): void
  (event: "copyFromParent"): void
}>()

const touched = ref(false)
const errors = ref<Record<string, string>>({})

const validate = (): boolean => {
  touched.value = true
  const errs: Record<string, string> = {}
  for(const priceType of props.priceTypes) {
    const result = positivePrice.safeParse(props.draft[priceType] ?? "")
    if(!result.success) {errs[priceType] = result.error.issues[0].message}
  }
  const anyEntered = props.priceTypes.some((priceType) => (props.draft[priceType] ?? "").trim() !== "")
  if(anyEntered && !props.draft.currencyUomId) {errs.currencyUomId = "Currency is required when a price is set"}
  errors.value = errs

  return Object.keys(errs).length === 0
}

const onSave = () => {
  if(!props.canEdit) {return}
  if(!validate()) {return}
  emit("save")
}
</script>

<style scoped>
.prices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
</style>
