import { computed, type ComputedRef, type Ref } from "vue"
import { useQueryClient } from "@tanstack/vue-query"
import { productCoreOptions } from "@/queries/productDetail"
import { useUpdateProductFields } from "@/mutations/useProductMutations"
import { useCardDraft } from "./useCardDraft"
import { useToast } from "./useToast"
import { translate } from "@common"
import type { ProductCore } from "@/domain/types/product"
import type { ProductFieldsPatch } from "@/domain/types/pim"

/** Field-card editor state for the detail page: one draft per card (Display / Dates / Inventory /
 *  Shipping), explicit Save sending only the diff, copy-from-parent populating drafts (never
 *  auto-saving), and a combined dirty flag for the route-leave guard. */

const toIndicator = (value: unknown): "Y" | "N" => (value ? "Y" : "N")
const toDateField = (value: unknown): string => {
  if (!value) return ""
  return String(value).slice(0, 10) // ISO yyyy-mm-dd for ion-input[type=date]
}

function displaySlice(core: ProductCore) {
  return {
    productName: core.productName,
    internalName: core.internalName,
    brandName: core.brandName,
    productTypeId: core.productTypeId,
    description: core.description,
    longDescription: core.longDescription
  }
}

function datesSlice(core: ProductCore) {
  return {
    introductionDate: toDateField(core.introductionDate),
    releaseDate: toDateField(core.releaseDate),
    supportDiscontinuationDate: toDateField(core.supportDiscontinuationDate),
    salesDiscontinuationDate: toDateField(core.salesDiscontinuationDate),
    salesDiscWhenNotAvail: core.salesDiscWhenNotAvail
  }
}

function policySlice(core: ProductCore) {
  return {
    returnable: core.returnable,
    taxable: core.taxable,
    chargeShipping: core.chargeShipping
  }
}

function shippingSlice(core: ProductCore) {
  return {
    productWidth: core.productWidth ?? ("" as number | ""),
    productHeight: core.productHeight ?? ("" as number | ""),
    productDepth: core.productDepth ?? ("" as number | ""),
    productWeight: core.productWeight ?? ("" as number | ""),
    inShippingBox: core.inShippingBox,
    chargeShipping: core.chargeShipping,
    defaultShipmentBoxTypeId: core.defaultShipmentBoxTypeId
  }
}

export function useProductEditor(editingProductId: Ref<string>, core: ComputedRef<ProductCore | null>, parentProductId: Ref<string>) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const updateMutation = useUpdateProductFields(() => editingProductId.value)

  const display = useCardDraft(computed(() => (core.value ? displaySlice(core.value) : null)))
  const dates = useCardDraft(computed(() => (core.value ? datesSlice(core.value) : null)))
  const policy = useCardDraft(computed(() => (core.value ? policySlice(core.value) : null)))
  const shipping = useCardDraft(computed(() => (core.value ? shippingSlice(core.value) : null)))

  const anyDirty = computed(() => display.dirty.value || dates.dirty.value || policy.dirty.value || shipping.dirty.value)
  const saving = computed(() => updateMutation.isPending.value)

  const save = async <T extends Record<string, any>>(
    card: { changes: () => Partial<T> },
    toPatch: (diff: Record<string, any>) => ProductFieldsPatch
  ) => {
    const diff = card.changes()
    if (!Object.keys(diff).length) return
    try {
      await updateMutation.mutateAsync(toPatch(diff))
      toast.success(translate("Saved"))
    } catch (error) {
      toast.error(error, translate("Could not save"))
    }
  }

  const passthrough = (diff: Record<string, any>): ProductFieldsPatch => ({ ...diff })

  const indicatorPatch = (diff: Record<string, any>): ProductFieldsPatch => {
    const patch: Record<string, any> = {}
    for (const [key, value] of Object.entries(diff)) {
      patch[key] = typeof value === "boolean" ? toIndicator(value) : value
    }
    return patch
  }

  const saveDisplay = () => save(display, passthrough)
  const saveDates = () => save(dates, indicatorPatch)
  const savePolicy = () => save(policy, indicatorPatch)
  const saveShipping = () => save(shipping, indicatorPatch)

  /** Copy parent's values into the given card's draft — populate, review, then Save. */
  const copyFromParent = async (card: "dates" | "shipping") => {
    if (!parentProductId.value) return
    const parent = await queryClient.ensureQueryData(productCoreOptions(parentProductId.value))
    if (card === "dates") Object.assign(dates.draft, datesSlice(parent))
    if (card === "shipping") {
      const slice = shippingSlice(parent)
      Object.assign(shipping.draft, { ...slice })
    }
  }

  return {
    display, dates, policy, shipping,
    saveDisplay, saveDates, savePolicy, saveShipping,
    copyFromParent,
    anyDirty, saving
  }
}
