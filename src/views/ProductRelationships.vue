<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/products/${productId}`" />
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Relationships</ion-title>
      </ion-toolbar>
      <ion-progress-bar
        v-if="detailLoading"
        type="indeterminate"
      />
    </ion-header>

    <ion-content>
      <ErrorState
        v-if="detailError"
        title="Relationships failed"
        :message="detailError"
      />

      <template v-if="detail">
        <ion-card class="hero-card">
          <ion-card-content>
            <div class="hero-grid">
              <ion-thumbnail class="hero-thumb">
                <DxpShopifyImg
                  :src="detail.imageUrl"
                  size="small"
                />
              </ion-thumbnail>
              <div class="hero-meta">
                <p class="hero-eyebrow">
                  {{ detail.productId }}
                </p>
                <h1>{{ detail.productName || detail.internalName || detail.productId }}</h1>
                <p>{{ detail.productTypeId || "Unknown type" }} · {{ detail.primaryProductCategoryId || "No category" }}</p>
              </div>
              <div class="hero-stats">
                <div class="hero-stat">
                  <strong>{{ totalActive }}</strong>
                  <span>Active links</span>
                </div>
                <div class="hero-stat">
                  <strong>{{ activeTypeCount }}</strong>
                  <span>Types in use</span>
                </div>
                <div class="hero-stat">
                  <strong>{{ totalExpired }}</strong>
                  <span>Expired</span>
                </div>
              </div>
            </div>

            <ion-segment
              v-model="direction"
              class="direction-segment"
            >
              <ion-segment-button value="outgoing">
                <ion-icon :icon="arrowForwardOutline" />
                <ion-label>Links from this product ({{ counts.outgoing }})</ion-label>
              </ion-segment-button>
              <ion-segment-button value="incoming">
                <ion-icon :icon="arrowBackOutline" />
                <ion-label>Links to this product ({{ counts.incoming }})</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-item lines="none">
              <ion-label>
                Show expired
                <p>OFBiz expires associations instead of deleting them, preserving order history.</p>
              </ion-label>
              <ion-toggle
                slot="end"
                v-model="showExpired"
              />
            </ion-item>
          </ion-card-content>
        </ion-card>

        <div class="type-rail">
          <button
            v-for="rail in typeRail"
            :key="rail.typeId"
            :class="['type-chip', { 'type-chip--active': rail.typeId === activeTypeId, 'type-chip--empty': !rail.count }]"
            @click="activeTypeId = rail.typeId"
          >
            <span class="type-chip__dot" />
            <span class="type-chip__body">
              <span class="type-chip__label">{{ rail.label }}</span>
              <span class="type-chip__meta">{{ rail.count }}</span>
            </span>
          </button>
        </div>

        <template
          v-if="activeMeta"
        >
          <div class="active-panel">
            <ion-card class="panel-card">
              <ion-card-header>
                <div class="panel-heading">
                  <ion-card-subtitle>
                    {{ activeMeta.typeId }}
                  </ion-card-subtitle>
                  <ion-card-title>{{ activeMeta.label }}</ion-card-title>
                  <p
                    v-if="activeDescription"
                    class="panel-description"
                  >
                    {{ activeDescription }}
                  </p>
                  <div
                    v-if="panelBadges.length"
                    class="panel-badges"
                  >
                    <ion-badge
                      v-for="badge in panelBadges"
                      :key="badge.label"
                      :color="badge.color"
                    >
                      {{ badge.label }}
                    </ion-badge>
                  </div>
                </div>
              </ion-card-header>

              <ion-card-content>
                <ion-searchbar
                  ref="searchBar"
                  v-model="searchTerm"
                  :placeholder="`Search products by ID, SKU, or name`"
                  :debounce="180"
                  @keyup.enter="handleEnterKey"
                />
                <ion-item lines="none">
                  <ion-label>
                    Search for products by ID, SKU, or name to link as {{ activeMeta.shortLabel.toLowerCase() }}.
                  </ion-label>
                </ion-item>
                <ion-item
                  v-if="searchTerm && firstSuggestion"
                  lines="none"
                >
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg
                      :src="firstSuggestion.imageUrl"
                      size="thumb"
                    />
                  </ion-thumbnail>
                  <ion-label>
                    <h3>{{ firstSuggestion.productName || firstSuggestion.internalName || firstSuggestion.productId }}</h3>
                    <p>{{ firstSuggestion.productId }} · {{ firstSuggestion.productTypeId || "Unknown type" }}</p>
                  </ion-label>
                  <ion-button
                    slot="end"
                    fill="outline"
                    @click="addRelationship(firstSuggestion)"
                  >
                    <ion-icon
                      slot="start"
                      :icon="addCircleOutline"
                    />
                    Add link
                  </ion-button>
                </ion-item>
                <ion-item
                  v-if="searchTerm && firstSuggestion"
                  lines="none"
                >
                  <ion-label>
                    <p>Press enter to add the first match.</p>
                  </ion-label>
                </ion-item>
                <ion-item
                  v-if="searchTerm && searchSuggestions.length > 1"
                  lines="none"
                  button
                  detail
                  @click="openSearchResultsModal"
                >
                  <ion-label>
                    View more results ({{ searchSuggestions.length - 1 }} more)
                  </ion-label>
                </ion-item>
                <ion-item
                  v-if="searchTerm && !firstSuggestion"
                  lines="none"
                >
                  <ion-label>
                    <p>No catalog match for "{{ searchTerm }}".</p>
                  </ion-label>
                </ion-item>
              </ion-card-content>
            </ion-card>
          </div>

          <ion-list
            v-if="visibleRelationships.length"
            lines="full"
          >
            <ion-item
              v-for="(relationship, index) in visibleRelationships"
              :key="relationshipKey(relationship)"
              :class="{ 'relationship-row--expired': !relationship.active }"
            >
              <div
                class="reorder-handle"
              >
                <button
                  :disabled="index === 0"
                  :aria-label="`Move ${relationship.relatedName} up`"
                  @click="reorder(index, index - 1)"
                >
                  <ion-icon :icon="chevronUpOutline" />
                </button>
                <span class="reorder-handle__seq">{{ relationship.sequenceNum }}</span>
                <button
                  :disabled="index === visibleRelationships.length - 1"
                  :aria-label="`Move ${relationship.relatedName} down`"
                  @click="reorder(index, index + 1)"
                >
                  <ion-icon :icon="chevronDownOutline" />
                </button>
              </div>

              <ion-thumbnail
                slot="start"
                class="relationship-thumb"
              >
                <DxpShopifyImg
                  :src="relationship.relatedImageUrl"
                  size="small"
                />
              </ion-thumbnail>

              <ion-label>
                {{ relationship.relatedName || relationship.relatedProductId }}
                <p>
                  <span class="mono">{{ relationship.relatedProductId }}</span>
                  <span v-if="relationship.relatedSku && relationship.relatedSku !== relationship.relatedProductId">
                    · SKU {{ relationship.relatedSku }}
                  </span>
                  <span v-if="relationship.relatedTypeId">
                    · {{ relationship.relatedTypeId }}
                  </span>
                </p>
                <p class="relationship-meta">
                  <ion-badge :color="relationship.active ? 'success' : 'medium'">
                    {{ relationship.active ? "Active" : "Expired" }}
                  </ion-badge>
                  <ion-badge
                    v-if="relationship.direction === 'incoming'"
                    color="medium"
                  >
                    Incoming
                  </ion-badge>
                  <span class="dates">{{ relationship.fromDate || "Started today" }} → {{ relationship.thruDate || "no end" }}</span>
                </p>
                <div
                  v-if="activeMeta.supportsBom"
                  class="bom-grid"
                >
                  <label>
                    <span>Qty per parent</span>
                    <input
                      :value="relationship.quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      @change="updateField(relationship, 'quantity', ($event.target as HTMLInputElement).value)"
                    >
                  </label>
                  <label>
                    <span>Scrap factor</span>
                    <input
                      :value="relationship.scrapFactor"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      @change="updateField(relationship, 'scrapFactor', ($event.target as HTMLInputElement).value)"
                    >
                  </label>
                  <label class="bom-grid__wide">
                    <span>Instruction</span>
                    <input
                      :value="relationship.instruction"
                      type="text"
                      placeholder="Assembly note for the floor"
                      @change="updateField(relationship, 'instruction', ($event.target as HTMLInputElement).value)"
                    >
                  </label>
                </div>
              </ion-label>

              <div
                slot="end"
                class="row-actions"
              >
                <ion-button
                  :router-link="`/products/${relationship.relatedProductId}`"
                  fill="clear"
                  size="small"
                >
                  Open
                  <ion-icon
                    slot="end"
                    :icon="openOutline"
                  />
                </ion-button>
                <ion-button
                  v-if="relationship.active"
                  color="warning"
                  fill="outline"
                  size="small"
                  @click="expire(relationship)"
                >
                  Expire
                </ion-button>
                <ion-button
                  v-else
                  color="success"
                  fill="outline"
                  size="small"
                  @click="reactivate(relationship)"
                >
                  Reactivate
                </ion-button>
              </div>
            </ion-item>
          </ion-list>

          <div
            v-else
            class="empty-panel"
          >
            <ion-icon :icon="gitBranchOutline" />
            <h3>No {{ activeMeta.shortLabel.toLowerCase() }} {{ direction === "outgoing" ? "from" : "to" }} this product</h3>
            <p>
              {{ emptyMessage }}
            </p>
          </div>
        </template>
      </template>

      <ion-modal
        :is-open="isSearchResultsModalOpen"
        @did-dismiss="closeSearchResultsModal"
      >
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeSearchResultsModal">
                <ion-icon
                  slot="icon-only"
                  :icon="closeOutline"
                />
              </ion-button>
            </ion-buttons>
            <ion-title>Search results</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-radio-group v-model="selectedProductFromModal">
            <ion-item
              v-for="suggestion in searchSuggestions"
              :key="suggestion.productId"
            >
              <ion-thumbnail slot="start">
                <DxpShopifyImg
                  :src="suggestion.imageUrl"
                  size="thumb"
                />
              </ion-thumbnail>
              <ion-radio :value="suggestion.productId">
                <ion-label>
                  <h3>{{ suggestion.productName || suggestion.internalName || suggestion.productId }}</h3>
                  <p>{{ suggestion.productId }} · {{ suggestion.productTypeId || "Unknown type" }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <ion-button
              slot="end"
              fill="outline"
              color="success"
              :disabled="!selectedProductFromModal"
              @click="addSelectedProductFromModal"
            >
              <ion-icon
                slot="start"
                :icon="addCircleOutline"
              />
              Add link
            </ion-button>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>

      <EmptyState
        v-if="!detailLoading && !detailError && !detail"
        title="Product not loaded"
        message="Open a product from the workbench."
      />
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
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonPage,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  IonTitle,
  IonToggle,
  IonToolbar
} from "@ionic/vue"
import {
  addCircleOutline,
  arrowBackOutline,
  arrowForwardOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeOutline,
  gitBranchOutline,
  openOutline
} from "ionicons/icons"
import { storeToRefs } from "pinia"
import { computed, onMounted, ref, watch } from "vue"
import { DxpShopifyImg } from "@common"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"
import type { ProductRelationship, ProductRelationshipDirection, ProductSummary } from "@/types/product"
import { showToast } from "@/utils"
import {
  buildAssocTypeCatalog
} from "@/utils/productAssocTypes"

const props = defineProps<{
  productId: string
}>()

const productsStore = useProductsStore()
const {
  detail,
  detailLoading,
  detailError,
  searchResults,
  assocTypeCatalog
} = storeToRefs(productsStore)

const assocTypes = computed(() => buildAssocTypeCatalog(assocTypeCatalog.value))
const direction = ref<ProductRelationshipDirection>("outgoing")
const activeTypeId = ref("")
const showExpired = ref(false)
const searchTerm = ref("")
const searchBar = ref<any>(null)
const isSearchResultsModalOpen = ref(false)
const selectedProductFromModal = ref("")

onMounted(() => {
  productsStore.fetchDetail(props.productId)
  productsStore.loadAssocTypeCatalog().catch(() => undefined)

  if(!searchResults.value.length) {
    productsStore.runSearch().catch(() => undefined)
  }
})

watch(() => props.productId, (productId) => {
  productsStore.fetchDetail(productId)
})

const relationships = computed<ProductRelationship[]>(() => detail.value?.relationships || [])

const directionalRelationships = computed(() => relationships.value.filter((relationship) => relationship.direction === direction.value))

const counts = computed(() => ({
  outgoing: relationships.value.filter((relationship) => relationship.direction === "outgoing").length,
  incoming: relationships.value.filter((relationship) => relationship.direction === "incoming").length
}))

const totalActive = computed(() => relationships.value.filter((relationship) => relationship.active).length)
const totalExpired = computed(() => relationships.value.filter((relationship) => !relationship.active).length)
const activeTypeCount = computed(() => {
  const typeIds = new Set(relationships.value.filter((relationship) => relationship.active).map((relationship) => relationship.typeId))

  return typeIds.size
})

const typeRail = computed(() => assocTypes.value
  .map((type) => {
    const count = directionalRelationships.value.filter((relationship) => relationship.typeId === type.typeId).length

    return {
      typeId: type.typeId,
      label: type.shortLabel,
      count
    }
  })
  .sort((first, second) => first.label.localeCompare(second.label) || first.typeId.localeCompare(second.typeId)))

watch([typeRail, direction], ([rails]) => {
  if(!rails.length) {
    activeTypeId.value = ""

    return
  }

  const current = rails.find((rail) => rail.typeId === activeTypeId.value)
  if(current?.count) {return}

  activeTypeId.value = rails.find((rail) => rail.count)?.typeId || current?.typeId || rails[0].typeId
}, { immediate: true })

const activeMeta = computed(() => {
  const typeId = activeTypeId.value || typeRail.value[0]?.typeId
  const meta = assocTypes.value.find((type) => type.typeId === typeId)
  if(meta) {return meta}
  if(!typeId) {return undefined}

  return {
    typeId,
    label: typeId,
    shortLabel: typeId,
    description: typeId,
    fromVerb: typeId,
    toVerb: typeId,
    parentTypeId: "",
    parentDescription: "",
    supportsBom: false
  }
})

const panelBadges = computed(() => {
  const badges: Array<{ label: string, color: string }> = []
  if(!activeMeta.value) {return badges}
  if(activeMeta.value.supportsBom) {badges.push({ label: "Bill of materials", color: "medium" })}

  return badges
})

const activeDescription = computed(() => {
  if(!activeMeta.value) {return ""}
  const description = activeMeta.value.description || activeMeta.value.parentDescription
  if(!description || description === activeMeta.value.label || description === activeMeta.value.typeId) {return ""}

  return description
})

const visibleRelationships = computed(() => directionalRelationships.value
  .filter((relationship) => relationship.typeId === activeTypeId.value)
  .filter((relationship) => showExpired.value || relationship.active)
  .slice()
  .sort((a, b) => (Number(a.sequenceNum) || 0) - (Number(b.sequenceNum) || 0)))

const searchSuggestions = computed(() => {
  if(!searchTerm.value) {return []}
  const term = searchTerm.value.toLowerCase()
  const existing = new Set(visibleRelationships.value.map((relationship) => relationship.relatedProductId))

  return searchResults.value
    .filter((product) => product.productId && product.productId !== props.productId && !existing.has(product.productId))
    .filter((product) => [product.productId, product.productName, product.internalName, product.primarySku, product.brandName, product.searchText]
      .some((value) => (value || "").toLowerCase().includes(term)))
    .slice(0, 25)
})

const firstSuggestion = computed(() => searchSuggestions.value[0] || null)

const emptyMessage = computed(() => {
  if(!activeMeta.value) {return "No association types were returned by OMS."}
  if(direction.value === "incoming") {
    return `No other product currently lists this as its ${activeMeta.value.toVerb.toLowerCase()}.`
  }

  return `Use the search above to add the first ${activeMeta.value.shortLabel.toLowerCase()} link.`
})

function relationshipKey(relationship: ProductRelationship): string {
  return [relationship.typeId, relationship.relatedProductId, relationship.sequenceNum, relationship.fromDate].join("|")
}

function addRelationship(product: ProductSummary) {
  if(!activeMeta.value) {return}
  productsStore.addRelationship({
    typeId: activeTypeId.value,
    related: product
  })
  searchTerm.value = ""
  showToast(`${product.productName || product.productId} linked as ${activeMeta.value.shortLabel.toLowerCase()}.`)
  focusSearchBar()
}

function handleEnterKey() {
  if(!firstSuggestion.value) {return}
  addRelationship(firstSuggestion.value)
}

function openSearchResultsModal() {
  selectedProductFromModal.value = ""
  isSearchResultsModalOpen.value = true
}

function closeSearchResultsModal() {
  isSearchResultsModalOpen.value = false
  selectedProductFromModal.value = ""
}

function addSelectedProductFromModal() {
  const product = searchSuggestions.value.find((suggestion) => suggestion.productId === selectedProductFromModal.value)
  if(!product) {return}
  addRelationship(product)
  closeSearchResultsModal()
}

function focusSearchBar() {
  const el = searchBar.value?.$el
  if(el?.setFocus) {el.setFocus()}
}

function expire(relationship: ProductRelationship) {
  productsStore.expireRelationship({
    typeId: relationship.typeId,
    relatedProductId: relationship.relatedProductId,
    sequenceNum: relationship.sequenceNum
  })
  showToast(`Expired ${relationship.relatedName}. Order history is preserved.`)
}

function reactivate(relationship: ProductRelationship) {
  productsStore.reactivateRelationship({
    typeId: relationship.typeId,
    relatedProductId: relationship.relatedProductId,
    sequenceNum: relationship.sequenceNum
  })
  showToast(`Reactivated ${relationship.relatedName}.`)
}

function reorder(fromIndex: number, toIndex: number) {
  if(toIndex < 0 || toIndex >= visibleRelationships.value.length) {return}
  const ordered = visibleRelationships.value.map((relationship) => relationship.relatedProductId)
  const [moved] = ordered.splice(fromIndex, 1)
  if(!moved) {return}
  ordered.splice(toIndex, 0, moved)
  productsStore.reorderRelationships(activeTypeId.value, ordered)
}

function updateField(
  relationship: ProductRelationship,
  field: "quantity" | "scrapFactor" | "instruction" | "reason",
  value: string
) {
  productsStore.updateRelationshipFields(
    {
      typeId: relationship.typeId,
      relatedProductId: relationship.relatedProductId,
      sequenceNum: relationship.sequenceNum
    },
    { [field]: value }
  )
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
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-meta h1 {
  margin: 4px 0;
  font-size: 22px;
  font-weight: 600;
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

.hero-stat strong {
  font-size: 22px;
  font-weight: 600;
}

.hero-stat span {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ion-color-medium);
}

.direction-segment {
  margin-top: 16px;
}

.verify-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 16px 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
  background: var(--ion-card-background, #fff);
}

.verify-banner--ok {
  border-color: var(--ion-color-success);
  background: rgba(var(--ion-color-success-rgb, 45, 211, 111), 0.08);
}

.verify-banner--warning {
  border-color: var(--ion-color-warning);
  background: rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.1);
}

.verify-banner--error {
  border-color: var(--ion-color-danger);
  background: rgba(var(--ion-color-danger-rgb, 235, 68, 90), 0.1);
}

.verify-banner ion-icon {
  font-size: 22px;
}

.verify-banner--ok ion-icon { color: var(--ion-color-success); }
.verify-banner--warning ion-icon { color: var(--ion-color-warning); }
.verify-banner--error ion-icon { color: var(--ion-color-danger); }

.verify-banner__body {
  flex: 1;
  display: grid;
}

.verify-banner__body strong {
  font-size: 14px;
}

.verify-banner__body span {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.type-rail {
  display: flex;
  gap: 8px;
  padding: 4px 16px 12px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.type-chip {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
  background: var(--ion-card-background, var(--ion-color-step-50, #fff));
  color: var(--ion-text-color);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  white-space: nowrap;
  min-height: 44px;
}

.type-chip:hover {
  transform: translateY(-1px);
}

.type-chip__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--ion-color-medium);
}

.type-chip--primary .type-chip__dot { background: var(--ion-color-primary); }
.type-chip--secondary .type-chip__dot { background: var(--ion-color-secondary); }
.type-chip--tertiary .type-chip__dot { background: var(--ion-color-tertiary); }
.type-chip--success .type-chip__dot { background: var(--ion-color-success); }
.type-chip--warning .type-chip__dot { background: var(--ion-color-warning); }
.type-chip--danger .type-chip__dot { background: var(--ion-color-danger); }

.type-chip--active {
  border-color: var(--ion-color-primary);
  box-shadow: 0 0 0 2px var(--ion-color-primary-shade, var(--ion-color-primary));
}

.type-chip--empty {
  opacity: 0.65;
}

.type-chip__body {
  display: grid;
  text-align: left;
}

.type-chip__label {
  font-weight: 600;
  font-size: 13px;
}

.type-chip__meta {
  font-size: 11px;
  color: var(--ion-color-medium);
  letter-spacing: 0.02em;
}

.type-chip__source {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 6px;
  margin-left: 4px;
}

.type-chip__source--local-only {
  background: rgba(var(--ion-color-danger-rgb, 235, 68, 90), 0.16);
  color: var(--ion-color-danger);
}

.type-chip__source--oms-only {
  background: rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.18);
  color: var(--ion-color-warning-shade, var(--ion-color-warning));
}

.type-chip--local-only {
  border-style: dashed;
}

.active-panel {
  padding: 0 16px 32px;
}

.panel-card {
  margin: 0;
}

.panel-heading {
  display: grid;
  gap: 8px;
}

.panel-heading ion-card-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.direction-verb {
  color: var(--ion-color-medium);
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.panel-description {
  margin: 0;
  color: var(--ion-color-medium);
}

.panel-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.managed-banner {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.12);
  margin-bottom: 16px;
}

.managed-banner ion-icon {
  font-size: 24px;
  color: var(--ion-color-warning);
}

.managed-banner strong {
  display: block;
  margin-bottom: 4px;
}

.managed-banner p {
  margin: 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.relationship-row--expired {
  opacity: 0.55;
}

.reorder-handle {
  display: grid;
  justify-items: center;
  gap: 4px;
  margin-right: 8px;
}

.reorder-handle button {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  color: var(--ion-color-medium);
}

.reorder-handle button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.reorder-handle__seq {
  font-size: 11px;
  font-weight: 600;
  color: var(--ion-color-medium);
}

.reorder-handle--disabled {
  opacity: 0.4;
}

.relationship-thumb {
  --size: 56px;
}

.mono {
  font-family: var(--ion-font-family-mono, "SFMono-Regular", Menlo, Consolas, monospace);
  font-size: 12px;
}

.relationship-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.relationship-meta .dates {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.bom-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  background: var(--ion-color-step-50, rgba(0, 0, 0, 0.03));
}

.bom-grid__wide {
  grid-column: span 2;
}

.bom-grid label {
  display: grid;
  gap: 4px;
}

.bom-grid label span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ion-color-medium);
}

.bom-grid label input {
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 14px;
  background: var(--ion-card-background, #fff);
  color: var(--ion-text-color);
}

.row-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.empty-panel {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 32px 12px;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-panel ion-icon {
  font-size: 36px;
}

.empty-panel h3 {
  margin: 0;
  font-weight: 600;
  color: var(--ion-text-color);
}

.empty-panel p {
  margin: 0;
  max-width: 360px;
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

  .bom-grid {
    grid-template-columns: 1fr;
  }

  .bom-grid__wide {
    grid-column: auto;
  }

  .row-actions {
    flex-direction: row;
  }
}
</style>
