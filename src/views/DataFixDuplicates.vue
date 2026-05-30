<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Duplicate identifiers</ion-title>
      </ion-toolbar>
      <ion-progress-bar
        v-if="loading"
        type="indeterminate"
      />
    </ion-header>

    <ion-content>
      <ion-card>
        <ion-card-content>
          <ion-segment
            v-model="field"
            @ion-change="loadGroups"
          >
            <ion-segment-button value="sku">
              <ion-label>SKU</ion-label>
            </ion-segment-button>
            <ion-segment-button value="upc">
              <ion-label>UPC</ion-label>
            </ion-segment-button>
          </ion-segment>
          <p class="hint">
            Products that share the same {{ field.toUpperCase() }} value. Resolve a group by giving each
            product a unique value, then save.
          </p>
        </ion-card-content>
      </ion-card>

      <ErrorState
        v-if="error"
        title="Could not load duplicates"
        :message="error"
      />

      <ion-list-header v-if="!loading && !error">
        <ion-label>{{ groups.length }} duplicate {{ field.toUpperCase() }} {{ groups.length === 1 ? "group" : "groups" }}</ion-label>
      </ion-list-header>

      <ion-card
        v-for="group in groups"
        :key="group.value"
      >
        <ion-card-header>
          <ion-item lines="none">
            <ion-label>
              <ion-card-subtitle>{{ field.toUpperCase() }}</ion-card-subtitle>
              <ion-card-title>
                <code>{{ group.value }}</code>
              </ion-card-title>
            </ion-label>
            <ion-button
              slot="end"
              fill="outline"
              @click="openResolve(group)"
            >
              <ion-icon
                slot="start"
                :icon="createOutline"
              />
              Resolve {{ group.products.length }} products
            </ion-button>
          </ion-item>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="full">
            <ProductResultRow
              v-for="product in group.products"
              :key="product.productId"
              :product="product"
              :spark="rowSparks[product.productId]"
              :router-link="`/products/${product.productId}`"
            />
          </ion-list>
        </ion-card-content>
      </ion-card>

      <EmptyState
        v-if="!loading && !error && !groups.length"
        title="No duplicates found"
        :message="`No products share a ${field.toUpperCase()} value.`"
      />

      <ion-modal
        :is-open="showResolve"
        @did-dismiss="closeResolve"
      >
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button
                aria-label="Close resolve duplicates"
                @click="closeResolve"
              >
                <ion-icon
                  slot="icon-only"
                  :icon="closeOutline"
                />
              </ion-button>
            </ion-buttons>
            <ion-title>Resolve {{ field.toUpperCase() }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-card
            v-for="draft in drafts"
            :key="draft.productId"
          >
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <DxpShopifyImg
                  :src="draft.imageUrl"
                  size="thumb"
                />
              </ion-thumbnail>
              <ion-label>
                <p class="overline">
                  {{ draft.productId }}
                </p>
                {{ draft.displayName }}
                <p>{{ draft.primarySku }}</p>
                <p>{{ draft.productTypeId || "Unknown type" }}</p>
                <p>{{ displayCreatedDate(draft.createdDate) }}</p>
              </ion-label>
            </ion-item>
            <ion-card-content>
              <ion-input
                v-model="draft.value"
                :label="`${field.toUpperCase()} value`"
                label-placement="floating"
                fill="outline"
                :helper-text="draft.value === draft.original ? 'Unchanged' : `Was ${draft.original}`"
                :class="{ 'value-changed': draft.value !== draft.original }"
              />
            </ion-card-content>
          </ion-card>
          <ion-fab
            slot="fixed"
            vertical="bottom"
            horizontal="end"
          >
            <ion-fab-button
              :aria-label="`Save ${changedCount} ${changedCount === 1 ? 'change' : 'changes'}`"
              :disabled="saving || !hasChanges"
              @click="saveResolve"
            >
              <ion-spinner
                v-if="saving"
                slot="icon-only"
                name="crescent"
              />
              <ion-icon
                v-else
                slot="icon-only"
                :icon="saveOutline"
              />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonModal,
  IonPage,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { closeOutline, createOutline, saveOutline } from "ionicons/icons"
import { computed, onMounted, ref } from "vue"
import { DxpShopifyImg } from "@common"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import ProductResultRow from "@/components/ProductResultRow.vue"
import { getBatchSalesAnalytics, getDuplicateIdentifierGroups, updateProductIdentification } from "@/services/product"
import type { DuplicateIdentifierDraft, DuplicateIdentifierGroup, RowSalesSpark } from "@/types/product"
import { showToast } from "@/utils"

const GOOD_ID_TYPE: Record<"sku" | "upc", string> = { sku: "SKU", upc: "UPCA" }

const field = ref<"sku" | "upc">("upc")
const groups = ref<DuplicateIdentifierGroup[]>([])
const rowSparks = ref<Record<string, RowSalesSpark>>({})
const loading = ref(false)
const error = ref("")

const showResolve = ref(false)
const activeGroup = ref<DuplicateIdentifierGroup | null>(null)
const drafts = ref<DuplicateIdentifierDraft[]>([])
const saving = ref(false)

const changedCount = computed(() => drafts.value.filter((draft) => draft.value !== draft.original).length)
const hasChanges = computed(() => changedCount.value > 0)

onMounted(loadGroups)

async function loadGroups() {
  loading.value = true
  error.value = ""
  groups.value = []
  rowSparks.value = {}

  try {
    const found = await getDuplicateIdentifierGroups(field.value)
    groups.value = found

    const productIds = found.flatMap((group) => group.products.map((product) => product.productId))
    const sparks = await getBatchSalesAnalytics(productIds)
    rowSparks.value = Object.fromEntries(sparks)
  } catch (caught: any) {
    error.value = caught?.response?.data?.errors?.[0]?.message || caught?.message || "Duplicate lookup failed"
  } finally {
    loading.value = false
  }
}

function openResolve(group: DuplicateIdentifierGroup) {
  activeGroup.value = group
  drafts.value = [...group.products]
    .sort(compareProductsByCreatedDate)
    .map((product) => ({
      productId: product.productId,
      displayName: product.productName || product.internalName || product.productId,
      imageUrl: product.imageUrl,
      productTypeId: product.productTypeId,
      primarySku: product.primarySku,
      createdDate: product.createdDate,
      original: group.value,
      value: group.value
    }))
  showResolve.value = true
}

function compareProductsByCreatedDate(first: DuplicateIdentifierGroup["products"][number], second: DuplicateIdentifierGroup["products"][number]) {
  const firstTime = createdTimestamp(first.createdDate)
  const secondTime = createdTimestamp(second.createdDate)
  if(firstTime !== secondTime) {return firstTime - secondTime}

  return first.productId.localeCompare(second.productId)
}

function createdTimestamp(createdDate: string): number {
  if(!createdDate) {return Number.MAX_SAFE_INTEGER}
  const timestamp = Date.parse(createdDate)

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

function displayCreatedDate(createdDate: string): string {
  const timestamp = createdTimestamp(createdDate)
  if(timestamp === Number.MAX_SAFE_INTEGER) {return "Unknown"}

  return new Date(timestamp).toLocaleString()
}

function closeResolve() {
  showResolve.value = false
  activeGroup.value = null
  drafts.value = []
}

async function saveResolve() {
  const changed = drafts.value.filter((draft) => draft.value !== draft.original && draft.value.trim())
  if(!changed.length) {return}

  saving.value = true
  const failures: string[] = []

  await Promise.all(changed.map(async (draft) => {
    try {
      await updateProductIdentification({
        productId: draft.productId,
        goodIdentificationTypeId: GOOD_ID_TYPE[field.value],
        idValue: draft.value.trim()
      })
    } catch (caught: any) {
      failures.push(caught?.response?.data?.errors?.[0]?.message || caught?.message || `Save failed for ${draft.productId}`)
    }
  }))

  saving.value = false

  if(failures.length) {
    showToast(failures[0])

    return
  }

  showToast(`Updated ${changed.length} ${changed.length === 1 ? "product" : "products"}`)
  closeResolve()
  loadGroups()
}
</script>

<style scoped>
.hint {
  color: var(--ion-color-medium);
  font-size: 13px;
  margin: 8px 0 0;
}

.resolve-actions {
  padding: 16px;
}

.value-changed {
  --highlight-color-focused: var(--ion-color-success);
}

code {
  font-family: var(--ion-font-family, monospace);
  background: var(--ion-color-step-100, rgba(0, 0, 0, 0.06));
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
