<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/products/${productId}`" />
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Features</ion-title>
      </ion-toolbar>
      <ion-progress-bar
        v-if="loading"
        type="indeterminate"
      />
    </ion-header>

    <ion-content>
      <ErrorState
        v-if="featureFamilyError"
        title="Could not load features"
        :message="featureFamilyError"
      />

      <template v-if="family">
        <ion-card class="hero-card">
          <ion-card-content>
            <div class="hero-grid">
              <ion-thumbnail class="hero-thumb">
                <DxpShopifyImg
                  :src="family.virtualProductImageUrl"
                  size="small"
                />
              </ion-thumbnail>
              <div class="hero-meta">
                <p class="hero-eyebrow">
                  Virtual product · {{ family.virtualProductId }}
                </p>
                <h1>{{ family.virtualProductName || family.virtualProductId }}</h1>
                <p>
                  {{ family.variants.length }} variants ·
                  {{ family.featureTypes.length }} feature axes ·
                  {{ totalApplications }} feature applications
                </p>
              </div>
              <div class="hero-stats">
                <div class="hero-stat">
                  <span>{{ selectableCount }}</span>
                  <span>Selectable</span>
                </div>
                <div class="hero-stat">
                  <span>{{ standardCount }}</span>
                  <span>Standard</span>
                </div>
                <div class="hero-stat">
                  <span>{{ missingCount }}</span>
                  <span>Missing</span>
                </div>
              </div>
            </div>

            <ion-segment
              v-model="view"
              class="view-segment"
            >
              <ion-segment-button value="matrix">
                <ion-icon :icon="gridOutline" />
                <ion-label>Variant matrix</ion-label>
              </ion-segment-button>
              <ion-segment-button value="selectable">
                <ion-icon :icon="optionsOutline" />
                <ion-label>Selectable features</ion-label>
              </ion-segment-button>
              <ion-segment-button value="variant">
                <ion-icon :icon="cubeOutline" />
                <ion-label>This variant</ion-label>
              </ion-segment-button>
            </ion-segment>

            <div class="hero-context">
              <ion-note v-if="!isVirtual">
                Viewing variant {{ productId }}.
                <ion-button
                  v-if="family.virtualProductId !== productId"
                  fill="clear"
                  size="small"
                  :router-link="`/products/${family.virtualProductId}/features`"
                >
                  Open virtual parent
                  <ion-icon
                    slot="end"
                    :icon="openOutline"
                  />
                </ion-button>
              </ion-note>
              <ion-note v-else>
                Viewing the virtual umbrella. Add selectable features to expand the option space.
              </ion-note>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Variant matrix view -->
        <ion-card
          v-if="view === 'matrix'"
          class="matrix-card"
        >
          <ion-card-header>
            <ion-card-subtitle>
              Variant × feature matrix
            </ion-card-subtitle>
            <ion-card-title>
              {{ family.variants.length }} variants across {{ family.featureTypes.length }} axes
            </ion-card-title>
            <p class="card-blurb">
              Each row is a sellable variant SKU. Each column is a feature axis defined on the virtual.
              Click a cell to swap which feature value the variant carries — useful when a SKU was mis-tagged at import.
            </p>
          </ion-card-header>
          <ion-card-content>
            <div
              v-if="!family.featureTypes.length"
              class="matrix-empty"
            >
              <ion-icon :icon="gridOutline" />
              <h3>No feature axes yet</h3>
              <p>Add a selectable feature on the virtual product to start the matrix.</p>
            </div>
            <div
              v-else
              class="matrix-scroll"
            >
              <div
                class="matrix-row matrix-row--header"
                :style="matrixRowStyle"
              >
                <ion-item
                  lines="none"
                  class="matrix-cell-item matrix-cell-item--variant"
                >
                  <ion-label>
                    <p>Variant</p>
                  </ion-label>
                </ion-item>
                <ion-item
                  v-for="featureType in family.featureTypes"
                  :key="`head-${featureType.featureTypeId}`"
                  lines="none"
                  class="matrix-cell-item"
                >
                  <ion-label>
                    <h3>{{ featureType.featureTypeDescription }}</h3>
                    <p>{{ featureType.featureCount }} options</p>
                  </ion-label>
                </ion-item>
              </div>

              <div
                v-for="variant in family.variants"
                :key="variant.productId"
                class="matrix-row"
                :class="{ 'matrix-row--current': variant.productId === productId }"
                :style="matrixRowStyle"
              >
                <ion-item
                  lines="none"
                  class="matrix-cell-item matrix-cell-item--variant"
                  :button="variant.productId !== productId"
                  :router-link="variant.productId !== productId ? `/products/${variant.productId}/features` : undefined"
                >
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg
                      :src="variant.imageUrl"
                      size="thumb"
                    />
                  </ion-thumbnail>
                  <ion-label>
                    <h3>{{ variant.productName || variant.internalName || variant.productId }}</h3>
                    <p>{{ variant.productId }}</p>
                  </ion-label>
                  <ion-icon
                    v-if="variant.productId !== productId"
                    slot="end"
                    :icon="openOutline"
                  />
                </ion-item>
                <ion-item
                  v-for="featureType in family.featureTypes"
                  :key="`${variant.productId}-${featureType.featureTypeId}`"
                  lines="none"
                  :class="['matrix-cell-item', cellClass(variant, featureType)]"
                >
                  <div
                    v-if="cellFor(variant, featureType)"
                    slot="start"
                    class="matrix-swatch"
                  >
                    {{ swatchInitial(cellFor(variant, featureType)!) }}
                  </div>
                  <ion-label v-if="cellFor(variant, featureType)">
                    <h3>{{ cellFor(variant, featureType)!.description || cellFor(variant, featureType)!.productFeatureId }}</h3>
                    <p>{{ cellFor(variant, featureType)!.productFeatureId }}</p>
                  </ion-label>
                  <ion-label v-else>
                    <p>
                      <ion-icon :icon="alertCircleOutline" />
                      Missing
                    </p>
                  </ion-label>
                </ion-item>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Selectable features view (virtual scope) -->
        <ion-card
          v-if="view === 'selectable'"
          class="selectable-card"
        >
          <ion-card-header>
            <ion-card-subtitle>
              Selectable feature pool
            </ion-card-subtitle>
            <ion-card-title>
              {{ family.selectableFeatures.length }} features available to variants
            </ion-card-title>
            <p>
              These are the features a customer can pick from on the storefront. They belong to the virtual product
              and define the option space every variant draws from.
            </p>
          </ion-card-header>
          <ion-card-content>
            <div class="add-actions">
              <ion-button
                fill="solid"
                @click="openAddModalFor(family.virtualProductId, '')"
              >
                <ion-icon
                  slot="start"
                  :icon="addCircleOutline"
                />
                Add features
              </ion-button>
            </div>

            <div class="selectable-groups">
              <div
                v-for="group in groupedSelectable"
                :key="group.featureTypeId"
                class="selectable-group"
              >
                <header class="selectable-group__header">
                  <span>{{ selectableGroupLabel(group) }}</span>
                  <ion-button
                    fill="clear"
                    size="small"
                    @click="openAddModalFor(family.virtualProductId, group.featureTypeId)"
                  >
                    <ion-icon
                      slot="start"
                      :icon="addCircleOutline"
                    />
                    Add more {{ group.featureTypeDescription }}
                  </ion-button>
                </header>
                <div class="selectable-group__chips">
                  <span
                    v-for="appl in group.entries"
                    :key="appl.productFeatureId"
                    :class="['feature-chip', { 'feature-chip--inactive': !appl.active }]"
                  >
                    <span class="feature-swatch feature-swatch--sm">
                      {{ swatchInitial(appl) }}
                    </span>
                    <span class="feature-chip__body">
                      <span>{{ appl.description || appl.productFeatureId }}</span>
                      <span>{{ appl.applTypeDescription }}</span>
                    </span>
                    <button
                      class="feature-chip__close"
                      :aria-label="`Remove ${appl.description}`"
                      @click="removeFeature(appl)"
                    >
                      <ion-icon :icon="closeOutline" />
                    </button>
                  </span>
                </div>
              </div>
              <div
                v-if="!groupedSelectable.length"
                class="selectable-empty"
              >
                <ion-icon :icon="optionsOutline" />
                <h3>No selectable features yet</h3>
                <p>Click "Add features" above to make the first option a customer can pick.</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- This-variant view -->
        <ion-card
          v-if="view === 'variant'"
          class="variant-card"
        >
          <ion-card-header>
            <ion-card-subtitle>
              {{ isVirtual ? "Virtual product" : "Variant standard features" }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ currentVariantFeatures.length }} standard features locked to this SKU
            </ion-card-title>
            <p>
              Standard features describe what this variant physically is. Swap them when an import labelled the SKU
              wrong, expire them if the variant should be retired from the customer-facing option space.
            </p>
          </ion-card-header>
          <ion-card-content>
            <div class="add-actions">
              <ion-button
                fill="solid"
                @click="openAddModalFor(productId, '')"
              >
                <ion-icon
                  slot="start"
                  :icon="addCircleOutline"
                />
                Add features
              </ion-button>
            </div>

            <div
              v-if="!currentVariantFeatures.length"
              class="variant-empty"
            >
              <ion-icon :icon="cubeOutline" />
              <h3>No features applied</h3>
              <p>
                {{ isVirtual ? "Virtual products usually carry selectable features rather than standard ones." : "This variant has no STANDARD_FEATURE rows yet." }}
              </p>
            </div>
            <ion-list
              v-else
              lines="none"
              class="variant-features"
            >
              <ion-item
                v-for="appl in currentVariantFeatures"
                :key="`${appl.productFeatureId}-${appl.fromDate}`"
                :class="['feature-row', { 'feature-row--inactive': !appl.active }]"
              >
                <div
                  slot="start"
                  class="feature-swatch"
                >
                  {{ swatchInitial(appl) }}
                </div>
                <ion-label>
                  <h3>{{ appl.description || appl.productFeatureId }}</h3>
                  <p>
                    {{ appl.featureTypeDescription }} ·
                    {{ appl.productFeatureId }}
                    <span v-if="appl.abbrev"> · {{ appl.abbrev }}</span>
                  </p>
                  <p class="feature-row__meta">
                    <ion-badge :color="appl.active ? 'success' : 'medium'">
                      {{ appl.applTypeDescription }}
                    </ion-badge>
                    <span>{{ appl.fromDate || "Started today" }} → {{ appl.thruDate || "no end" }}</span>
                  </p>
                </ion-label>
                <ion-button
                  slot="end"
                  size="small"
                  fill="outline"
                  @click="openSwapModal(appl)"
                >
                  <ion-icon
                    slot="start"
                    :icon="swapHorizontalOutline"
                  />
                  Swap
                </ion-button>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </template>

      <EmptyState
        v-if="!loading && !featureFamilyError && !family"
        title="Product not loaded"
        message="Open a product from the workbench."
      />

      <!-- Add / swap feature modal -->
      <ion-modal
        :is-open="isFeatureModalOpen"
        @did-dismiss="closeFeatureModal"
      >
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeFeatureModal">
                <ion-icon
                  slot="icon-only"
                  :icon="closeOutline"
                />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ modalTitle }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list lines="none">
            <ion-item>
              <ion-select
                v-model="modalApplTypeId"
                label="Application type"
                label-placement="stacked"
                interface="popover"
              >
                <ion-select-option
                  v-for="applType in productsStore.featureApplTypeCatalog"
                  :key="applType.id"
                  :value="applType.id"
                >
                  {{ applType.description }} ({{ applType.id }})
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select
                v-model="modalFeatureTypeId"
                label="Feature type"
                label-placement="stacked"
                interface="popover"
                :disabled="lockFeatureType"
              >
                <ion-select-option value="">
                  Any feature type
                </ion-select-option>
                <ion-select-option
                  v-for="featureType in productsStore.featureTypeCatalog"
                  :key="featureType.id"
                  :value="featureType.id"
                >
                  {{ featureType.description }}
                </ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>

          <ion-searchbar
            v-model="searchTerm"
            placeholder="Search by ID, description, or abbreviation"
            :debounce="220"
            @ion-input="onSearchInput"
          />
          <ion-item
            v-if="!filteredFeatureSuggestions.length && featureSearchStatus !== 'pending'"
            lines="none"
          >
            <ion-label>
              <p>{{ searchTerm ? `No catalog feature matches "${searchTerm}".` : "No catalog features loaded yet." }}</p>
            </ion-label>
          </ion-item>
          <ion-list lines="none">
            <ion-item
              v-for="record in filteredFeatureSuggestions"
              :key="record.productFeatureId"
            >
              <div
                slot="start"
                class="feature-swatch"
              >
                {{ swatchInitialFromRecord(record) }}
              </div>
              <ion-checkbox
                :checked="selectedFeatureIds.includes(record.productFeatureId)"
                :disabled="Boolean(swapTarget) && selectedFeatureIds.length >= 1 && !selectedFeatureIds.includes(record.productFeatureId)"
                justify="space-between"
                @ion-change="toggleSelection(record.productFeatureId, $event.detail.checked)"
              >
                <ion-label>
                  <h3>{{ record.description || record.productFeatureId }}</h3>
                  <p>{{ record.featureTypeDescription }} · {{ record.productFeatureId }}</p>
                </ion-label>
              </ion-checkbox>
            </ion-item>
          </ion-list>
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <ion-button
              slot="end"
              fill="solid"
              :disabled="!selectedFeatureIds.length"
              @click="applySelectedFromModal"
            >
              <ion-icon
                slot="start"
                :icon="addCircleOutline"
              />
              {{ applyButtonLabel }}
            </ion-button>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonNote,
  IonPage,
  IonProgressBar,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import {
  addCircleOutline,
  alertCircleOutline,
  closeOutline,
  cubeOutline,
  gridOutline,
  openOutline,
  optionsOutline,
  swapHorizontalOutline
} from "ionicons/icons"
import { storeToRefs } from "pinia"
import { computed, onMounted, ref, watch } from "vue"
import { DxpShopifyImg } from "@common"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"
import type {
  ProductFeatureApplication,
  ProductFeatureFamilyType,
  ProductFeatureFamilyVariant,
  ProductFeatureRecord
} from "@/types/product"
import { showToast } from "@/utils"

const props = defineProps<{
  productId: string
}>()

const productsStore = useProductsStore()
const {
  featureFamily,
  featureFamilyStatus,
  featureFamilyError,
  featureSearchResults,
  featureSearchStatus
} = storeToRefs(productsStore)

const view = ref<"matrix" | "selectable" | "variant">("matrix")
const searchTerm = ref("")
const isFeatureModalOpen = ref(false)
const selectedFeatureIds = ref<string[]>([])
const swapTarget = ref<ProductFeatureApplication | null>(null)
const modalApplTypeId = ref("SELECTABLE_FEATURE")
const modalFeatureTypeId = ref("")
const modalTargetProductId = ref("")
const lockFeatureType = ref(false)

onMounted(() => {
  productsStore.loadFeatureFamily(props.productId).catch(() => undefined)
  productsStore.loadFeatureCatalogs().catch(() => undefined)
  productsStore.clearFeatureSearch()
})

watch(() => props.productId, (productId) => {
  productsStore.loadFeatureFamily(productId).catch(() => undefined)
  productsStore.clearFeatureSearch()
  searchTerm.value = ""
  view.value = isVirtual.value ? "matrix" : "matrix"
})

watch(searchTerm, (term) => {
  if(!term.trim()) {
    productsStore.clearFeatureSearch()
  }
})

const loading = computed(() => featureFamilyStatus.value === "pending")
const family = computed(() => featureFamily.value)
const isVirtual = computed(() => Boolean(family.value && family.value.virtualProductId === props.productId))

const totalApplications = computed(() => {
  if(!family.value) {return 0}
  const fromVariants = family.value.variants.reduce((sum, variant) => sum + variant.features.length, 0)

  return family.value.selectableFeatures.length + fromVariants
})

const selectableCount = computed(() => family.value?.selectableFeatures.length || 0)
const standardCount = computed(() => family.value?.variants.reduce((sum, variant) => sum + variant.features.length, 0) || 0)
const missingCount = computed(() => {
  if(!family.value) {return 0}
  let missing = 0
  family.value.variants.forEach((variant) => {
    family.value!.featureTypes.forEach((featureType) => {
      if(!variant.features.some((appl) => appl.featureTypeId === featureType.featureTypeId)) {
        missing += 1
      }
    })
  })

  return missing
})

const currentVariant = computed(() => family.value?.variants.find((variant) => variant.productId === props.productId))
const currentVariantFeatures = computed(() => currentVariant.value?.features || [])

const groupedSelectable = computed(() => {
  if(!family.value) {return []}
  const groups = new Map<string, { featureTypeId: string, featureTypeDescription: string, entries: ProductFeatureApplication[] }>()
  family.value.selectableFeatures.forEach((appl) => {
    const key = appl.featureTypeId || "OTHER"
    const entry = groups.get(key) || {
      featureTypeId: key,
      featureTypeDescription: appl.featureTypeDescription || "Other",
      entries: []
    }
    entry.entries.push(appl)
    groups.set(key, entry)
  })

  return Array.from(groups.values())
})

function selectableGroupLabel(group: { featureTypeDescription: string, entries: ProductFeatureApplication[] }): string {
  const count = group.entries.length
  const label = group.featureTypeDescription.toLowerCase()
  const plural = count === 1 ? label : `${label}s`

  return `${count} ${plural}`
}

const matrixRowStyle = computed(() => {
  const columns = family.value?.featureTypes.length || 0

  // Fixed-width feature columns keep cells compact and uniform; a trailing
  // spacer track absorbs leftover width so columns don't balloon when there
  // are only a few feature axes.
  return {
    gridTemplateColumns: `minmax(220px, 300px) repeat(${columns}, minmax(180px, 240px)) minmax(0, 1fr)`
  }
})

function cellFor(variant: ProductFeatureFamilyVariant, featureType: ProductFeatureFamilyType): ProductFeatureApplication | undefined {
  return variant.features.find((appl) => appl.featureTypeId === featureType.featureTypeId)
}

function cellClass(variant: ProductFeatureFamilyVariant, featureType: ProductFeatureFamilyType): string {
  const cell = cellFor(variant, featureType)
  if(!cell) {return "matrix-cell-item--missing"}
  if(!cell.active) {return "matrix-cell-item--expired"}

  return ""
}

function swatchInitial(appl: ProductFeatureApplication): string {
  const source = appl.abbrev || appl.description || appl.productFeatureId

  return source.charAt(0).toUpperCase()
}

function swatchInitialFromRecord(record: ProductFeatureRecord): string {
  const source = record.abbrev || record.description || record.productFeatureId

  return source.charAt(0).toUpperCase()
}

const filteredFeatureSuggestions = computed(() => {
  const base = searchTerm.value.trim() ? featureSearchResults.value : productsStore.featureCatalog
  const scoped = modalFeatureTypeId.value
    ? base.filter((record) => record.productFeatureTypeId === modalFeatureTypeId.value)
    : base

  return scoped.slice(0, 50)
})

const modalTitle = computed(() => {
  if(swapTarget.value) {return `Swap ${swapTarget.value.featureTypeDescription}`}
  if(lockFeatureType.value && modalFeatureTypeId.value) {
    const found = productsStore.featureTypeCatalog.find((entry) => entry.id === modalFeatureTypeId.value)

    return `Add more ${found?.description || modalFeatureTypeId.value}`
  }

  return "Add features"
})

const applyButtonLabel = computed(() => {
  if(swapTarget.value) {return "Swap feature"}
  if(selectedFeatureIds.value.length > 1) {return `Apply ${selectedFeatureIds.value.length} features`}

  return "Apply feature"
})

function defaultApplTypeFor(productId: string): string {
  if(!family.value) {return "SELECTABLE_FEATURE"}

  return productId === family.value.virtualProductId ? "SELECTABLE_FEATURE" : "STANDARD_FEATURE"
}

function onSearchInput() {
  const term = searchTerm.value.trim()
  if(!term) {
    productsStore.clearFeatureSearch()

    return
  }
  productsStore.runFeatureSearch(term).catch(() => undefined)
}

function closeFeatureModal() {
  isFeatureModalOpen.value = false
  selectedFeatureIds.value = []
  swapTarget.value = null
  searchTerm.value = ""
  modalFeatureTypeId.value = ""
  lockFeatureType.value = false
  productsStore.clearFeatureSearch()
}

function openAddModalFor(productId: string, featureTypeId: string) {
  swapTarget.value = null
  modalTargetProductId.value = productId
  modalApplTypeId.value = defaultApplTypeFor(productId)
  modalFeatureTypeId.value = featureTypeId
  lockFeatureType.value = Boolean(featureTypeId)
  searchTerm.value = ""
  selectedFeatureIds.value = []
  productsStore.clearFeatureSearch()
  isFeatureModalOpen.value = true
}

function openSwapModal(target: ProductFeatureApplication) {
  swapTarget.value = target
  modalTargetProductId.value = target.productId
  modalApplTypeId.value = target.productFeatureApplTypeId || defaultApplTypeFor(target.productId)
  modalFeatureTypeId.value = target.featureTypeId
  lockFeatureType.value = true
  searchTerm.value = target.featureTypeDescription
  selectedFeatureIds.value = []
  productsStore.runFeatureSearch(target.featureTypeDescription).catch(() => undefined)
  isFeatureModalOpen.value = true
}

function toggleSelection(productFeatureId: string, checked: boolean) {
  if(checked) {
    if(!selectedFeatureIds.value.includes(productFeatureId)) {
      selectedFeatureIds.value = [...selectedFeatureIds.value, productFeatureId]
    }
  } else {
    selectedFeatureIds.value = selectedFeatureIds.value.filter((id) => id !== productFeatureId)
  }
}

function lookupRecord(productFeatureId: string): ProductFeatureRecord | undefined {
  return featureSearchResults.value.find((entry) => entry.productFeatureId === productFeatureId) ||
    productsStore.featureCatalog.find((entry) => entry.productFeatureId === productFeatureId)
}

function applySelectedFromModal() {
  const applType = productsStore.featureApplTypeCatalog.find((entry) => entry.id === modalApplTypeId.value)
  const applTypeDescription = applType?.description || modalApplTypeId.value

  if(swapTarget.value) {
    const record = lookupRecord(selectedFeatureIds.value[0]!)
    if(!record) {return}
    productsStore.removeFeatureApplication({
      productId: swapTarget.value.productId,
      productFeatureId: swapTarget.value.productFeatureId,
      productFeatureApplTypeId: swapTarget.value.productFeatureApplTypeId
    })
    productsStore.addFeatureApplication({
      productId: modalTargetProductId.value,
      record,
      productFeatureApplTypeId: modalApplTypeId.value,
      applTypeDescription
    })
    showToast(`Swapped to ${record.description || record.productFeatureId} (local only).`)
    closeFeatureModal()

    return
  }

  let applied = 0
  selectedFeatureIds.value.forEach((id) => {
    const record = lookupRecord(id)
    if(!record) {return}
    productsStore.addFeatureApplication({
      productId: modalTargetProductId.value,
      record,
      productFeatureApplTypeId: modalApplTypeId.value,
      applTypeDescription
    })
    applied += 1
  })

  showToast(`Linked ${applied} feature${applied === 1 ? "" : "s"} as ${applTypeDescription} (local only).`)
  closeFeatureModal()
}

function removeFeature(appl: ProductFeatureApplication) {
  productsStore.removeFeatureApplication({
    productId: appl.productId,
    productFeatureId: appl.productFeatureId,
    productFeatureApplTypeId: appl.productFeatureApplTypeId
  })
  showToast(`Removed ${appl.description} (local only).`)
}
</script>

<style scoped>
.hero-card {
  margin-bottom: 12px;
}

.hero-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
}

.hero-thumb {
  --size: 64px;
}

.hero-eyebrow {
  margin: 0;
}

.hero-meta h1 {
  margin: 4px 0;
}

.hero-meta p {
  margin: 0;
}

.hero-stats {
  display: flex;
  gap: 24px;
}

.hero-stat {
  display: grid;
  text-align: right;
}

.view-segment {
  margin-top: 16px;
}

.hero-context {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.matrix-card,
.selectable-card,
.variant-card {
  margin: 0 16px 24px;
}

.matrix-scroll {
  overflow-x: auto;
  margin: 0 -8px;
  padding: 0 8px;
}

.matrix-row {
  display: grid;
  border-bottom: 1px solid var(--ion-color-step-100, rgba(0, 0, 0, 0.06));
}

.matrix-row--header {
  background: var(--ion-color-step-50, rgba(0, 0, 0, 0.025));
  position: sticky;
  top: 0;
  z-index: 2;
}

.matrix-cell-item {
  --background: transparent;
  --inner-padding-end: 12px;
  --padding-start: 12px;
}

.matrix-cell-item--variant {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--ion-card-background);
}

.matrix-row--header .matrix-cell-item--variant {
  background: var(--ion-color-step-50, rgba(0, 0, 0, 0.025));
}

.matrix-row--current {
  background: var(--ion-color-step-50, rgba(0, 0, 0, 0.04));
}

.matrix-row--current .matrix-cell-item--variant {
  background: var(--ion-color-step-50, rgba(0, 0, 0, 0.04));
}

.matrix-swatch {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  margin-inline-end: 12px;
}

.matrix-cell-item--expired {
  opacity: 0.55;
}

.matrix-empty,
.selectable-empty,
.variant-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 32px 12px;
  text-align: center;
}

.matrix-empty h3,
.selectable-empty h3,
.variant-empty h3 {
  margin: 0;
}

.selectable-groups {
  display: grid;
  gap: 20px;
  margin-top: 12px;
}

.selectable-group__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.selectable-group__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
}

.feature-chip--inactive {
  opacity: 0.55;
}

.feature-chip__body {
  display: grid;
}

.feature-chip__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
}

.feature-swatch {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-swatch--sm {
  width: 24px;
  height: 24px;
}

.variant-features {
  display: grid;
  gap: 8px;
}

.feature-row {
  border-radius: 12px;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
}

.feature-row--inactive {
  opacity: 0.55;
}

.feature-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

@media (max-width: 720px) {
  .hero-grid {
    grid-template-columns: auto 1fr;
  }

  .hero-stats {
    grid-column: 1 / -1;
    justify-content: space-between;
  }

  .hero-stat {
    text-align: left;
  }
}
</style>
