<template>
  <SearchFilterCard
    :model-value="queryString"
    :placeholder="translate('Product ID, SKU, UPC, name')"
    :show-clear="false"
    @update:model-value="$emit('update:queryString', $event)"
  >
    <UniformFilterLayout @clear="$emit('clear')">
      <ion-select
        :value="productTypeId"
        :label="translate('Product type')"
        label-placement="stacked"
        fill="outline"
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
        label-placement="stacked"
        fill="outline"
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
        label-placement="stacked"
        fill="outline"
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
        :value="tags"
        :label="translate('Tags')"
        :selected-text="selectedTagsLabel"
        label-placement="stacked"
        fill="outline"
        interface="popover"
        multiple
        @ion-change="$emit('update:tags', $event.detail.value ?? [])"
      >
        <ion-select-option
          v-for="facet in tagFacets"
          :key="facet.value"
          :value="facet.value"
        >
          {{ facet.value }} ({{ facet.count }})
        </ion-select-option>
      </ion-select>
    </UniformFilterLayout>
  </SearchFilterCard>
</template>

<script setup lang="ts">
import { IonSelect, IonSelectOption } from "@ionic/vue"
import { computed } from "vue"
import { translate } from "@common"
import SearchFilterCard from "@/components/SearchFilterCard.vue"
import UniformFilterLayout from "@/components/UniformFilterLayout.vue"
import type { CatalogOption, ProductKind, TagFacet } from "@/domain/types/product"

const props = defineProps<{
  queryString: string
  productTypeId: string
  productStoreId: string
  productKind: ProductKind
  tags: string[]
  tagFacets: TagFacet[]
  productTypes: CatalogOption[]
  productStores: CatalogOption[]
}>()

defineEmits<{
  (event: "update:queryString", value: string): void
  (event: "update:productTypeId", value: string): void
  (event: "update:productStoreId", value: string): void
  (event: "update:productKind", value: ProductKind): void
  (event: "update:tags", value: string[]): void
  (event: "clear"): void
}>()

const selectedTagsLabel = computed(() =>
  props.tags.length ? props.tags.join(", ") : translate("All tags"))
</script>
