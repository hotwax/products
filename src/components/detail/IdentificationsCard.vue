<template>
  <CardSection :title="translate('Product identifications')">
    <template #action>
      <ion-button
        v-if="canEdit"
        fill="clear"
        size="small"
        @click="modalOpen = true"
      >
        {{ translate("Edit") }}
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
    </ion-list>

    <IdentificationsModal
      :is-open="modalOpen"
      :product-id="productId"
      :identifications="identifications"
      :identification-types="identificationTypes"
      @add="$emit('add', $event)"
      @update-value="$emit('updateValue', $event)"
      @expire="$emit('expire', $event)"
      @dismiss="modalOpen = false"
    />
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton, IonItem, IonLabel, IonList, IonNote } from "@ionic/vue"
import { computed, ref } from "vue"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import IdentificationsModal from "./IdentificationsModal.vue"
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

defineEmits<{
  (event: "add", payload: IdentificationCreate): void
  (event: "updateValue", payload: { key: IdentificationKey; idValue: string }): void
  (event: "expire", key: IdentificationKey): void
}>()

const modalOpen = ref(false)
const activeRows = computed(() => props.identifications.filter((row) => row.active))
const rowKey = (row: ProductIdentification) => `${row.goodIdentificationTypeId}|${row.fromDate}`
</script>
