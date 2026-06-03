<template>
  <SearchFilterCard
    :model-value="queryString"
    :placeholder="translate('Product ID, SKU, UPC, name')"
    @update:model-value="$emit('update:queryString', $event)"
    @clear="$emit('clear')"
  >
    <ion-select
      :value="productTypeId"
      :label="translate('Product type')"
      interface="popover"
      @ion-change="$emit('update:productTypeId', $event.detail.value)"
    >
      <ion-select-option value="All">
        {{ translate("All types") }}
      </ion-select-option>
      <ion-select-option
        v-for="option in productTypes"
        :key="option.id"
        :value="option.id"
      >
        {{ option.label }}
      </ion-select-option>
    </ion-select>

    <ion-select
      :value="productStoreId"
      :label="translate('Product store')"
      interface="popover"
      @ion-change="$emit('update:productStoreId', $event.detail.value)"
    >
      <ion-select-option value="All">
        {{ translate("All stores") }}
      </ion-select-option>
      <ion-select-option
        v-for="option in productStores"
        :key="option.id"
        :value="option.id"
      >
        {{ option.label }}
      </ion-select-option>
    </ion-select>

    <ion-select
      :value="productKind"
      :label="translate('Virtual/variant')"
      interface="popover"
      @ion-change="$emit('update:productKind', $event.detail.value)"
    >
      <ion-select-option value="All">
        {{ translate("All products") }}
      </ion-select-option>
      <ion-select-option value="Virtuals">
        {{ translate("Virtuals") }}
      </ion-select-option>
      <ion-select-option value="Variants">
        {{ translate("Variants") }}
      </ion-select-option>
    </ion-select>

    <ion-select
      :value="sort"
      :label="translate('Sort')"
      interface="popover"
      @ion-change="$emit('update:sort', $event.detail.value)"
    >
      <ion-select-option value="Alphabet">
        {{ translate("Alphabetical") }}
      </ion-select-option>
      <ion-select-option value="Updated">
        {{ translate("Recently updated") }}
      </ion-select-option>
      <ion-select-option value="Created">
        {{ translate("Recently created") }}
      </ion-select-option>
    </ion-select>

    <ion-button
      fill="outline"
      size="small"
      @click="$emit('openTags')"
    >
      {{ tagsLabel }}
    </ion-button>
  </SearchFilterCard>
</template>

<script setup lang="ts">
import { IonButton, IonSelect, IonSelectOption } from "@ionic/vue"
import { computed } from "vue"
import { translate } from "@common"
import SearchFilterCard from "@/components/SearchFilterCard.vue"
import type { CatalogOption, ProductKind, ProductSortOption } from "@/domain/types/product"

const props = defineProps<{
  queryString: string
  productTypeId: string
  productStoreId: string
  productKind: ProductKind
  sort: ProductSortOption
  tags: string[]
  productTypes: CatalogOption[]
  productStores: CatalogOption[]
}>()

defineEmits<{
  (event: "update:queryString", value: string): void
  (event: "update:productTypeId", value: string): void
  (event: "update:productStoreId", value: string): void
  (event: "update:productKind", value: ProductKind): void
  (event: "update:sort", value: ProductSortOption): void
  (event: "openTags"): void
  (event: "clear"): void
}>()

const tagsLabel = computed(() =>
  props.tags.length ? `${translate("Tags")} (${props.tags.length})` : translate("All tags"))
</script>
