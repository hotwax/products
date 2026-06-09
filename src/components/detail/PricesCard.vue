<template>
  <CardSection :title="translate('Prices')">
    <div class="prices-grid">
      <ion-select
        v-model="draft.currencyUomId"
        :label="translate('Currency')"
        label-placement="stacked"
        interface="popover"
        fill="outline"
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
        v-model="draft.DEFAULT_PRICE"
        :label="translate('Default price')"
        label-placement="stacked"
        fill="outline"
        type="number"
        min="0"
        clear-input
        :class="{ 'ion-invalid': touched && errors.DEFAULT_PRICE, 'ion-touched': touched }"
        :error-text="errors.DEFAULT_PRICE"
        @ion-blur="touched && validate()"
      />

      <ion-input
        v-model="draft.LIST_PRICE"
        :label="translate('List price')"
        label-placement="stacked"
        fill="outline"
        type="number"
        min="0"
        clear-input
        :class="{ 'ion-invalid': touched && errors.LIST_PRICE, 'ion-touched': touched }"
        :error-text="errors.LIST_PRICE"
        @ion-blur="touched && validate()"
      />

      <ion-input
        v-model="draft.WHOLESALE_PRICE"
        :label="translate('Wholesale price')"
        label-placement="stacked"
        fill="outline"
        type="number"
        min="0"
        clear-input
        :class="{ 'ion-invalid': touched && errors.WHOLESALE_PRICE, 'ion-touched': touched }"
        :error-text="errors.WHOLESALE_PRICE"
        @ion-blur="touched && validate()"
      />
    </div>

    <template #footer>
      <SaveFooter
        :dirty="dirty"
        :saving="saving"
        :stale-under-edit="staleUnderEdit"
        @save="onSave"
        @reset="$emit('reset')"
      />
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { IonInput, IonSelect, IonSelectOption } from "@ionic/vue"
import { ref } from "vue"
import { z } from "zod"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import type { CatalogOption } from "@/domain/types/product"

const PRICE_FIELDS = ["DEFAULT_PRICE", "LIST_PRICE", "WHOLESALE_PRICE"] as const
type PriceField = typeof PRICE_FIELDS[number]

const positivePrice = z.string().trim().refine(
  (v) => v === "" || (!isNaN(Number(v)) && Number(v) > 0),
  { message: "Must be a positive number" }
)

const pricesSchema = z.object({
  currencyUomId: z.string(),
  DEFAULT_PRICE: positivePrice,
  LIST_PRICE: positivePrice,
  WHOLESALE_PRICE: positivePrice
}).superRefine((data, ctx) => {
  const anyEntered = PRICE_FIELDS.some((f) => (data[f] ?? "").trim() !== "")
  if(anyEntered && !data.currencyUomId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Currency is required when a price is set",
      path: ["currencyUomId"]
    })
  }
})

type PriceErrors = Partial<Record<PriceField | "currencyUomId", string>>

const props = defineProps<{
  draft: {
    currencyUomId: string
    DEFAULT_PRICE: string
    LIST_PRICE: string
    WHOLESALE_PRICE: string
  }
  currencies: CatalogOption[]
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
}>()

const emit = defineEmits<{
  (event: "save"): void
  (event: "reset"): void
}>()

const touched = ref(false)
const errors = ref<PriceErrors>({})

const validate = (): boolean => {
  touched.value = true
  const result = pricesSchema.safeParse({
    currencyUomId: props.draft.currencyUomId,
    DEFAULT_PRICE: props.draft.DEFAULT_PRICE,
    LIST_PRICE: props.draft.LIST_PRICE,
    WHOLESALE_PRICE: props.draft.WHOLESALE_PRICE
  })
  if(result.success) {
    errors.value = {}

    return true
  }
  const errs: PriceErrors = {}
  for(const issue of result.error.issues) {
    const field = issue.path[0] as keyof PriceErrors
    if(field && !errs[field]) {errs[field] = issue.message}
  }
  errors.value = errs

  return false
}

const onSave = () => {
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
