<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Duplicate identifiers") }}</ion-title>
        <ion-progress-bar
          v-if="isFetching"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card>
        <ion-card-content>
          <ion-segment v-model="activeRuleId">
            <ion-segment-button
              v-for="rule in rules"
              :key="rule.id"
              :value="rule.id"
            >
              <ion-label>{{ rule.label }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <p class="hint">
            {{ activeRule?.description }}. {{ translate("Resolve a group by giving each product a unique value, then save.") }}
          </p>
        </ion-card-content>
      </ion-card>

      <ErrorState
        v-if="isError"
        :title="translate('Could not load duplicates')"
        :message="errorText"
        @retry="refetch"
      />

      <template v-else-if="!isLoading">
        <ion-list v-if="groups.length">
          <ion-list-header>
            <ion-label>
              {{ groups.length }} {{ groups.length === 1 ? translate("duplicate group") : translate("duplicate groups") }}
            </ion-label>
          </ion-list-header>
          <ion-item
            v-for="group in groups"
            :key="group.value"
            lines="full"
          >
            <ion-label>
              <code>{{ group.value }}</code>
            </ion-label>
            <ion-button
              slot="end"
              fill="outline"
              size="small"
              @click="openResolve(group)"
            >
              {{ translate("Resolve") }} {{ group.products.length }} {{ translate("products") }}
            </ion-button>
          </ion-item>
        </ion-list>
        <EmptyState
          v-else
          :title="translate('No duplicates')"
          :message="`${translate('Every product has a unique')} ${activeRule?.label}`"
        />
      </template>

      <ResolveDuplicatesModal
        :is-open="resolveOpen"
        :rule="activeRule ?? null"
        :group="activeGroup"
        :saving="resolveMutation.isPending.value"
        @save="saveResolution"
        @dismiss="resolveOpen = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader,
  IonMenuButton, IonPage, IonProgressBar, IonSegment, IonSegmentButton, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref } from "vue"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import ResolveDuplicatesModal from "@/components/quality/ResolveDuplicatesModal.vue"
import { errorMessage } from "@/api/http"
import { useDuplicateIdentifiers } from "@/composables/useDataQuality"
import { useResolveDuplicates } from "@/mutations/useQualityResolution"
import { useToast } from "@/composables/useToast"
import type { DuplicateDraft, DuplicateGroup } from "@/domain/types/quality"

const { rules, activeRuleId, activeRule, groups, isLoading, isFetching, isError, error, refetch } = useDuplicateIdentifiers()
const resolveMutation = useResolveDuplicates()
const toast = useToast()

const resolveOpen = ref(false)
const activeGroup = ref<DuplicateGroup | null>(null)
const errorText = computed(() => errorMessage(error.value, translate("Duplicates are unavailable")))

const openResolve = (group: DuplicateGroup) => {
  activeGroup.value = group
  resolveOpen.value = true
}

const saveResolution = async (changes: DuplicateDraft[]) => {
  const typeId = activeRule.value?.resolution?.goodIdentificationTypeId
  if (!typeId || !changes.length) return
  try {
    await resolveMutation.mutateAsync(
      changes.map((change) => ({ productId: change.productId, goodIdentificationTypeId: typeId, idValue: change.value.trim() }))
    )
    resolveOpen.value = false
    toast.success(`${changes.length} ${changes.length === 1 ? translate("identifier updated") : translate("identifiers updated")}`)
  } catch (err) {
    toast.error(err, translate("Could not save changes"))
  }
}
</script>

<style scoped>
.hint {
  margin: 12px 4px 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}
</style>
