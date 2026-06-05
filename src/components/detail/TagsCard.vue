<template>
  <CardSection :title="translate('Tags')">
    <template v-if="hasParent">
      <div class="tag-group">
        <p class="group-label">
          {{ translate("Virtual") }}
        </p>
        <div class="tag-row">
          <ion-chip
            v-for="tag in anchorTags"
            :key="tag"
            outline
          >
            <ion-label>{{ tag }}</ion-label>
            <ion-icon
              :icon="closeCircle"
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
      </div>

      <div class="tag-group">
        <p class="group-label">
          {{ translate("Variant") }}
        </p>
        <div class="tag-row">
          <ion-chip
            v-for="tag in variantTags"
            :key="tag"
            outline
          >
            <ion-label>{{ tag }}</ion-label>
            <ion-icon
              :icon="closeCircle"
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
        <div class="add-row">
          <ion-input
            v-model="newVariantTag"
            :placeholder="translate('Add tag')"
            fill="outline"
            label-placement="stacked"
            @keyup.enter="commitVariantTag"
          />
          <ion-button
            fill="clear"
            :disabled="!newVariantTag.trim()"
            @click="commitVariantTag"
          >
            {{ translate("Add") }}
          </ion-button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="tag-row">
        <ion-chip
          v-for="tag in anchorTags"
          :key="tag"
          outline
        >
          <ion-label>{{ tag }}</ion-label>
          <ion-icon
            :icon="closeCircle"
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
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { IonButton, IonChip, IonIcon, IonInput, IonLabel } from "@ionic/vue"
import { ref } from "vue"
import { closeCircle } from "ionicons/icons"
import { translate } from "@common"
import CardSection from "@/components/common/CardSection.vue"

const props = defineProps<{
  anchorTags: string[]
  variantTags: string[]
  hasParent: boolean
}>()

const emit = defineEmits<{
  (event: "addTag", tag: string): void
  (event: "removeTag", tag: string): void
  (event: "addVariantTag", tag: string): void
  (event: "removeVariantTag", tag: string): void
}>()

const newTag = ref("")
const newVariantTag = ref("")

const commitTag = () => {
  const tag = newTag.value.trim()
  if(!tag || props.anchorTags.includes(tag)) {return}
  emit("addTag", tag)
  newTag.value = ""
}

const commitVariantTag = () => {
  const tag = newVariantTag.value.trim()
  if(!tag || props.variantTags.includes(tag)) {return}
  emit("addVariantTag", tag)
  newVariantTag.value = ""
}
</script>

<style scoped>
.tag-group {
  margin-bottom: 16px;
}

.tag-group:last-child {
  margin-bottom: 0;
}

.group-label {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0 0 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
</style>
