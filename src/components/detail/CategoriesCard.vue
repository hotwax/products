<template>
  <CardSection :title="translate('Categories')">
    <div
      v-if="activeCategories.length"
    >
      <ion-chip outline v-for="cat in activeCategories" :key="cat.productCategoryId">
        {{ cat.categoryName || cat.productCategoryId }}
        <ion-icon :icon="closeOutline" @click="$emit('expire', cat)" />
      </ion-chip>
    </div>
    <p
      v-else
      class="cat-empty"
    >
      {{ translate("No categories linked") }}
    </p>

    <div class="cat-footer">
      <ion-button
        fill="clear"
        size="small"
        @click="pickerOpen = true"
      >
        <ion-icon
          slot="start"
          :icon="addOutline"
        />
        {{ translate("Add category") }}
      </ion-button>
    </div>

    <CategoryPicker
      :is-open="pickerOpen"
      :exclude-category-ids="activeCategoryIds"
      @select="onSelect"
      @dismiss="pickerOpen = false"
    />
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton, IonIcon, IonItem, IonLabel } from "@ionic/vue"
import { computed, ref } from "vue"
import { addOutline, closeOutline } from "ionicons/icons"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import CategoryPicker from "./CategoryPicker.vue"
import type { ProductCategory, ProductCategoryMembership } from "@/domain/types/product"

const props = defineProps<{
  categories: ProductCategoryMembership[]
}>()

const emit = defineEmits<{
  (event: "add", category: ProductCategory): void
  (event: "expire", membership: ProductCategoryMembership): void
}>()

const pickerOpen = ref(false)

const activeCategories = computed(() => props.categories.filter((c) => c.active))

const activeCategoryIds = computed(() => activeCategories.value.map((c) => c.productCategoryId))

const onSelect = (category: ProductCategory) => {
  pickerOpen.value = false
  emit("add", category)
}
</script>

<style scoped>
.cat-item {
  border: 1px solid var(--ion-color-step-150, #e2e2e6);
  border-radius: 8px;
  --inner-border-width: 0;
}

.cat-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
  margin: 0 0 8px;
}

.cat-footer {
  margin-top: 8px;
}
</style>
