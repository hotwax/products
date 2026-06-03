import { type Ref, computed, ref, watch } from "vue"
import { useQuery } from "@tanstack/vue-query"
import {
  associationsOptions, auditHistoryOptions, featureApplicationsOptions, identificationsOptions, productCoreOptions
} from "@/queries/productDetail"
import { boxTypesOptions, productTypesOptions } from "@/queries/catalog"
import { ASSOC_TYPE, groupAssociations } from "@/domain/normalize/association"
import { buildFeatureAxes } from "@/domain/normalize/feature"

/** Detail-page data facade. Resolves the product family (virtual parent ↔ variant) and runs the
 *  per-slice queries keyed on `editingProductId` — the EDIT PARENT | EDIT VARIANT segment is a key
 *  swap, so flipping it binds the form to the other cached record instantly instead of refetching
 *  the world. The feature family stays keyed on the parent (axes span the family). */
export function useProductDetailData(routeProductId: Ref<string>) {
  // the product the route landed on
  const routeCoreQuery = useQuery(computed(() => productCoreOptions(routeProductId.value)))

  // association graph of the ROUTE product resolves the family
  const routeAssociationsQuery = useQuery(computed(() => associationsOptions(routeProductId.value)))

  const parentProductId = computed(() => {
    const core = routeCoreQuery.data.value
    if(!core) {return ""}
    if(core.isVirtual) {return core.productId}
    if(!core.isVariant) {return ""}
    const incoming = (routeAssociationsQuery.data.value ?? []).find((assoc) => assoc.direction === "incoming" && assoc.productAssocTypeId === ASSOC_TYPE.variant && assoc.active)

    return incoming?.productId ?? ""
  })

  /** which member of the family the editor is bound to */
  const editingProductId = ref(routeProductId.value)
  watch(routeProductId, (next) => (editingProductId.value = next))

  const segment = computed<"parent" | "variant">(() =>
    editingProductId.value === parentProductId.value && parentProductId.value ? "parent" : "variant")

  const setSegment = (target: "parent" | "variant") => {
    if(target === "parent" && parentProductId.value) {editingProductId.value = parentProductId.value}
    if(target === "variant") {editingProductId.value = routeProductId.value}
  }

  // per-slice queries bound to the product being edited
  const coreQuery = useQuery(computed(() => productCoreOptions(editingProductId.value)))
  const identificationsQuery = useQuery(computed(() => identificationsOptions(editingProductId.value)))
  const associationsQuery = useQuery(computed(() => associationsOptions(editingProductId.value)))
  const auditQuery = useQuery(computed(() => auditHistoryOptions(editingProductId.value)))

  // features span the family → keyed on the parent when there is one
  const featureFamilyId = computed(() => parentProductId.value || routeProductId.value)
  const featureApplsQuery = useQuery(computed(() => featureApplicationsOptions(featureFamilyId.value)))
  const editingFeatureApplsQuery = useQuery(computed(() => featureApplicationsOptions(editingProductId.value)))

  // reference data the cards need
  const productTypesQuery = useQuery(productTypesOptions())
  const boxTypesQuery = useQuery(boxTypesOptions())

  const associationGroups = computed(() => groupAssociations(associationsQuery.data.value ?? []))

  return {
    routeProductId,
    editingProductId,
    parentProductId,
    segment,
    setSegment,
    hasParent: computed(() => Boolean(parentProductId.value) && parentProductId.value !== routeProductId.value),

    routeCore: computed(() => routeCoreQuery.data.value ?? null),
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
    featureFamilyId,

    audit: computed(() => auditQuery.data.value ?? []),
    auditLoading: auditQuery.isLoading,

    productTypes: computed(() => productTypesQuery.data.value ?? []),
    boxTypes: computed(() => boxTypesQuery.data.value ?? [])
  }
}
