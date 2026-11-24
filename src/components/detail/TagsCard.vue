<template>
  <CardSection :title="translate('Tags')">
    <!-- Variant segment: show variant tags only -->
    <template v-if="isVariantSegment">
      <div class="tag-row">
        <ion-chip
          v-for="tag in variantTags"
          :key="tag"
          outline
        >
          <ion-label>{{ tag }}</ion-label>
          <ion-icon
            v-if="canEdit"
            :icon="closeOutline"
            @click="$emit('removeVariantTag', tag)"
          />
        </ion-chip>
        <p
          v-if="!variantTags.length"
          class="no-tags"
        >
          {{ translate("No tags") }}
        </p>
      </div>
      <div
        v-if="canEdit"
        class="add-row"
      >
        <ion-input
          id="variant-tag-input"
          v-model="newVariantTag"
          :placeholder="translate('Add tag')"
          fill="outline"
          label-placement="stacked"
          @ion-input="onVariantTagInput"
          @ion-focus="onVariantTagFocus"
          @keyup.enter="commitVariantTag"
        />
        <ion-button
          fill="clear"
          :disabled="!newVariantTag.trim()"
          @click="commitVariantTag"
        >
          {{ translate("Add") }}
        </ion-button>

        <ion-popover
          trigger="variant-tag-input"
          trigger-action="none"
          :is-open="variantPopoverOpen && variantTagSuggestions.length > 0"
          :auto-focus="false"
          :show-backdrop="false"
          :keyboard-close="false"
          side="bottom"
          alignment="start"
          class="tag-autocomplete-popover"
          @did-dismiss="variantPopoverOpen = false"
        >
          <ion-content>
            <ion-list lines="full">
              <ion-item
                v-for="tag in variantTagSuggestions"
                :key="tag"
                button
                :detail="false"
                @click="selectVariantTag(tag)"
              >
                <ion-label>{{ tag }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-content>
        </ion-popover>
      </div>
    </template>

    <!-- Parent/standalone segment: show anchor (virtual) tags -->
    <template v-else>
      <div class="tag-row">
        <ion-chip
          v-for="tag in anchorTags"
          :key="tag"
          outline
        >
          <ion-label>{{ tag }}</ion-label>
          <ion-icon
            v-if="canEdit"
            :icon="closeOutline"
            @click="$emit('removeTag', tag)"
          />
        </ion-chip>
        <p
          v-if="!anchorTags.length"
          class="no-tags"
        >
          {{ translate("No tags") }}
        </p>
      </div>
      <div
        v-if="canEdit"
        class="add-row"
      >
        <ion-input
          id="anchor-tag-input"
          v-model="newTag"
          :placeholder="translate('Add tag')"
          fill="outline"
          label-placement="stacked"
          @ion-input="onTagInput"
          @ion-focus="onTagFocus"
          @keyup.enter="commitTag"
        />
        <ion-button
          fill="clear"
          :disabled="!newTag.trim()"
          @click="commitTag"
        >
          {{ translate("Add") }}
        </ion-button>

        <ion-popover
          trigger="anchor-tag-input"
          trigger-action="none"
          :is-open="tagPopoverOpen && tagSuggestions.length > 0"
          :auto-focus="false"
          :show-backdrop="false"
          :keyboard-close="false"
          side="bottom"
          alignment="start"
          class="tag-autocomplete-popover"
          @did-dismiss="tagPopoverOpen = false"
        >
          <ion-content>
            <ion-list lines="full">
              <ion-item
                v-for="tag in tagSuggestions"
                :key="tag"
                button
                :detail="false"
                @click="selectTag(tag)"
              >
                <ion-label>{{ tag }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-content>
        </ion-popover>
      </div>
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton, IonChip, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPopover } from "@ionic/vue"
import { computed, ref } from "vue"
import { closeCircle, closeOutline } from "ionicons/icons"
import { translate } from "@common"
import { useQuery } from "@tanstack/vue-query"
import CardSection from "@/components/common/CardSection.vue"
import { tagFacetsOptions } from "@/queries/products"

const props = withDefaults(
  defineProps<{
    anchorTags: string[]
    variantTags: string[]
    hasParent: boolean
    segment?: "parent" | "variant"
    canEdit?: boolean
  }>(),
  { segment: "parent", canEdit: true }
)

const emit = defineEmits<{
  (event: "addTag", tag: string): void
  (event: "removeTag", tag: string): void
  (event: "addVariantTag", tag: string): void
  (event: "removeVariantTag", tag: string): void
}>()

const newTag = ref("")
const newVariantTag = ref("")
const tagPopoverOpen = ref(false)
const variantPopoverOpen = ref(false)

const tagFacetsQuery = useQuery(tagFacetsOptions({}))
const allKnownTags = computed(() => (tagFacetsQuery.data.value ?? []).map((f) => f.value))

function computeMatching(query: string, existing: string[]) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const existingSet = new Set(existing.map((t) => t.toLowerCase()))

  return allKnownTags.value
    .filter((tag) => {
      const lower = tag.toLowerCase()
      return !existingSet.has(lower) && lower.includes(q)
    })
    .sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aStarts = aLower.startsWith(q)
      const bStarts = bLower.startsWith(q)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return a.localeCompare(b)
    })
    .slice(0, 5)
}

const tagSuggestions = computed(() => computeMatching(newTag.value, props.anchorTags))
const variantTagSuggestions = computed(() => computeMatching(newVariantTag.value, props.variantTags))

const onTagInput = () => {
  tagPopoverOpen.value = newTag.value.trim().length > 0 && tagSuggestions.value.length > 0
}
const onTagFocus = () => {
  tagPopoverOpen.value = newTag.value.trim().length > 0 && tagSuggestions.value.length > 0
}

const onVariantTagInput = () => {
  variantPopoverOpen.value = newVariantTag.value.trim().length > 0 && variantTagSuggestions.value.length > 0
}
const onVariantTagFocus = () => {
  variantPopoverOpen.value = newVariantTag.value.trim().length > 0 && variantTagSuggestions.value.length > 0
}

const selectTag = (tag: string) => {
  if (!props.canEdit) return
  if (props.anchorTags.includes(tag)) return
  emit("addTag", tag)
  newTag.value = ""
  tagPopoverOpen.value = false
}

const selectVariantTag = (tag: string) => {
  if (!props.canEdit) return
  if (props.variantTags.includes(tag)) return
  emit("addVariantTag", tag)
  newVariantTag.value = ""
  variantPopoverOpen.value = false
}

// Show variant tags only when explicitly in the variant segment of a product with a parent
const isVariantSegment = computed(() => props.hasParent && props.segment === "variant")

const commitTag = () => {
  if(!props.canEdit) {return}
  const tag = newTag.value.trim()
  tagPopoverOpen.value = false
  if(!tag || props.anchorTags.includes(tag)) {return}
  emit("addTag", tag)
  newTag.value = ""
}

const commitVariantTag = () => {
  if(!props.canEdit) {return}
  const tag = newVariantTag.value.trim()
  variantPopoverOpen.value = false
  if(!tag || props.variantTags.includes(tag)) {return}
  emit("addVariantTag", tag)
  newVariantTag.value = ""
}
</script>

<style scoped>
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
</style>

<style>
ion-popover.tag-autocomplete-popover {
  --width: 280px;
  --max-width: 90vw;
}
</style>
