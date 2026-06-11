import { type Ref, computed, ref, watch } from "vue"
import { useQuery } from "@tanstack/vue-query"
import router from "../router"
import {
  associationsOptions, auditHistoryOptions, categoriesOptions, familyMembersOptions, featureApplicationsOptions, identificationsOptions, productCoreOptions, productSolrOptions, shopifyShopProductsOptions
} from "@/queries/productDetail"
import { boxTypesOptions, productTypesOptions } from "@/queries/catalog"
import { ASSOC_TYPE, groupAssociations } from "@/domain/normalize/association"
import { buildFeatureAxes } from "@/domain/normalize/feature"
import { familyFeatureOptions, familyVariants, variantForSelection } from "@/domain/product/family"
import { useToast } from "./useToast"
import { translate } from "@common"

/** Detail-page data facade, family-anchored (pattern from the preorder audit detail page):
 *  the route product is treated as the FAMILY ANCHOR — landing on a variant id canonicalizes the
 *  URL to the parent with ?variantId=, so the page always opens in family context with the variant
 *  pre-selected and sibling-jumping is an instant cached key-swap. */
export function useProductDetailData(routeProductId: Ref<string>) {
  const route = router.currentRoute.value
  const toast = useToast()

  // the product the route landed on — may be a variant that needs canonicalizing to its parent
  const routeCoreQuery = useQuery(computed(() => productCoreOptions(routeProductId.value)))
  const routeAssociationsQuery = useQuery(computed(() => associationsOptions(routeProductId.value)))

  /** family anchor: the route product itself, or its parent when the route product is a variant */
  const anchorProductId = computed(() => {
    const core = routeCoreQuery.data.value
    if(!core) {return routeProductId.value}
    if(!core.isVariant) {return core.productId}
    const incoming = (routeAssociationsQuery.data.value ?? []).find((assoc) => assoc.direction === "incoming" && assoc.productAssocTypeId === ASSOC_TYPE.variant && assoc.active)

    return incoming?.productId ?? core.productId
  })

  // canonicalize: /products/<variantId> → /products/<parentId>?variantId=<variantId>
  watch([anchorProductId, () => routeCoreQuery.data.value], ([anchor]) => {
    const core = routeCoreQuery.data.value
    if(core?.isVariant && anchor !== core.productId) {
      router.replace({ path: `/products/${anchor}`, query: { ...route.query, variantId: core.productId } })
    }
  })

  // one Solr query for the whole family → variant strip + feature selector + per-variant combos
  const familyQuery = useQuery(computed(() => familyMembersOptions(anchorProductId.value)))
  const familyMembers = computed(() => familyQuery.data.value ?? [])
  const variants = computed(() => familyVariants(familyMembers.value))
  const featureOptions = computed(() => familyFeatureOptions(familyMembers.value))
  const hasFeatureSelection = computed(() => featureOptions.value.length > 0)
  const selectedVariantSelection = computed(() => {
    const match = variants.value.find((variant) => variant.productId === selectedVariantId.value)

    return match?.selection ?? {}
  })

  /** selected variant: ?variantId=, validated against the family (preorder-style fallback) */
  const queryVariantId = computed(() => {
    const raw = route.query.variantId

    return typeof raw === "string" && raw ? raw : ""
  })

  const selectedVariantId = ref("")
  watch(
    [queryVariantId, variants, anchorProductId],
    ([wanted, list]) => {
      if(!list.length) {
        selectedVariantId.value = ""

        return
      }
      if(wanted && list.some((variant) => variant.productId === wanted)) {
        selectedVariantId.value = wanted

        return
      }
      const fallback = list[0].productId
      if(wanted && wanted !== fallback) {toast.info(translate("Selected variant not available. Showing the first variant."))}
      selectedVariantId.value = fallback
      if(route.query.variantId !== fallback && route.path === `/products/${anchorProductId.value}`) {
        router.replace({ path: route.path, query: { ...route.query, variantId: fallback } })
      }
    },
    { immediate: true }
  )

  const selectVariant = (productId: string) => {
    if(!variants.value.some((variant) => variant.productId === productId)) {return}
    selectedVariantId.value = productId
    // picking a sibling implies you want to work on it
    explicitSegment.value = "variant"
    router.replace({ path: `/products/${anchorProductId.value}`, query: { ...route.query, variantId: productId } })
  }

  /** pick a feature value (Color/Size chip) → jump to the variant carrying that combination */
  const selectByFeature = (axis: string, value: string) => {
    const desired = { ...selectedVariantSelection.value, [axis]: value }
    const target = variantForSelection(variants.value, desired, axis)
    if(target) {
      selectVariant(target)
    } else {
      toast.info(translate("No variant available for that combination."))
    }
  }

  /** EDIT PARENT | EDIT VARIANT. Until the user explicitly toggles, it follows the selection:
   *  a pre-selected variant (search click, ?variantId, or landing on a variant id) edits the
   *  variant; otherwise the parent. An explicit choice then sticks. */
  const userChoseSegment = ref(false)
  const explicitSegment = ref<"parent" | "variant">("parent")
  const hasVariants = computed(() => variants.value.length > 0)

  const segment = computed<"parent" | "variant">(() => {
    if(!selectedVariantId.value) {return "parent"}
    if(userChoseSegment.value) {return explicitSegment.value}

    return "variant"
  })
  const setSegment = (target: "parent" | "variant") => {
    if(target === "variant" && !selectedVariantId.value) {return}
    userChoseSegment.value = true
    explicitSegment.value = target
  }

  /** which family member the editor cards bind to */
  const editingProductId = computed(() =>
    segment.value === "variant" && selectedVariantId.value ? selectedVariantId.value : anchorProductId.value)

  // family identity for the hero — always the anchor (parent), stable as you jump siblings
  const anchorCoreQuery = useQuery(computed(() => productCoreOptions(anchorProductId.value)))

  // per-slice queries bound to the product being edited (key swap on segment/variant change)
  const coreQuery = useQuery(computed(() => productCoreOptions(editingProductId.value)))
  const identificationsQuery = useQuery(computed(() => identificationsOptions(editingProductId.value)))
  const associationsQuery = useQuery(computed(() => associationsOptions(editingProductId.value)))
  const auditQuery = useQuery(computed(() => auditHistoryOptions(editingProductId.value)))

  // features span the family → keyed on the anchor; the editing product's own appls drive the checks
  const featureApplsQuery = useQuery(computed(() => featureApplicationsOptions(anchorProductId.value)))
  const editingFeatureApplsQuery = useQuery(computed(() => featureApplicationsOptions(editingProductId.value)))

  // anchor product from Solr to get its tags (family members query only fetches isVariant:true)
  const anchorSolrQuery = useQuery(computed(() => productSolrOptions(anchorProductId.value)))
  // categories are fetched per editing product (parent or variant)
  const categoriesQuery = useQuery(computed(() => categoriesOptions(editingProductId.value)))
  const shopifyShopProductsQuery = useQuery(computed(() => shopifyShopProductsOptions(editingProductId.value)))

  // reference data the cards need
  const productTypesQuery = useQuery(productTypesOptions())
  const boxTypesQuery = useQuery(boxTypesOptions())

  const associationGroups = computed(() => groupAssociations(associationsQuery.data.value ?? []))

  return {
    routeProductId,
    anchorProductId,
    editingProductId,
    parentProductId: anchorProductId, // for the editor's copy-from-parent
    segment,
    setSegment,
    hasParent: hasVariants, // segment is shown whenever the family has members to jump between

    variants,
    selectedVariantId,
    selectVariant,
    featureOptions,
    hasFeatureSelection,
    selectedVariantSelection,
    selectByFeature,

    routeCore: computed(() => routeCoreQuery.data.value ?? null),
    anchorCore: computed(() => anchorCoreQuery.data.value ?? null),
    core: computed(() => coreQuery.data.value ?? null),
    coreLoading: coreQuery.isLoading,
    coreError: coreQuery.isError,
    coreErrorValue: coreQuery.error,
    refetchCore: () => coreQuery.refetch(),

    identifications: computed(() => identificationsQuery.data.value ?? []),
    identificationsLoading: identificationsQuery.isLoading,

    associations: computed(() => associationsQuery.data.value ?? []),
    associationGroups,
    associationsLoading: associationsQuery.isLoading,

    familyFeatureAxes: computed(() => buildFeatureAxes(featureApplsQuery.data.value ?? [])),
    editingFeatureAxes: computed(() => buildFeatureAxes(editingFeatureApplsQuery.data.value ?? [])),
    featureFamilyId: anchorProductId,

    audit: computed(() => auditQuery.data.value ?? []),
    auditLoading: auditQuery.isLoading,

    anchorTags: computed(() => anchorSolrQuery.data.value?.tags ?? []),
    selectedVariantTags: computed(() => familyMembers.value.find((m) => m.productId === selectedVariantId.value)?.tags ?? []),

    categories: computed(() => categoriesQuery.data.value ?? []),
    categoriesLoading: categoriesQuery.isLoading,

    prices: computed(() => coreQuery.data.value?.prices ?? []),

    shopifyShopProducts: computed(() => shopifyShopProductsQuery.data.value ?? []),

    productTypes: computed(() => productTypesQuery.data.value ?? []),
    boxTypes: computed(() => boxTypesQuery.data.value ?? [])
  }
}
