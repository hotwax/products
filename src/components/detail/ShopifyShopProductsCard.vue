<template>
  <CardSection :title="translate('Shopify Shop Products')">
    <template #action>
      <ion-button
        v-if="canEdit"
        fill="clear"
        size="small"
        :disabled="addOpen"
        @click="openAdd"
      >
        <ion-icon
          slot="start"
          :icon="addOutline"
        />
        {{ translate("Add") }}
      </ion-button>
    </template>

    <!-- Column headers -->
    <div
      v-if="shopifyShopProducts.length || addOpen"
      class="ssp-grid ssp-header"
    >
      <span>{{ translate("Shop ID") }}</span>
      <span>{{ translate("Shopify Product ID") }}</span>
      <span>{{ translate("Shopify Inventory ID") }}</span>
      <span>{{ translate("Actions") }}</span>
    </div>

    <!-- Existing rows -->
    <div
      v-for="row in shopifyShopProducts"
      :key="row.shopId"
      class="ssp-grid ssp-row"
    >
      <!-- View mode -->
      <template v-if="editingShopId !== row.shopId">
        <span class="ssp-cell">{{ row.shopId }}</span>
        <span class="ssp-cell">{{ row.shopifyProductId || "—" }}</span>
        <span class="ssp-cell">{{ row.shopifyInventoryItemId || "—" }}</span>
        <div
          v-if="canEdit"
          class="ssp-actions"
        >
          <ion-button
            fill="clear"
            size="small"
            @click="startEdit(row)"
          >
            <ion-icon slot="icon-only" :icon="pencilOutline"></ion-icon>
          </ion-button>
          <ion-button
            fill="clear"
            size="small"
            color="danger"
            @click="$emit('remove', row.shopId)"
          >
            <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
      </template>

      <!-- Edit mode -->
      <template v-else>
        <span class="ssp-cell">{{ row.shopId }}</span>
        <ion-input
          v-model="editForm.shopifyProductId"
          fill="outline"
          :label="translate('Shopify Product ID')"
          label-placement="stacked"
          clear-input
        />
        <ion-input
          v-model="editForm.shopifyInventoryItemId"
          fill="outline"
          :label="translate('Shopify Inventory ID')"
          label-placement="stacked"
          clear-input
        />
        <div class="ssp-actions">
          <ion-button
            size="small"
            :disabled="saving"
            @click="saveEdit(row.shopId)"
            fill="clear"
          >
            <ion-icon slot="icon-only" :icon="saveOutline"></ion-icon>
          </ion-button>
          <ion-button
            fill="clear"
            size="small"
            @click="cancelEdit"
            color="danger"
          >
            <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
      </template>
    </div>

    <!-- Empty state -->
    <p
      v-if="!shopifyShopProducts.length && !addOpen"
      class="ssp-empty"
    >
      {{ translate("No Shopify shops linked") }}
    </p>

    <!-- Add row -->
    <div
      v-if="addOpen"
      class="ssp-grid ssp-row ssp-add-row"
    >
      <ion-input
        v-model="addForm.shopId"
        fill="outline"
        :label="translate('Shop ID')"
        label-placement="stacked"
        clear-input
      />
      <ion-input
        v-model="addForm.shopifyProductId"
        fill="outline"
        :label="translate('Shopify Product ID')"
        label-placement="stacked"
        clear-input
      />
      <ion-input
        v-model="addForm.shopifyInventoryItemId"
        fill="outline"
        :label="translate('Shopify Inventory ID')"
        label-placement="stacked"
        clear-input
      />
      <div class="ssp-actions">
        <ion-button
          size="small"
          :disabled="saving || !addForm.shopId.trim()"
          @click="saveAdd"
          fill="clear"
        >
          <ion-icon slot="icon-only" :icon="saveOutline"></ion-icon>
        </ion-button>
        <ion-button
          fill="clear"
          size="small"
          @click="cancelAdd"
          color="danger"
        >
          <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
        </ion-button>
      </div>
    </div>
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton, IonIcon, IonInput } from "@ionic/vue"
import { ref } from "vue"
import { addOutline, closeOutline, pencilOutline, saveOutline } from "ionicons/icons"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"
import type { ShopifyShopProduct } from "@/domain/types/product"

const props = withDefaults(defineProps<{
  shopifyShopProducts: ShopifyShopProduct[]
  saving: boolean
  canEdit?: boolean
}>(), {
  canEdit: true
})

const emit = defineEmits<{
  (event: "upsert", payload: { shopId: string; shopifyProductId: string; shopifyInventoryItemId: string }): void
  (event: "remove", shopId: string): void
}>()

// ---- add form ----
const addOpen = ref(false)
const addForm = ref({ shopId: "", shopifyProductId: "", shopifyInventoryItemId: "" })

const openAdd = () => {
  if(!props.canEdit) {return}
  cancelEdit()
  addForm.value = { shopId: "", shopifyProductId: "", shopifyInventoryItemId: "" }
  addOpen.value = true
}

const cancelAdd = () => { addOpen.value = false }

const saveAdd = () => {
  if(!props.canEdit) {return}
  if(!addForm.value.shopId.trim()) {return}
  emit("upsert", { ...addForm.value })
  addOpen.value = false
}

// ---- edit form ----
const editingShopId = ref<string | null>(null)
const editForm = ref({ shopifyProductId: "", shopifyInventoryItemId: "" })

const startEdit = (row: ShopifyShopProduct) => {
  if(!props.canEdit) {return}
  cancelAdd()
  editingShopId.value = row.shopId
  editForm.value = { shopifyProductId: row.shopifyProductId, shopifyInventoryItemId: row.shopifyInventoryItemId }
}

const cancelEdit = () => { editingShopId.value = null }

const saveEdit = (shopId: string) => {
  if(!props.canEdit) {return}
  emit("upsert", { shopId, ...editForm.value })
  editingShopId.value = null
}
</script>

<style scoped>
.ssp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
}

.ssp-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-bottom: 6px;
  margin-bottom: 2px;
}

.ssp-row {
  border-bottom: 1px solid var(--ion-color-step-100, #f0f0f5);
}

.ssp-row:last-child {
  border-bottom: none;
}

.ssp-add-row {
  border-top: 1px solid var(--ion-color-step-150, #e2e2e6);
  padding-top: 10px;
  margin-top: 4px;
  border-bottom: none;
}

.ssp-cell {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ssp-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.ssp-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
  margin: 0 0 8px;
}
</style>
