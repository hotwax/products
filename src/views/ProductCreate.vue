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

      <!-- Categories -->
      <CardSection :title="translate('Categories')">
        <template #action>
          <ion-button
            fill="clear"
            size="small"
            @click="categoryPickerOpen = true"
          >
            {{ translate("Add category") }}
          </ion-button>
        </template>

        <div
          v-if="selectedCategories.length"
          class="categories-list"
        >
          <ion-item
            v-for="category in selectedCategories"
            :key="category.productCategoryId"
            lines="full"
          >
            <ion-label>
              <h3>{{ category.categoryName || category.productCategoryId }}</h3>
              <p v-if="category.description">
                {{ category.description }}
              </p>
              <p>{{ category.productCategoryId }}</p>
            </ion-label>
            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              size="small"
              @click="removeCategory(category.productCategoryId)"
            >
              {{ translate("Remove") }}
            </ion-button>
          </ion-item>
        </div>
        <p
          v-else
          class="no-categories"
        >
          {{ translate("No categories added") }}
        </p>

        <CategoryPicker
          :is-open="categoryPickerOpen"
          :exclude-category-ids="selectedCategoryIds"
          @select="addCategory"
          @dismiss="categoryPickerOpen = false"
        />
      </CardSection>

      <!-- Prices -->
      <CardSection :title="translate('Prices')">
        <ion-list lines="full">
          <ion-item
            v-for="(price, index) in draftedPrices"
            :key="index"
            lines="full"
          >
            <ion-label>
              <p>{{ priceTypeLabel(price.productPriceTypeId) }}</p>
              <h3>{{ price.currencyUomId }} {{ price.price }}</h3>
            </ion-label>
            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              size="small"
              @click="removePrice(index)"
            >
              {{ translate("Remove") }}
            </ion-button>
          </ion-item>

          <ion-item lines="none">
            <div class="price-add-row">
              <ion-select
                v-model="newPrice.productPriceTypeId"
                :label="translate('Type')"
                label-placement="stacked"
                interface="popover"
                fill="outline"
              >
                <ion-select-option
                  v-for="option in availablePriceTypes"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </ion-select-option>
              </ion-select>
              <ion-select
                v-model="newPrice.currencyUomId"
                :label="translate('Currency')"
                label-placement="stacked"
                interface="popover"
                fill="outline"
              >
                <ion-select-option
                  v-for="option in currencies"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </ion-select-option>
              </ion-select>
              <ion-input
                v-model="newPrice.price"
                type="number"
                min="0"
                :label="translate('Amount')"
                label-placement="stacked"
                fill="outline"
                @keyup.enter="addPrice"
              />
              <ion-button
                fill="clear"
                :disabled="!canAddPrice"
                @click="addPrice"
              >
                {{ translate("Add") }}
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </CardSection>

      <!-- Features -->
      <CardSection :title="translate('Features')">
        <FeaturesSection
          :family-axes="draftAxes"
          :applied-feature-ids="draftAppliedIds"
          :feature-types="featureTypes"
          @toggle="onToggleFeature"
          @create-value="onCreateFeatureValue"
        />
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
  IonTextarea, IonThumbnail, IonTitle, IonToggle, IonToolbar,
  IonList, IonListHeader
} from "@ionic/vue"
import { computed, reactive, ref } from "vue"
import router from "../router"
import { useQuery } from "@tanstack/vue-query"
import { DxpShopifyImg, translate } from "@common"
import { closeCircle } from "ionicons/icons"
import CardSection from "@/components/common/CardSection.vue"
import CategoryPicker from "@/components/detail/CategoryPicker.vue"
import DimensionBox from "@/components/detail/DimensionBox.vue"
import FeaturesSection from "@/components/detail/FeaturesSection.vue"
import ProductPicker from "@/components/detail/ProductPicker.vue"
import { addProductCategoryMember, applyFeature, createFeature, createProduct, createProductPrice } from "@/api/pim"
import { boxTypesOptions, currencyUomOptions, featureTypesOptions, identificationTypesOptions, lengthUomOptions, priceTypesOptions, weightUomOptions, productTypesOptions } from "@/queries/catalog"
import { featureCatalogOptions } from "@/queries/productDetail"
import { buildFeatureAxes, FEATURE_APPL_TYPE } from "@/domain/normalize/feature"
import { lengthUomToMm } from "@/domain/product/uom"
import { productDisplayName } from "@/domain/normalize/product"
import { useToast } from "@/composables/useToast"
import type { ProductCategory, ProductFeatureApplication, ProductSummary } from "@/domain/types/product"
import type { ProductPriceCreate } from "@/domain/types/pim"

const toast = useToast()

// Reference data
const productTypesQuery = useQuery(productTypesOptions())
const boxTypesQuery = useQuery(boxTypesOptions())
const lengthUomsQuery = useQuery(lengthUomOptions())
const weightUomsQuery = useQuery(weightUomOptions())
const identificationTypesQuery = useQuery(identificationTypesOptions())
const featureTypesQuery = useQuery(featureTypesOptions())
const priceTypesQuery = useQuery(priceTypesOptions())
const currenciesQuery = useQuery(currencyUomOptions())
const productTypes = computed(() => productTypesQuery.data.value ?? [])
const boxTypes = computed(() => boxTypesQuery.data.value ?? [])
const lengthUoms = computed(() => lengthUomsQuery.data.value ?? [])
const weightUoms = computed(() => weightUomsQuery.data.value ?? [])
const identificationTypes = computed(() => identificationTypesQuery.data.value ?? [])
const featureTypes = computed(() => featureTypesQuery.data.value ?? [])
const priceTypes = computed(() => priceTypesQuery.data.value ?? [])
const currencies = computed(() => currenciesQuery.data.value ?? [])

const info = reactive({
  productName: "",
  internalName: "",
  brandName: "",
  productTypeId: "",
  description: "",
  longDescription: ""
})

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
const draftedPrices = ref<ProductPriceCreate[]>([])
const newPrice = reactive<Partial<ProductPriceCreate>>({ productPriceTypeId: "", currencyUomId: "", price: undefined })
const selectedCategories = ref<ProductCategory[]>([])
const categoryPickerOpen = ref(false)
const variants = ref<ProductSummary[]>([])
const pickerOpen = ref(false)
const creating = ref(false)

const canCreate = computed(() => Boolean(form.productName.trim() || form.internalName.trim()))
const variantIds = computed(() => variants.value.map((v) => v.productId))
const selectedCategoryIds = computed(() => selectedCategories.value.map((c) => c.productCategoryId))
const usedPriceTypeIds = computed(() => new Set(draftedPrices.value.map((p) => p.productPriceTypeId)))
const availablePriceTypes = computed(() => priceTypes.value.filter((t) => !usedPriceTypeIds.value.has(t.id)))
const canAddPrice = computed(() => Boolean(newPrice.productPriceTypeId && newPrice.currencyUomId && newPrice.price != null && newPrice.price > 0))

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

// Prices
const priceTypeLabel = (typeId: string) => priceTypes.value.find((t) => t.id === typeId)?.label ?? typeId

const addPrice = () => {
  if(!canAddPrice.value) {return}
  draftedPrices.value.push({
    productPriceTypeId: newPrice.productPriceTypeId!,
    currencyUomId: newPrice.currencyUomId!,
    price: Number(newPrice.price)
  })
  newPrice.productPriceTypeId = ""
  newPrice.currencyUomId = ""
  newPrice.price = undefined
}

const removePrice = (index: number) => {
  draftedPrices.value.splice(index, 1)
}

// Categories
const addCategory = (category: ProductCategory) => {
  if(!selectedCategories.value.some((c) => c.productCategoryId === category.productCategoryId)) {
    selectedCategories.value.push(category)
  }
  categoryPickerOpen.value = false
}
const removeCategory = (productCategoryId: string) => {
  selectedCategories.value = selectedCategories.value.filter((c) => c.productCategoryId !== productCategoryId)
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

// Features — local draft; applyFeature called post-creation
const draftedFeatures = ref<ProductFeatureApplication[]>([])
const draftAxes = computed(() => buildFeatureAxes(draftedFeatures.value))
const draftAppliedIds = computed(() => new Set(draftedFeatures.value.map((f) => f.productFeatureId)))

const onToggleFeature = ({ application, applied }: { application: { productFeatureId: string }; applied: boolean }) => {
  // On the create page all drafted features are "applied"; clicking removes them
  if(applied) {
    draftedFeatures.value = draftedFeatures.value.filter((f) => f.productFeatureId !== application.productFeatureId)
  }
}

const onCreateFeatureValue = async ({ featureTypeId, description }: { featureTypeId: string; description: string }) => {
  try {
    const { productFeatureId } = await createFeature({ productFeatureTypeId: featureTypeId, description })
    const featureTypeDescription = featureTypes.value.find((t) => t.id === featureTypeId)?.label ?? featureTypeId
    draftedFeatures.value.push({
      productId: "",
      productFeatureId,
      productFeatureApplTypeId: FEATURE_APPL_TYPE.standard,
      featureTypeId,
      featureTypeDescription,
      description,
      fromDate: new Date().toISOString(),
      thruDate: null,
      active: true,
      sequenceNum: null
    })
  } catch(error) {
    toast.error(error, translate("Could not add feature"))
  }
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
      isVirtual: "Y",
      keywords: tags.value,
      identifications: identifications.value,
    })

    // Create prices post-creation
    if(draftedPrices.value.length) {
      await Promise.all(draftedPrices.value.map((p) => createProductPrice(productId, p)))
    }

    // Add category members post-creation
    if(selectedCategories.value.length) {
      await Promise.all(
        selectedCategories.value.map((c) => addProductCategoryMember(productId, c.productCategoryId))
      )
    }

    // Apply drafted features post-creation
    if(draftedFeatures.value.length) {
      await Promise.all(
        draftedFeatures.value.map((f) =>
          applyFeature(productId, { productFeatureId: f.productFeatureId, productFeatureApplTypeId: FEATURE_APPL_TYPE.standard })
        )
      )
    }

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

.price-add-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
}

.price-add-row ion-select,
.price-add-row ion-input {
  flex: 1;
}

.no-variants,
.no-categories {
  color: var(--ion-color-medium);
  font-size: 13px;
}

.categories-list {
  margin-top: 4px;
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
