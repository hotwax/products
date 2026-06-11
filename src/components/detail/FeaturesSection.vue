<template>
  <div class="features">
    <div class="features-head">
      <span class="features-title">{{ translate("Features") }}</span>
      <ion-button
        fill="clear"
        size="small"
        @click="addAxisOpen = true"
      >
        {{ translate("Add") }}
      </ion-button>
    </div>

    <div
      v-for="axis in familyAxes"
      :key="axis.featureTypeId"
      class="axis"
    >
      <p class="axis-label">
        {{ axis.featureTypeDescription }}
      </p>
      <div class="axis-chips">
        <ion-chip
          v-for="appl in axis.applications"
          :key="appl.productFeatureId"
          outline
        >
          <ion-label>{{ appl.description }}</ion-label>
          <ion-icon :icon="closeOutline" @click="$emit('toggle', { axis, application: appl, applied: true })" />
        </ion-chip>

        <ion-chip
          outline
          class="add-chip"
          @click="openAddValue(axis.featureTypeId, axis.featureTypeDescription)"
        >
          <ion-icon :icon="addCircleOutline" />
          <ion-label>{{ translate("add") }} {{ axis.featureTypeDescription.toLowerCase() }}</ion-label>
        </ion-chip>
      </div>
    </div>

    <p
      v-if="!familyAxes.length"
      class="axis-label"
    >
      {{ translate("No features yet — add an axis to get started") }}
    </p>

    <!-- new value on an existing axis -->
    <ion-alert
      :is-open="!!addValueAxis"
      :header="`${translate('Add')} ${addValueAxis?.label ?? ''}`"
      :inputs="[{ name: 'value', type: 'text', placeholder: translate('Value') }]"
      :buttons="addValueButtons"
      @did-dismiss="addValueAxis = null"
    />

    <!-- brand-new axis -->
    <ion-modal
      :is-open="addAxisOpen"
      @did-dismiss="addAxisOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ translate("Add feature axis") }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="addAxisOpen = false">
              {{ translate("Close") }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item
            v-for="option in unusedFeatureTypes"
            :key="option.id"
            button
            @click="pickAxis(option)"
          >
            <ion-label>{{ option.label }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import {
  IonAlert, IonButton, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal,
  IonTitle, IonToolbar
} from "@ionic/vue"
import { addCircleOutline, checkmarkOutline, closeOutline } from "ionicons/icons"
import { computed, ref } from "vue"
import { translate } from "@common"
import type { CatalogOption, FeatureAxis, ProductFeatureApplication } from "@/domain/types/product"

const props = defineProps<{
  familyAxes: FeatureAxis[]
  appliedFeatureIds: Set<string>
  featureTypes: CatalogOption[]
}>()

const emit = defineEmits<{
  (event: "toggle", payload: { axis: FeatureAxis; application: ProductFeatureApplication; applied: boolean }): void
  (event: "createValue", payload: { featureTypeId: string; description: string }): void
}>()

const addAxisOpen = ref(false)
const addValueAxis = ref<{ id: string; label: string } | null>(null)

const isApplied = (productFeatureId: string) => props.appliedFeatureIds.has(productFeatureId)

const unusedFeatureTypes = computed(() => {
  const used = new Set(props.familyAxes.map((axis) => axis.featureTypeId))

  return props.featureTypes.filter((option) => !used.has(option.id))
})

const openAddValue = (id: string, label: string) => {
  addValueAxis.value = { id, label }
}

const pickAxis = (option: CatalogOption) => {
  addAxisOpen.value = false
  openAddValue(option.id, option.label)
}

const addValueButtons = computed(() => [
  { text: translate("Cancel"), role: "cancel" },
  {
    text: translate("Add"),
    handler: (data: { value?: string }) => {
      const description = data.value?.trim()
      if(description && addValueAxis.value) {
        emit("createValue", { featureTypeId: addValueAxis.value.id, description })
      }
    }
  }
])
</script>

<style scoped>
.features {
  padding: 0 16px 8px;
}

.features-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.features-title {
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

.add-chip {
  --color: var(--ion-color-primary);
}
</style>
