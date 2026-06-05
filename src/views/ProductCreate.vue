<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/products" />
        </ion-buttons>
        <ion-title>{{ translate("Create product") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Display -->
      <CardSection :title="translate('Display')">
        <div class="grid-4">
          <ion-input
            v-model="form.productName"
            :label="translate('Name')"
            label-placement="stacked"
            fill="outline"
          />
          <ion-input
            v-model="form.internalName"
            :label="translate('Internal name')"
            label-placement="stacked"
            fill="outline"
          />
          <ion-input
            v-model="form.brandName"
            :label="translate('Brand name')"
            label-placement="stacked"
            fill="outline"
          />
          <ion-select
            v-model="form.productTypeId"
            :label="translate('Type')"
            label-placement="stacked"
            interface="popover"
            fill="outline"
          >
            <ion-select-option
              v-for="option in productTypes"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </ion-select-option>
          </ion-select>
        </div>
        <div class="grid-desc">
          <ion-textarea
            v-model="form.description"
            :label="translate('Desc')"
            label-placement="stacked"
            auto-grow
            fill="outline"
          />
          <ion-textarea
            v-model="form.longDescription"
            :label="translate('Long desc')"
            label-placement="stacked"
            auto-grow
            fill="outline"
          />
        </div>
      </CardSection>

      <!-- Dates -->
      <CardSection :title="translate('Dates')">
        <div class="grid-4">
          <ion-input
            v-model="form.introductionDate"
            type="date"
            :label="translate('Introduction date')"
            label-placement="stacked"
            fill="outline"
          />
          <ion-input
            v-model="form.releaseDate"
            type="date"
            :label="translate('Release date')"
            label-placement="stacked"
            fill="outline"
          />
          <ion-input
            v-model="form.supportDiscontinuationDate"
            type="date"
            :label="translate('Support discontinuation date')"
            label-placement="stacked"
            fill="outline"
          />
          <ion-input
            v-model="form.salesDiscontinuationDate"
            type="date"
            :label="translate('Sales discontinuation')"
            label-placement="stacked"
            fill="outline"
          />
        </div>
        <ion-item
          lines="none"
          class="oos-toggle"
        >
          <ion-toggle v-model="form.salesDiscWhenNotAvail">
            <ion-label>
              {{ translate("Discontinue when out of stock") }}
              <p>{{ translate("This item will not come back into stock. Do not accept backorders") }}</p>
            </ion-label>
          </ion-toggle>
        </ion-item>
      </CardSection>

      <!-- Tags -->
      <CardSection :title="translate('Tags')">
        <div class="tag-row">
          <ion-chip
            v-for="tag in tags"
            :key="tag"
            outline
          >
            <ion-label>{{ tag }}</ion-label>
            <ion-icon
              :icon="closeCircle"
              @click="removeTag(tag)"
            />
          </ion-chip>
          <p
            v-if="!tags.length"
            class="no-tags"
          >
            {{ translate("No tags") }}
          </p>
        </div>
        <div class="add-row">
          <ion-input
            v-model="newTag"
            :placeholder="translate('Add tag')"
            fill="outline"
            label-placement="stacked"
            @keyup.enter="commitTag"
          />
          <ion-button
            fill="clear"
            :disabled="!newTag.trim()"
            @click="commitTag"
          >
            {{ translate("Add") }}
          </ion-button>
        </div>
      </CardSection>

      <!-- Shipping & Handling -->
      <CardSection :title="translate('Shipping and handling')">
        <div class="shipping-grid">
          <div class="shipping-fields">
            <div class="measure-row">
              <ion-input
                v-model="form.productWidth"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Width')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="form.widthUomId"
                placeholder="unit"
                :aria-label="translate('Width unit')"
                interface="popover"
                class="uom-select"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in lengthUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.label }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="measure-row">
              <ion-input
                v-model="form.productHeight"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Height')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="form.heightUomId"
                placeholder="unit"
                :aria-label="translate('Height unit')"
                interface="popover"
                class="uom-select"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in lengthUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.label }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="measure-row">
              <ion-input
                v-model="form.productDepth"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Depth')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="form.depthUomId"
                placeholder="unit"
                :aria-label="translate('Depth unit')"
                interface="popover"
                class="uom-select"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in lengthUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.label }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="measure-row">
              <ion-input
                v-model="form.productWeight"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Weight')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="form.weightUomId"
                placeholder="unit"
                :aria-label="translate('Weight unit')"
                interface="popover"
                class="uom-select"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in weightUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.label }}
                </ion-select-option>
              </ion-select>
            </div>

            <ion-item lines="full">
              <ion-checkbox v-model="form.inShippingBox">
                {{ translate("In shipping box") }}
              </ion-checkbox>
            </ion-item>
            <ion-item lines="full">
              <ion-checkbox v-model="form.chargeShipping">
                {{ translate("Charge shipping") }}
              </ion-checkbox>
            </ion-item>

            <ion-select
              v-model="form.defaultShipmentBoxTypeId"
              :label="translate('Default box type')"
              label-placement="stacked"
              interface="popover"
              fill="outline"
            >
              <ion-select-option value="">
                {{ translate("None") }}
              </ion-select-option>
              <ion-select-option
                v-for="option in boxTypes"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </ion-select-option>
            </ion-select>
          </div>

          <div class="shipping-illustration">
            <DimensionBox
              :width="form.productWidth"
              :height="form.productHeight"
              :depth="form.productDepth"
              :width-unit="unitLabel(form.widthUomId)"
              :height-unit="unitLabel(form.heightUomId)"
              :depth-unit="unitLabel(form.depthUomId)"
              :width-factor="lengthUomToMm(form.widthUomId)"
              :height-factor="lengthUomToMm(form.heightUomId)"
              :depth-factor="lengthUomToMm(form.depthUomId)"
            />
          </div>
        </div>
      </CardSection>

      <!-- Inventory Policy -->
      <CardSection :title="translate('Inventory policy')">
        <div class="toggle-row">
          <ion-item lines="none">
            <ion-toggle v-model="form.returnable">
              {{ translate("Returnable") }}
            </ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle v-model="form.taxable">
              {{ translate("Taxable") }}
            </ion-toggle>
          </ion-item>
        </div>
      </CardSection>

      <!-- Identifications -->
      <CardSection :title="translate('Product identifications')">
        <ion-list lines="full">
          <ion-item
            v-for="(ident, index) in identifications"
            :key="index"
            lines="full"
          >
            <ion-input
              class="ion-margin-vertical"
              :value="ident.idValue"
              :label="identTypeLabel(ident.goodIdentificationTypeId)"
              label-placement="stacked"
              fill="outline"
              @ion-input="ident.idValue = $event.detail.value ?? ''"
            />
            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              size="small"
              @click="removeIdentification(index)"
            >
              {{ translate("Remove") }}
            </ion-button>
          </ion-item>

          <ion-item lines="none">
            <ion-select
              v-model="newIdentTypeId"
              :label="translate('Add identification')"
              :placeholder="translate('Type')"
              interface="popover"
              fill="outline"
            >
              <ion-select-option
                v-for="option in availableIdentTypes"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </ion-select-option>
            </ion-select>
            <ion-input
              v-model="newIdentValue"
              :placeholder="translate('Value')"
              fill="outline"
              @keyup.enter="addIdentification"
            />
            <ion-button
              slot="end"
              size="small"
              :disabled="!newIdentTypeId || !newIdentValue.trim()"
              @click="addIdentification"
            >
              {{ translate("Add") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </CardSection>

      <!-- Variants -->
      <CardSection :title="translate('Variants')">
        <template #action>
          <ion-button
            fill="clear"
            size="small"
            @click="pickerOpen = true"
          >
            {{ translate("Add variant") }}
          </ion-button>
        </template>

        <div
          v-if="variants.length"
          class="variants-list"
        >
          <ion-item
            v-for="variant in variants"
            :key="variant.productId"
            lines="full"
          >
            <ion-thumbnail slot="start">
              <DxpShopifyImg
                :src="variant.imageUrl"
                size="thumb"
              />
            </ion-thumbnail>
            <ion-label>
              <h3>{{ variantName(variant) }}</h3>
              <p>{{ variant.sku || variant.productId }}</p>
            </ion-label>
            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              size="small"
              @click="removeVariant(variant.productId)"
            >
              {{ translate("Remove") }}
            </ion-button>
          </ion-item>
        </div>
        <p
          v-else
          class="no-variants"
        >
          {{ translate("No variants added") }}
        </p>

        <ProductPicker
          :is-open="pickerOpen"
          :title="translate('Add variant')"
          :exclude-product-ids="variantIds"
          @select="addVariant"
          @dismiss="pickerOpen = false"
        />
      </CardSection>

      <div class="create-footer">
        <ion-button
          expand="block"
          :disabled="creating || !canCreate"
          @click="submit"
        >
          <ion-spinner
            v-if="creating"
            name="crescent"
          />
          <template v-else>
            {{ translate("Create product") }}
          </template>
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon,
  IonInput, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonSpinner,
  IonTextarea, IonThumbnail, IonTitle, IonToggle, IonToolbar
} from "@ionic/vue"
import { computed, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { useQuery } from "@tanstack/vue-query"
import { DxpShopifyImg, translate } from "@common"
import { closeCircle } from "ionicons/icons"
import CardSection from "@/components/common/CardSection.vue"
import DimensionBox from "@/components/detail/DimensionBox.vue"
import ProductPicker from "@/components/detail/ProductPicker.vue"
import { createProduct, createAssociation, createIdentification, addProductKeyword } from "@/api/pim"
import { boxTypesOptions, identificationTypesOptions, lengthUomOptions, weightUomOptions, productTypesOptions } from "@/queries/catalog"
import { ASSOC_TYPE } from "@/domain/normalize/association"
import { lengthUomToMm } from "@/domain/product/uom"
import { productDisplayName } from "@/domain/normalize/product"
import { useToast } from "@/composables/useToast"
import type { ProductSummary } from "@/domain/types/product"

const router = useRouter()
const toast = useToast()

// Reference data
const productTypesQuery = useQuery(productTypesOptions())
const boxTypesQuery = useQuery(boxTypesOptions())
const lengthUomsQuery = useQuery(lengthUomOptions())
const weightUomsQuery = useQuery(weightUomOptions())
const identificationTypesQuery = useQuery(identificationTypesOptions())
const productTypes = computed(() => productTypesQuery.data.value ?? [])
const boxTypes = computed(() => boxTypesQuery.data.value ?? [])
const lengthUoms = computed(() => lengthUomsQuery.data.value ?? [])
const weightUoms = computed(() => weightUomsQuery.data.value ?? [])
const identificationTypes = computed(() => identificationTypesQuery.data.value ?? [])

// Form state
const form = reactive({
  productName: "",
  internalName: "",
  brandName: "",
  productTypeId: "",
  description: "",
  longDescription: "",
  introductionDate: "",
  releaseDate: "",
  supportDiscontinuationDate: "",
  salesDiscontinuationDate: "",
  salesDiscWhenNotAvail: false,
  productWidth: "" as number | "",
  productHeight: "" as number | "",
  productDepth: "" as number | "",
  productWeight: "" as number | "",
  widthUomId: "",
  heightUomId: "",
  depthUomId: "",
  weightUomId: "",
  inShippingBox: false,
  chargeShipping: false,
  defaultShipmentBoxTypeId: "",
  returnable: true,
  taxable: true
})

const tags = ref<string[]>([])
const newTag = ref("")
const identifications = ref<Array<{ goodIdentificationTypeId: string; idValue: string }>>([])
const newIdentTypeId = ref("")
const newIdentValue = ref("")
const variants = ref<ProductSummary[]>([])
const pickerOpen = ref(false)
const creating = ref(false)

const canCreate = computed(() => Boolean(form.productName.trim() || form.internalName.trim()))
const variantIds = computed(() => variants.value.map((v) => v.productId))

// Tags
const commitTag = () => {
  const tag = newTag.value.trim()
  if(!tag || tags.value.includes(tag)) {return}
  tags.value.push(tag)
  newTag.value = ""
}
const removeTag = (tag: string) => {
  tags.value = tags.value.filter((t) => t !== tag)
}

// Identifications
const usedIdentTypeIds = computed(() => new Set(identifications.value.map((i) => i.goodIdentificationTypeId)))
const availableIdentTypes = computed(() => identificationTypes.value.filter((t) => !usedIdentTypeIds.value.has(t.id)))
const identTypeLabel = (typeId: string) => identificationTypes.value.find((t) => t.id === typeId)?.label ?? typeId

const addIdentification = () => {
  const value = newIdentValue.value.trim()
  if(!newIdentTypeId.value || !value) {return}
  identifications.value.push({ goodIdentificationTypeId: newIdentTypeId.value, idValue: value })
  newIdentTypeId.value = ""
  newIdentValue.value = ""
}
const removeIdentification = (index: number) => {
  identifications.value.splice(index, 1)
}

// Variants
const variantName = productDisplayName
const addVariant = (product: ProductSummary) => {
  if(!variants.value.some((v) => v.productId === product.productId)) {
    variants.value.push(product)
  }
  pickerOpen.value = false
}
const removeVariant = (productId: string) => {
  variants.value = variants.value.filter((v) => v.productId !== productId)
}

// Shipping helper
const unitLabel = (uomId: string) => lengthUoms.value.find((uom) => uom.id === uomId)?.label ?? ""

// Submit
const yesNo = (val: boolean): "Y" | "N" => (val ? "Y" : "N")

const submit = async () => {
  if(!canCreate.value || creating.value) {return}
  creating.value = true
  try {
    const { productId } = await createProduct({
      productName: form.productName.trim() || undefined,
      internalName: form.internalName.trim() || undefined,
      brandName: form.brandName.trim() || undefined,
      description: form.description.trim() || undefined,
      longDescription: form.longDescription.trim() || undefined,
      productTypeId: form.productTypeId || undefined,
      introductionDate: form.introductionDate || undefined,
      releaseDate: form.releaseDate || undefined,
      supportDiscontinuationDate: form.supportDiscontinuationDate || undefined,
      salesDiscontinuationDate: form.salesDiscontinuationDate || undefined,
      salesDiscWhenNotAvail: yesNo(form.salesDiscWhenNotAvail),
      returnable: yesNo(form.returnable),
      taxable: yesNo(form.taxable),
      chargeShipping: yesNo(form.chargeShipping),
      inShippingBox: yesNo(form.inShippingBox),
      defaultShipmentBoxTypeId: form.defaultShipmentBoxTypeId || undefined,
      productWidth: form.productWidth !== "" ? form.productWidth : undefined,
      productHeight: form.productHeight !== "" ? form.productHeight : undefined,
      productDepth: form.productDepth !== "" ? form.productDepth : undefined,
      productWeight: form.productWeight !== "" ? form.productWeight : undefined,
      widthUomId: form.widthUomId || undefined,
      heightUomId: form.heightUomId || undefined,
      depthUomId: form.depthUomId || undefined,
      weightUomId: form.weightUomId || undefined,
      isVirtual: variants.value.length > 0 ? "Y" : undefined
    })

    // Post-creation: tags, identifications, and variant associations in parallel
    await Promise.all([
      ...tags.value.map((tag) => addProductKeyword(productId, tag)),
      ...identifications.value.map((ident) => createIdentification(productId, ident)),
      ...variants.value.map((variant) =>
        createAssociation(productId, {
          productIdTo: variant.productId,
          productAssocTypeId: ASSOC_TYPE.variant
        })
      )
    ])

    router.push(`/products/${productId}`)
  } catch(error) {
    toast.error(error, translate("Could not create product"))
    creating.value = false
  }
}
</script>

<style scoped>
.grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.grid-desc {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-top: 16px;
}

.oos-toggle {
  margin-top: 8px;
  --padding-start: 0;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-row ion-input {
  flex: 1;
}

.no-tags {
  font-size: 14px;
  color: var(--ion-color-medium);
  margin: 0;
}

.shipping-grid {
  display: grid;
  grid-template-columns: minmax(280px, 443px) 1fr;
  gap: 24px;
}

.shipping-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shipping-fields ion-item {
  --padding-start: 0;
}

.measure-row {
  display: grid;
  grid-template-columns: 1fr max-content;
  gap: 8px;
  align-items: end;
}

.uom-select {
  border-bottom: 1px solid var(--ion-color-step-200, #cccccc);
  min-height: 44px;
}

.shipping-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.toggle-row ion-item {
  --padding-start: 0;
}

.variants-list {
  margin-top: 4px;
}

.no-variants {
  color: var(--ion-color-medium);
  font-size: 13px;
}

.create-footer {
  padding: 16px;
}

@media (max-width: 720px) {
  .grid-desc {
    grid-template-columns: 1fr;
  }

  .shipping-grid {
    grid-template-columns: 1fr;
  }
}
</style>
