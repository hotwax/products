<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Add category") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('dismiss')">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          :value="term"
          :placeholder="translate('Search categories')"
          :debounce="300"
          @ion-input="term = $event.detail.value ?? ''"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item
          v-for="category in candidates"
          :key="category.productCategoryId"
          button
          @click="$emit('select', category)"
        >
          <ion-label>
            <h3>{{ category.categoryName || category.productCategoryId }}</h3>
            <p v-if="category.description">
              {{ category.description }}
            </p>
            <p>{{ category.productCategoryId }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <EmptyState
        v-if="!isLoading && !candidates.length"
        :title="translate('No categories found')"
        :message="translate('Try a different search term')"
      />
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonTitle, IonToolbar } from "@ionic/vue"
import { computed, ref } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import { fetchProductCategories } from "@/api/pim"
import type { ProductCategory } from "@/domain/types/product"

const props = defineProps<{
  isOpen: boolean
  excludeCategoryIds?: string[]
}>()

defineEmits<{
  (event: "select", category: ProductCategory): void
  (event: "dismiss"): void
}>()

const term = ref("")

const searchQuery = useQuery({
  queryKey: computed(() => ["categorySearch", term.value] as const),
  queryFn: () => fetchProductCategories(term.value),
  enabled: computed(() => props.isOpen),
  staleTime: 30_000
})

const candidates = computed(() => {
  const excluded = new Set(props.excludeCategoryIds ?? [])

  return (searchQuery.data.value ?? []).filter((c) => !excluded.has(c.productCategoryId))
})

const isLoading = searchQuery.isLoading
</script>
