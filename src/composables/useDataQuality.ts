import { type Ref, computed, ref } from "vue"
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query"
import { coverageOptions, duplicateGroupsOptions, missingProductsOptions } from "@/queries/quality"
import { adHocRequiredRule, ruleById, rulesByKind } from "@/domain/quality/rules"
import type { QualityRule } from "@/domain/types/quality"

/** Facade for the Duplicate identifiers page: a segment per unique-field rule. */
export function useDuplicateIdentifiers() {
  const uniqueRules = rulesByKind("unique-field")
  const activeRuleId = ref(uniqueRules[0]?.id ?? "")
  const activeRule = computed(() => ruleById(activeRuleId.value) ?? uniqueRules[0])

  const groupsQuery = useQuery(computed(() => duplicateGroupsOptions(activeRule.value)))

  return {
    rules: uniqueRules,
    activeRuleId,
    activeRule,
    groups: computed(() => groupsQuery.data.value ?? []),
    isLoading: groupsQuery.isLoading,
    isFetching: groupsQuery.isFetching,
    isError: groupsQuery.isError,
    error: groupsQuery.error,
    refetch: () => groupsQuery.refetch()
  }
}

/** Facade for the Missing values page: coverage tiles per required-field rule + drill-down.
 *  "Look up another field" feeds an ad-hoc rule through the exact same pipeline. */
export function useMissingValues() {
  const requiredRules = rulesByKind("required-field")
  const activeRule: Ref<QualityRule | null> = ref(null)

  const coverageQuery = useQuery(coverageOptions(requiredRules))

  const drillQuery = useInfiniteQuery(computed(() => {
    const rule = activeRule.value ?? requiredRules[0]

    return { ...missingProductsOptions(rule), enabled: activeRule.value != null }
  }))

  const coverageByRule = computed(() => {
    const map = new Map((coverageQuery.data.value ?? []).map((coverage) => [coverage.ruleId, coverage]))

    return requiredRules
      .map((rule) => ({ rule, coverage: map.get(rule.id) }))
      .sort((a, b) => (b.coverage?.missing ?? 0) - (a.coverage?.missing ?? 0))
  })

  const selectRule = (rule: QualityRule | null) => {
    activeRule.value = rule
  }

  const lookupField = (field: string) => {
    const cleaned = field.trim()
    if(!cleaned) {return}
    activeRule.value = ruleById(cleaned) ?? adHocRequiredRule(cleaned)
  }

  return {
    rules: requiredRules,
    coverageByRule,
    coverageLoading: coverageQuery.isLoading,
    coverageError: coverageQuery.isError,
    refetchCoverage: () => coverageQuery.refetch(),

    activeRule,
    selectRule,
    lookupField,
    missingProducts: computed(() => drillQuery.data.value?.pages.flatMap((page) => page.products) ?? []),
    missingTotal: computed(() => drillQuery.data.value?.pages[0]?.total ?? 0),
    drillLoading: drillQuery.isLoading,
    hasNextPage: drillQuery.hasNextPage,
    loadMore: async (done: () => void) => {
      try {
        if(drillQuery.hasNextPage.value && !drillQuery.isFetchingNextPage.value) {await drillQuery.fetchNextPage()}
      } finally {
        done()
      }
    }
  }
}
