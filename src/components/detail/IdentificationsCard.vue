<template>
  <CardSection :title="translate('Product identifications')">
    <template #action>
      <ion-button
        v-if="canEdit"
        fill="clear"
        size="small"
        @click="editing = !editing"
      >
        {{ editing ? translate("Done") : translate("Edit") }}
      </ion-button>
    </template>

    <ion-list lines="full">
      <ion-item lines="full">
        <ion-label>
          <p>{{ translate("Product ID") }}</p>
        </ion-label>
        <ion-note slot="end">
          {{ productId }}
        </ion-note>
      </ion-item>

      <template v-if="!editing">
        <ion-item
          v-for="row in activeRows"
          :key="rowKey(row)"
        >
          <ion-label>
            <p>{{ row.typeDescription }}</p>
          </ion-label>
          <ion-note slot="end">
            {{ row.idValue }}
          </ion-note>
        </ion-item>
        <ion-item v-if="!activeRows.length">
          <ion-label color="medium">
            {{ translate("No identifications yet") }}
          </ion-label>
        </ion-item>
      </template>

      <template v-else-if="canEdit">
        <ion-item
          v-for="row in activeRows"
          :key="rowKey(row)"
        >
          <ion-input
            :value="drafts[rowKey(row)] ?? row.idValue"
            :label="row.typeDescription"
            label-placement="stacked"
            :disabled="!canEdit"
            @ion-input="drafts[rowKey(row)] = $event.detail.value ?? ''"
            @ion-blur="commitValue(row)"
          />
          <ion-button
            slot="end"
            fill="clear"
            color="danger"
            size="small"
            @click="$emit('expire', { goodIdentificationTypeId: row.goodIdentificationTypeId, fromDate: row.fromDate })"
          >
            {{ translate("Expire") }}
          </ion-button>
        </ion-item>

        <ion-item lines="none">
          <ion-select
            v-model="newTypeId"
            :label="translate('Add identification')"
            :placeholder="translate('Type')"
            interface="popover"
            :disabled="!canEdit"
          >
            <ion-select-option
              v-for="option in availableTypes"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </ion-select-option>
          </ion-select>
          <ion-input
            v-model="newValue"
            :placeholder="translate('Value')"
            :disabled="!canEdit"
            @keyup.enter="addNew"
          />
          <ion-button
            slot="end"
            size="small"
            :disabled="!newTypeId || !newValue.trim()"
            @click="addNew"
          >
            {{ translate("Add") }}
          </ion-button>
        </ion-item>
      </template>
    </ion-list>
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton, IonInput, IonItem, IonLabel, IonList, IonNote, IonSelect, IonSelectOption } from "@ionic/vue"
import { computed, reactive, ref } from "vue"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import type { CatalogOption, ProductIdentification } from "@/domain/types/product"
import type { IdentificationCreate, IdentificationKey } from "@/domain/types/pim"

const props = withDefaults(defineProps<{
  productId: string
  identifications: ProductIdentification[]
  identificationTypes: CatalogOption[]
  canEdit?: boolean
}>(), {
  canEdit: true
})

const emit = defineEmits<{
  (event: "add", payload: IdentificationCreate): void
  (event: "updateValue", payload: { key: IdentificationKey; idValue: string }): void
  (event: "expire", key: IdentificationKey): void
}>()

const editing = ref(false)
const drafts = reactive<Record<string, string>>({})
const newTypeId = ref("")
const newValue = ref("")

const activeRows = computed(() => props.identifications.filter((row) => row.active))
const rowKey = (row: ProductIdentification) => `${row.goodIdentificationTypeId}|${row.fromDate}`

const availableTypes = computed(() => {
  const used = new Set(activeRows.value.map((row) => row.goodIdentificationTypeId))

  return props.identificationTypes.filter((option) => !used.has(option.id))
})

const commitValue = (row: ProductIdentification) => {
  if(!props.canEdit) {return}
  const value = (drafts[rowKey(row)] ?? row.idValue).trim()
  if(value && value !== row.idValue) {
    emit("updateValue", { key: { goodIdentificationTypeId: row.goodIdentificationTypeId, fromDate: row.fromDate }, idValue: value })
  }
}

const addNew = () => {
  if(!props.canEdit) {return}
  if(!newTypeId.value || !newValue.value.trim()) {return}
  emit("add", { goodIdentificationTypeId: newTypeId.value, idValue: newValue.value.trim() })
  newTypeId.value = ""
  newValue.value = ""
}
</script>
