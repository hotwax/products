<template>
  <div class="features">
    <div class="features-head">
      <span class="features-title">{{ translate("Features") }}</span>
      <ion-button
        v-if="canApplyFeatures"
        fill="clear"
        size="small"
        @click="openAddAxis"
      >
        {{ translate("Add feature") }}
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
          <ion-icon
            v-if="canRemoveFeatures"
            :icon="closeOutline"
            @click="$emit('toggle', { axis, application: appl, applied: true })"
          />
        </ion-chip>

        <ion-chip
          v-if="canApplyFeatures"
          outline
          class="add-chip"
          @click="openAddValue(axis.featureTypeId)"
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

    <ion-modal
      :is-open="addAxisOpen"
      @did-present="scrollAddFeatureToTop"
      @did-dismiss="closeAddAxis"
    >
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button
              :title="translate('Close')"
              @click="closeAddAxis"
            >
              <ion-icon
                slot="icon-only"
                :icon="closeOutline"
              />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("Add feature") }}</ion-title>
        </ion-toolbar>
        <ion-progress-bar :value="addAxisStep / 2" />
      </ion-header>
      <ion-content ref="addFeatureContent">
        <template v-if="addAxisStep === 1">
          <ion-list-header>
            <ion-label>{{ translate("Select feature type") }}</ion-label>
          </ion-list-header>
          <ion-list>
            <ion-item
              v-for="option in unusedFeatureTypes"
              :key="option.id"
              button
              detail
              @click="openFeatureTypeDetails(option.id)"
            >
              <ion-label>{{ option.label }}</ion-label>
            </ion-item>
          </ion-list>
        </template>

        <template v-else>
          <ion-list-header>
            <ion-label>{{ selectedFeatureTypeLabel }}</ion-label>
          </ion-list-header>
          <ion-list>
            <ion-item
              v-for="option in availableFeatureValues"
              :key="option.id"
              button
              @click="toggleFeatureValue(option.id)"
            >
              <ion-checkbox
                slot="start"
                :checked="selectedFeatureIds.has(option.id)"
                style="pointer-events: none"
              />
              <ion-label>{{ option.label }}</ion-label>
            </ion-item>
            <ion-item
              v-if="!availableFeatureValues.length"
              lines="none"
            >
              <ion-label color="medium">
                {{ translate("No existing features available for this type") }}
              </ion-label>
            </ion-item>
          </ion-list>

          <ion-list-header>
            <ion-label>{{ translate("Create new feature") }}</ion-label>
          </ion-list-header>
          <ion-list class="ion-padding-horizontal">
            <ion-input
              v-model="newFeatureDescription"
              class="ion-margin-vertical"
              :label="translate('Feature value')"
              label-placement="stacked"
              fill="outline"
              clear-input
            />
          </ion-list>
        </template>
      </ion-content>

      <ion-footer>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button
              v-if="addAxisStep === 2 && !startedFromExistingType"
              @click="backToFeatureTypes"
            >
              {{ translate("Back") }}
            </ion-button>
            <ion-button
              v-else
              color="medium"
              @click="closeAddAxis"
            >
              {{ translate("Cancel") }}
            </ion-button>
          </ion-buttons>
          <ion-buttons
            v-if="addAxisStep === 2"
            slot="end"
          >
            <ion-button
              color="primary"
              :disabled="!canAddSelectedFeatures"
              @click="addSelectedFeatures"
            >
              {{ translate("Add") }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem,
  IonLabel, IonList, IonListHeader, IonModal, IonProgressBar, IonTitle, IonToolbar
} from "@ionic/vue"
import { addCircleOutline, closeOutline } from "ionicons/icons"
import { type ComponentPublicInstance, computed, nextTick, ref } from "vue"
import { availableFeatureOptions } from "@/domain/normalize/feature"
import type { CatalogOption, FeatureAxis, ProductFeatureApplication } from "@/domain/types/product"

const props = withDefaults(defineProps<{
  familyAxes: FeatureAxis[]
  appliedFeatureIds: Set<string>
  featureTypes: CatalogOption[]
  featureCatalog: Record<string, unknown>[]
  canApplyFeatures?: boolean
  canRemoveFeatures?: boolean
}>(), {
  canApplyFeatures: true,
  canRemoveFeatures: true
})

const emit = defineEmits<{
  (event: "toggle", payload: { axis: FeatureAxis; application: ProductFeatureApplication; applied: boolean }): void
  (event: "addValues", payload: {
    featureTypeId: string
    featureTypeDescription: string
    features: CatalogOption[]
    newDescription: string
  }): void
}>()

const addAxisOpen = ref(false)
const selectedFeatureTypeId = ref("")
const selectedFeatureIds = ref(new Set<string>())
const newFeatureDescription = ref("")
const addAxisStep = ref<1 | 2>(1)
const startedFromExistingType = ref(false)
const addFeatureContent = ref<ComponentPublicInstance | null>(null)

type IonContentElement = HTMLElement & {
  scrollToTop: (duration?: number) => Promise<void>
}

const scrollAddFeatureToTop = async () => {
  await nextTick()
  const content = addFeatureContent.value?.$el as IonContentElement | undefined
  await content?.scrollToTop(0)
}

const unusedFeatureTypes = computed(() => {
  const used = new Set(props.familyAxes.map((axis) => axis.featureTypeId))

  return props.featureTypes.filter((option) => !used.has(option.id))
})

const selectedFeatureType = computed(() =>
  props.featureTypes.find(({ id }) => id === selectedFeatureTypeId.value))

const selectedFeatureTypeLabel = computed(() => selectedFeatureType.value?.label ?? "")

const availableFeatureValues = computed(() => availableFeatureOptions(
  props.featureCatalog,
  selectedFeatureTypeId.value,
  props.familyAxes.flatMap((axis) => axis.applications)
))

const canAddSelectedFeatures = computed(() =>
  selectedFeatureIds.value.size > 0 || Boolean(newFeatureDescription.value.trim()))

const openAddValue = (id: string) => {
  if(!props.canApplyFeatures) {return}
  startedFromExistingType.value = true
  selectedFeatureTypeId.value = id
  selectedFeatureIds.value = new Set()
  newFeatureDescription.value = ""
  addAxisStep.value = 2
  addAxisOpen.value = true
}

const openAddAxis = () => {
  if(!props.canApplyFeatures) {return}
  startedFromExistingType.value = false
  addAxisStep.value = 1
  selectedFeatureTypeId.value = ""
  selectedFeatureIds.value = new Set()
  newFeatureDescription.value = ""
  addAxisOpen.value = true
}

const closeAddAxis = () => {
  addAxisOpen.value = false
  startedFromExistingType.value = false
  addAxisStep.value = 1
  selectedFeatureTypeId.value = ""
  selectedFeatureIds.value = new Set()
  newFeatureDescription.value = ""
}

const openFeatureTypeDetails = (featureTypeId: string) => {
  selectedFeatureTypeId.value = featureTypeId
  selectedFeatureIds.value = new Set()
  newFeatureDescription.value = ""
  addAxisStep.value = 2
  scrollAddFeatureToTop()
}

const backToFeatureTypes = () => {
  selectedFeatureIds.value = new Set()
  newFeatureDescription.value = ""
  addAxisStep.value = 1
  scrollAddFeatureToTop()
}

const toggleFeatureValue = (productFeatureId: string) => {
  const next = new Set(selectedFeatureIds.value)
  if(next.has(productFeatureId)) {
    next.delete(productFeatureId)
  } else {
    next.add(productFeatureId)
  }
  selectedFeatureIds.value = next
}

const addSelectedFeatures = () => {
  if(!props.canApplyFeatures || !selectedFeatureType.value || !canAddSelectedFeatures.value) {return}
  const features = availableFeatureValues.value.filter(({ id }) => selectedFeatureIds.value.has(id))
  emit("addValues", {
    featureTypeId: selectedFeatureType.value.id,
    featureTypeDescription: selectedFeatureType.value.label,
    features,
    newDescription: newFeatureDescription.value.trim()
  })
  closeAddAxis()
}
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
