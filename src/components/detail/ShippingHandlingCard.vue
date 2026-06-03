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
        <ion-input
          v-model="draft.productWidth"
          type="number"
          :label="translate('Width')"
          label-placement="stacked"
        />
        <ion-input
          v-model="draft.productHeight"
          type="number"
          :label="translate('Height')"
          label-placement="stacked"
        />
        <ion-input
          v-model="draft.productDepth"
          type="number"
          :label="translate('Depth')"
          label-placement="stacked"
        />
        <ion-input
          v-model="draft.productWeight"
          type="number"
          :label="translate('Weight')"
          label-placement="stacked"
        />
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
        <ion-icon
          :icon="cubeOutline"
          aria-hidden="true"
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
import { IonButton, IonCheckbox, IonIcon, IonInput, IonItem, IonSelect, IonSelectOption } from "@ionic/vue"
import { cubeOutline } from "ionicons/icons"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import type { CatalogOption } from "@/domain/types/product"

defineProps<{
  draft: {
    productWidth: number | ""
    productHeight: number | ""
    productDepth: number | ""
    productWeight: number | ""
    inShippingBox: boolean
    chargeShipping: boolean
    defaultShipmentBoxTypeId: string
  }
  boxTypes: CatalogOption[]
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

.shipping-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
}

.shipping-illustration ion-icon {
  font-size: 220px;
  color: var(--ion-color-step-300, #b9b9c0);
}

@media (max-width: 860px) {
  .shipping-grid {
    grid-template-columns: 1fr;
  }

  .shipping-illustration {
    display: none;
  }
}
</style>
