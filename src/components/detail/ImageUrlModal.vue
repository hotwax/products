<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            :title="translate('Close')"
            @click="emit('dismiss')"
          >
            <ion-icon
              slot="icon-only"
              :icon="closeOutline"
            />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Image URL") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding preview-content">
      <ion-input
        v-model="draftUrl"
        :label="translate('Image URL')"
        label-placement="stacked"
        fill="outline"
        type="url"
        clear-input
        placeholder="https://cdn.example.com/product.jpg"
      />

      <div
        v-if="trimmedUrl"
        class="preview-shell"
      >
        <ion-spinner
          v-if="previewState === 'loading'"
          name="crescent"
        />
        <img
          v-if="previewSrc && previewState !== 'error'"
          class="preview-image"
          :src="previewSrc"
          alt=""
          :class="{ 'preview-image--loading': previewState === 'loading' }"
          @load="onPreviewLoad"
          @error="onPreviewError"
        />
        <ion-note
          v-else-if="previewState === 'error'"
          color="danger"
        >
          {{ previewMessage }}
        </ion-note>
      </div>

      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="end"
      >
        <ion-fab-button
          :disabled="!canSave"
          :title="translate('Save')"
          @click="save"
        >
          <ion-spinner
            v-if="saving"
            name="crescent"
          />
          <ion-icon
            v-else
            :icon="saveOutline"
          />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonModal,
  IonNote, IonSpinner, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref, watch } from "vue"
import { closeOutline, saveOutline } from "ionicons/icons"
import { translate } from "@common"

const props = defineProps<{
  isOpen: boolean
  value: string
  saving: boolean
}>()

const emit = defineEmits<{
  (event: "save", imageUrl: string): void
  (event: "dismiss"): void
}>()

type PreviewState = "idle" | "loading" | "ready" | "error"

const draftUrl = ref("")
const previewState = ref<PreviewState>("idle")
const previewSrc = ref("")
const previewMessage = ref("")
let previewTimer: number | undefined

const trimmedUrl = computed(() => draftUrl.value.trim())
const savedUrl = computed(() => props.value.trim())
const canSave = computed(() =>
  !props.saving &&
  trimmedUrl.value !== savedUrl.value
)

const resetPreview = () => {
  if(previewTimer) {
    window.clearTimeout(previewTimer)
    previewTimer = undefined
  }
  previewSrc.value = ""
  previewState.value = "idle"
  previewMessage.value = ""
}

const setPreviewError = (message: string) => {
  previewState.value = "error"
  previewMessage.value = message
}

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)

    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

const loadPreview = () => {
  const url = trimmedUrl.value
  previewSrc.value = ""

  if(!url) {
    previewState.value = "idle"
    previewMessage.value = ""

    return
  }

  if(!isHttpUrl(url)) {
    setPreviewError(translate("Enter a valid image URL"))

    return
  }

  previewState.value = "loading"
  previewMessage.value = ""
  previewSrc.value = url
}

const queuePreview = () => {
  if(previewTimer) {
    window.clearTimeout(previewTimer)
  }
  previewTimer = window.setTimeout(loadPreview, 300)
}

watch(
  () => props.isOpen,
  (open) => {
    if(open) {
      draftUrl.value = props.value
      queuePreview()
    } else {
      resetPreview()
    }
  }
)

watch(draftUrl, () => {
  if(!props.isOpen) {return}
  queuePreview()
})

const save = () => {
  if(!canSave.value) {return}
  emit("save", trimmedUrl.value)
}

const onPreviewLoad = () => {
  if(previewSrc.value !== trimmedUrl.value) {return}
  previewState.value = "ready"
}

const onPreviewError = () => {
  if(previewSrc.value !== trimmedUrl.value) {return}
  setPreviewError(translate("Could not load image preview"))
}
</script>

<style scoped>
.preview-content::part(scroll) {
  display: flex;
  flex-direction: column;
}

.preview-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 360px;
  margin-top: 16px;
  padding-bottom: 72px;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.preview-image--loading {
  display: none;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
</style>
