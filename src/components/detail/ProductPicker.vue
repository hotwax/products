<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('dismiss')">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          :value="term"
          :placeholder="translate('Product ID, SKU, name')"
          :debounce="300"
          @ion-input="term = $event.detail.value ?? ''"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item
          v-for="product in candidates"
          :key="product.productId"
          button
          @click="$emit('select', product)"
        >
          <ion-thumbnail slot="start">
            <DxpShopifyImg
              :src="product.imageUrl"
              size="thumb"
            />
          </ion-thumbnail>
          <ion-label>
            <h3>{{ displayName(product) }}</h3>
            <p>{{ product.sku || product.productId }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <EmptyState
        v-if="!isLoading && !candidates.length"
        :title="translate('No matches')"
        :message="translate('Try a different search')"
      />
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonThumbnail,
  IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { DxpShopifyImg, translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import { runProductSolrQuery, solrDocs } from "@/api/solr"
import { normalizeProductSummary, productDisplayName } from "@/domain/normalize/product"
import { productSearchQueryText } from "@/domain/solr/productQuery"
import type { ProductSummary } from "@/domain/types/product"

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title: string
    excludeProductIds?: string[]
  }>(),
  { excludeProductIds: () => [] }
)

defineEmits<{
  (event: "select", product: ProductSummary): void
  (event: "dismiss"): void
}>()

const term = ref("")

const pickerQuery = useQuery({
  queryKey: computed(() => ["productPicker", term.value] as const),
  queryFn: async () => {
    const response = await runProductSolrQuery({
      query: productSearchQueryText(term.value),
      filter: ["docType:PRODUCT"],
      limit: 25,
      sort: "productName asc",
      params: {
        "defType": "edismax",
        "q.op": "OR",
        "qf": "productId parentProductName productName internalName sku"
      }
    })

    return solrDocs(response).map(normalizeProductSummary)
  },
  enabled: computed(() => props.isOpen),
  staleTime: 30_000
})

const candidates = computed(() => {
  const excluded = new Set(props.excludeProductIds)

  return (pickerQuery.data.value ?? []).filter((product) => !excluded.has(product.productId))
})
const isLoading = pickerQuery.isLoading
const displayName = productDisplayName
</script>
