<template>
  <CardSection :title="translate('Shipping and handling')">
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

    <div class="shipping-grid">
      <div class="shipping-fields">
        <div class="measure-row">
          <ion-input
            v-model="draft.productWidth"
            type="number"
            :label="translate('Width')"
            label-placement="stacked"
          />
          <ion-select
            v-model="draft.widthUomId"
            :aria-label="translate('Width unit')"
            interface="popover"
            class="uom-select"
          >
            <ion-select-option
              v-for="uom in lengthUoms"
              :key="uom.id"
              :value="uom.id"
            >
              {{ uom.label }}
            </ion-select-option>
          </ion-select>
        </div>

        <div class="measure-row">
          <ion-input
            v-model="draft.productHeight"
            type="number"
            :label="translate('Height')"
            label-placement="stacked"
          />
          <ion-select
            v-model="draft.heightUomId"
            :aria-label="translate('Height unit')"
            interface="popover"
            class="uom-select"
          >
            <ion-select-option
              v-for="uom in lengthUoms"
              :key="uom.id"
              :value="uom.id"
            >
              {{ uom.label }}
            </ion-select-option>
          </ion-select>
        </div>

        <div class="measure-row">
          <ion-input
            v-model="draft.productDepth"
            type="number"
            :label="translate('Depth')"
            label-placement="stacked"
          />
          <ion-select
            v-model="draft.depthUomId"
            :aria-label="translate('Depth unit')"
            interface="popover"
            class="uom-select"
          >
            <ion-select-option
              v-for="uom in lengthUoms"
              :key="uom.id"
              :value="uom.id"
            >
              {{ uom.label }}
            </ion-select-option>
          </ion-select>
        </div>

        <div class="measure-row">
          <ion-input
            v-model="draft.productWeight"
            type="number"
            :label="translate('Weight')"
            label-placement="stacked"
          />
          <ion-select
            v-model="draft.weightUomId"
            :aria-label="translate('Weight unit')"
            interface="popover"
            class="uom-select"
          >
            <ion-select-option
              v-for="uom in weightUoms"
              :key="uom.id"
              :value="uom.id"
            >
              {{ uom.label }}
            </ion-select-option>
          </ion-select>
        </div>

        <ion-item lines="full">
          <ion-checkbox v-model="draft.inShippingBox">
            {{ translate("In shipping box") }}
          </ion-checkbox>
        </ion-item>
        <ion-item lines="full">
          <ion-checkbox v-model="draft.chargeShipping">
            {{ translate("Charge shipping") }}
          </ion-checkbox>
        </ion-item>
        <ion-select
          v-model="draft.defaultShipmentBoxTypeId"
          :label="translate('Default box type')"
          label-placement="stacked"
          interface="popover"
        >
          <ion-select-option value="">
            {{ translate("None") }}
          </ion-select-option>
          <ion-select-option
            v-for="option in boxTypes"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </ion-select-option>
        </ion-select>
      </div>

      <div class="shipping-illustration">
        <DimensionBox
          :width="draft.productWidth"
          :height="draft.productHeight"
          :depth="draft.productDepth"
          :width-unit="unitLabel(draft.widthUomId)"
          :height-unit="unitLabel(draft.heightUomId)"
          :depth-unit="unitLabel(draft.depthUomId)"
        />
      </div>
    </div>

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
import { IonButton, IonCheckbox, IonInput, IonItem, IonSelect, IonSelectOption } from "@ionic/vue"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import DimensionBox from "./DimensionBox.vue"
import type { CatalogOption } from "@/domain/types/product"

const props = defineProps<{
  draft: {
    productWidth: number | ""
    productHeight: number | ""
    productDepth: number | ""
    productWeight: number | ""
    widthUomId: string
    heightUomId: string
    depthUomId: string
    weightUomId: string
    inShippingBox: boolean
    chargeShipping: boolean
    defaultShipmentBoxTypeId: string
  }
  boxTypes: CatalogOption[]
  lengthUoms: CatalogOption[]
  weightUoms: CatalogOption[]
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

const unitLabel = (uomId: string) => props.lengthUoms.find((uom) => uom.id === uomId)?.label ?? ""
</script>

<style scoped>
.shipping-grid {
  display: grid;
  grid-template-columns: minmax(280px, 443px) 1fr;
  gap: 24px;
}

.shipping-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shipping-fields ion-item {
  --padding-start: 0;
}

.measure-row {
  display: grid;
  grid-template-columns: 1fr 88px;
  gap: 8px;
  align-items: end;
}

.uom-select {
  border-bottom: 1px solid var(--ion-color-step-200, #cccccc);
  min-height: 44px;
}

.shipping-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 860px) {
  .shipping-grid {
    grid-template-columns: 1fr;
  }
}
</style>
