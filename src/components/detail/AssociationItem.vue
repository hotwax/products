<template>
  <ion-item
    lines="full"
    class="assoc-item"
  >
    <ion-thumbnail slot="start">
      <DxpShopifyImg
        :src="association.relatedImageUrl"
        size="thumb"
      />
    </ion-thumbnail>
    <ion-label>
      <h3>
        {{ association.relatedName || association.relatedProductId }}
        <template v-if="quantityLabel">
          {{ quantityLabel }}
        </template>
      </h3>
      <p>{{ association.relatedSku || association.relatedProductId }}</p>
      <ion-note
        v-if="expiryLabel"
        color="warning"
      >
        {{ expiryLabel }}
      </ion-note>
    </ion-label>
    <ion-button
      v-if="association.active"
      slot="end"
      fill="clear"
      color="danger"
      size="small"
      @click="$emit('expire')"
    >
      {{ translate("Expire") }}
    </ion-button>
    <ion-button
      v-else
      slot="end"
      fill="clear"
      size="small"
      @click="$emit('reactivate')"
    >
      {{ translate("Reactivate") }}
    </ion-button>
  </ion-item>
</template>

<script setup lang="ts">
import { IonButton, IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue"
import { computed } from "vue"
import { DxpShopifyImg, translate } from "@common"
import { expiresInDays } from "@/domain/normalize/association"
import type { ProductAssociation } from "@/domain/types/product"

const props = defineProps<{
  association: ProductAssociation
  showQuantity?: boolean
}>()

defineEmits<{
  (event: "expire"): void
  (event: "reactivate"): void
}>()

const quantityLabel = computed(() =>
  props.showQuantity && props.association.quantity ? `× ${props.association.quantity}` : "")

const expiryLabel = computed(() => {
  const days = expiresInDays(props.association)
  if(days === null) {return ""}
  if(days === 0) {return translate("Expired")}

  return `${translate("expires in")} ${days} ${days === 1 ? translate("day") : translate("days")}`
})
</script>

<style scoped>
.assoc-item {
  border: 1px solid var(--ion-color-step-150, #e2e2e6);
  border-radius: 8px;
  --inner-border-width: 0;
}
</style>
