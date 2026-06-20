<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Edit identifications") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('dismiss')">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list lines="none">
        <ion-item>
          <ion-input
            class="ion-margin-vertical"
            :value="productId"
            :label="translate('Product ID')"
            label-placement="stacked"
            fill="outline"
            readonly
          />
        </ion-item>

        <ion-item
          v-for="type in identificationTypes"
          :key="type.id"
        >
          <ion-input
            class="ion-margin-vertical"
            :value="drafts[type.id] ?? ''"
            :label="type.label"
            label-placement="stacked"
            fill="outline"
            @ion-input="drafts[type.id] = $event.detail.value ?? ''"
          />
          <ion-button
            v-if="activeByType[type.id]"
            slot="end"
            fill="clear"
            color="danger"
            size="small"
            @click="onExpire(type.id)"
          >
            {{ translate("Expire") }}
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-content>

    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button :disabled="!changedCount" @click="save">
        <ion-icon :icon="saveOutline"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonFab, IonFabButton, IonIcon, IonContent, IonHeader, IonInput, IonItem, IonList, IonModal, IonTitle, IonToolbar } from "@ionic/vue"
import { computed, reactive, watch } from "vue"
import { translate } from "@common"
import type { CatalogOption, ProductIdentification } from "@/domain/types/product"
import type { IdentificationCreate, IdentificationKey } from "@/domain/types/pim"
import { saveOutline } from "ionicons/icons"

const props = defineProps<{
  isOpen: boolean
  productId: string
  identifications: ProductIdentification[]
  identificationTypes: CatalogOption[]
}>()

const emit = defineEmits<{
  (event: "add", payload: IdentificationCreate): void
  (event: "updateValue", payload: { key: IdentificationKey; idValue: string }): void
  (event: "expire", key: IdentificationKey): void
  (event: "dismiss"): void
}>()

const drafts = reactive<Record<string, string>>({})

const activeByType = computed(() => {
  const map: Record<string, ProductIdentification> = {}
  for(const row of props.identifications.filter((r) => r.active)) {
    if(!map[row.goodIdentificationTypeId]) {
      map[row.goodIdentificationTypeId] = row
    }
  }

  return map
})

// Reset drafts to current values whenever the modal opens
watch(
  () => props.isOpen,
  (open) => {
    if(!open) {return}
    for(const type of props.identificationTypes) {
      drafts[type.id] = activeByType.value[type.id]?.idValue ?? ""
    }
  }
)

// Clear draft for a type when its identification is expired externally
watch(
  () => props.identifications,
  () => {
    for(const type of props.identificationTypes) {
      if(!activeByType.value[type.id]) {
        drafts[type.id] = ""
      }
    }
  }
)

const changedCount = computed(() =>
  props.identificationTypes.filter((type) => {
    const original = activeByType.value[type.id]?.idValue ?? ""
    const current = (drafts[type.id] ?? "").trim()

    return current !== "" && current !== original
  }).length
)

const onExpire = (typeId: string) => {
  const row = activeByType.value[typeId]
  if(!row) {return}
  drafts[typeId] = ""
  emit("expire", { goodIdentificationTypeId: row.goodIdentificationTypeId, fromDate: row.fromDate })
}

const save = () => {
  for(const type of props.identificationTypes) {
    const original = activeByType.value[type.id]?.idValue ?? ""
    const current = (drafts[type.id] ?? "").trim()
    if(!current || current === original) {continue}

    if(activeByType.value[type.id]) {
      emit("updateValue", {
        key: { goodIdentificationTypeId: type.id, fromDate: activeByType.value[type.id].fromDate },
        idValue: current
      })
    } else {
      emit("add", { goodIdentificationTypeId: type.id, idValue: current })
    }
  }
  emit("dismiss")
}
</script>

<style scoped>
  ion-content {
    --padding-bottom: 80px;
  }
</style>
