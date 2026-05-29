<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Imports</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="productsStore.fetchImports()">
            Refresh
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-progress-bar
        v-if="importsLoading"
        type="indeterminate"
      />

      <ErrorState
        v-if="importsError"
        title="Import history failed"
        :message="importsError"
      />

      <template v-else>
        <ion-list lines="none">
          <ion-list-header>
            <ion-label>Recently synced product updates</ion-label>
          </ion-list-header>
          <ion-item>
            <ion-label>
              Audit what products were recently updated and what changed in them.
            </ion-label>
          </ion-item>
          <ion-searchbar
            v-model="query"
            placeholder="Search by product, SKU, Shopify ID"
          />
        </ion-list>

        <div class="import-card-grid">
          <ion-card
            v-for="item in filteredImports"
            :key="item.id || `${item.source}-${item.timestamp}-${item.message}`"
          >
            <ion-list lines="full">
              <ion-item>
                <ion-label class="ion-text-wrap">
                  {{ item.parentTitle || item.internalName || item.productId || "Product update" }}
                  <p v-if="item.variantTitle && item.variantTitle !== item.parentTitle">
                    {{ item.variantTitle }}
                  </p>
                  <p v-if="item.sku">
                    SKU: {{ item.sku }}
                  </p>
                </ion-label>
                <ion-note slot="end">
                  {{ item.timestamp }}
                </ion-note>
              </ion-item>

              <ion-item>
                <ion-label>
                  <p>
                    {{ item.shopifyIdLabel || item.shopifyId || item.message || "No Shopify reference" }}
                  </p>
                  <p v-if="item.shopId">
                    Shop: {{ item.shopId }}
                  </p>
                  <p v-if="item.systemMessageId">
                    System message: {{ item.systemMessageId }}
                  </p>
                </ion-label>
                <ion-badge
                  slot="end"
                  :color="statusColor(item.status)"
                >
                  {{ item.status }}
                </ion-badge>
              </ion-item>

              <ion-card-content v-if="item.details.length">
                <ion-chip
                  v-for="label in changeSummary(item.details)"
                  :key="label"
                >
                  <ion-label>{{ label }}</ion-label>
                </ion-chip>
              </ion-card-content>

              <ion-accordion-group v-if="item.details.length">
                <ion-accordion :value="item.id">
                  <ion-item slot="header">
                    <ion-label>
                      Changes
                      <p>Review field-level updates</p>
                    </ion-label>
                    <ion-badge
                      slot="end"
                      color="medium"
                    >
                      {{ item.details.length }}
                    </ion-badge>
                  </ion-item>
                  <ion-list
                    slot="content"
                    lines="full"
                  >
                    <ion-item
                      v-for="(detail, detailIndex) in item.details"
                      :key="`${detail.label}-${detailIndex}`"
                    >
                      <ion-label class="ion-text-wrap">
                        <h3>{{ detail.label }}</h3>
                        <p>{{ detailActionLabel(detail.type) }}</p>
                        <template v-if="detail.items?.length">
                          <p
                            v-for="(detailItem, detailItemIndex) in detail.items"
                            :key="detailItemIndex"
                          >
                            <template v-if="detailItem.label">
                              {{ detailItem.label }}:
                            </template>
                            {{ detailItem.value }}
                          </p>
                        </template>
                        <p v-else>
                          {{ detail.value }}
                        </p>
                      </ion-label>
                    </ion-item>
                  </ion-list>
                </ion-accordion>
              </ion-accordion-group>

              <ion-item v-else>
                <ion-label>No details found for this update</ion-label>
              </ion-item>
            </ion-list>
          </ion-card>
        </div>
      </template>

      <EmptyState
        v-if="!importsLoading && !importsError && !filteredImports.length"
        title="No product import history"
        message="Product update history is empty or unavailable for this OMS."
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonNote,
  IonPage,
  IonProgressBar,
  IonSearchbar,
  IonTitle,
  IonToolbar
} from "@ionic/vue"
import { storeToRefs } from "pinia"
import { computed, onMounted, ref } from "vue"

import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import { useProductsStore } from "@/store/products"
import type { ProductHistoryDetail } from "@/types/product"

const productsStore = useProductsStore()
const { imports, importsLoading, importsError } = storeToRefs(productsStore)
const query = ref("")
const visibleChangeSummaryCount = 4

const filteredImports = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()
  if(!normalizedQuery) {return imports.value}

  return imports.value.filter((item) => {
    return [
      item.internalName,
      item.parentTitle,
      item.variantTitle,
      item.productId,
      item.sku,
      item.shopifyId,
      item.shopId,
      item.systemMessageId,
      item.message
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery))
  })
})

onMounted(() => productsStore.fetchImports())

function changeSummary(details: ProductHistoryDetail[]): string[] {
  const labels = [...new Set(details.map((detail) => detail.label).filter(Boolean))]
  if(labels.length <= visibleChangeSummaryCount) {return labels}

  return [
    ...labels.slice(0, visibleChangeSummaryCount),
    `+${labels.length - visibleChangeSummaryCount} more`
  ]
}

function detailActionLabel(type: string): string {
  if(type === "added") {return "Added"}
  if(type === "removed") {return "Removed"}

  return "Changed"
}

function statusColor(status: string): string {
  const normalized = String(status || "").toLowerCase()
  if(normalized.includes("success") || normalized.includes("complete") || normalized.includes("recorded")) {return "success"}
  if(normalized.includes("error") || normalized.includes("fail") || normalized.includes("cancel")) {return "danger"}
  if(normalized.includes("running") || normalized.includes("pending") || normalized.includes("sent")) {return "primary"}

  return "medium"
}
</script>

<style scoped>
.import-card-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
</style>
