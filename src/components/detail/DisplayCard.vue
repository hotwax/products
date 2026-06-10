<template>
  <CardSection :title="translate('Display')">
    <div class="grid-4">
      <ion-input
        v-model="draft.productName"
        :label="translate('Name')"
        label-placement="stacked"
        :disabled="!canEdit"
      />
      <ion-input
        v-model="draft.internalName"
        :label="translate('Internal name')"
        label-placement="stacked"
        :helper-text="duplicateHint"
        :disabled="!canEdit"
      />
      <ion-input
        v-model="draft.brandName"
        :label="translate('Brand name')"
        label-placement="stacked"
        :disabled="!canEdit"
      />
      <ion-select
        v-model="draft.productTypeId"
        :label="translate('Type')"
        label-placement="stacked"
        interface="popover"
        :disabled="!canEdit"
      >
        <ion-select-option
          v-for="option in productTypes"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </ion-select-option>
      </ion-select>
    </div>
    <div class="grid-desc">
      <ion-textarea
        v-model="draft.description"
        :label="translate('Desc')"
        label-placement="stacked"
        auto-grow
        :disabled="!canEdit"
      />
      <ion-textarea
        v-model="draft.longDescription"
        :label="translate('Long desc')"
        label-placement="stacked"
        auto-grow
        :disabled="!canEdit"
      />
    </div>

    <template #footer>
      <SaveFooter
        :dirty="dirty"
        :saving="saving"
        :can-save="canEdit"
        :stale-under-edit="staleUnderEdit"
        @save="$emit('save')"
        @reset="$emit('reset')"
      />
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { IonInput, IonSelect, IonSelectOption, IonTextarea } from "@ionic/vue"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import type { CatalogOption } from "@/domain/types/product"

withDefaults(defineProps<{
  draft: {
    productName: string
    internalName: string
    brandName: string
    productTypeId: string
    description: string
    longDescription: string
  }
  productTypes: CatalogOption[]
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
  canEdit?: boolean
  duplicateHint?: string
}>(), {
  canEdit: true,
  duplicateHint: ""
})

defineEmits<{
  (event: "save"): void
  (event: "reset"): void
}>()
</script>

<style scoped>
.grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.grid-desc {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-top: 16px;
}

@media (max-width: 720px) {
  .grid-desc {
    grid-template-columns: 1fr;
  }
}
</style>
