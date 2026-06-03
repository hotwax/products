<template>
  <div class="dim-box">
    <template v-if="hasDims">
      <!-- CSS 3D cuboid: faces are sized/positioned from the entered dimensions and CSS-transition
           on change, so the box reshapes smoothly and in real time (compositor-driven — no JS
           animation loop, which the preview throttles anyway) -->
      <div class="scene">
        <div class="cuboid">
          <div
            v-for="face in faces"
            :key="face.name"
            class="face"
            :class="`face-${face.name}`"
            :style="face.style"
          />
        </div>
      </div>
      <p class="dim-caption">
        {{ caption }}
      </p>
    </template>

    <div
      v-else
      class="dim-empty"
    >
      <ion-icon :icon="cubeOutline" />
      <p>{{ translate("Enter width, height and depth to preview the box") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from "@ionic/vue"
import { cubeOutline } from "ionicons/icons"
import { computed } from "vue"
import { translate } from "@common"

const props = withDefaults(
  defineProps<{
    width: number | "" | null
    height: number | "" | null
    depth: number | "" | null
    widthUnit?: string
    heightUnit?: string
    depthUnit?: string
  }>(),
  { widthUnit: "", heightUnit: "", depthUnit: "" }
)

/** ion-input type="number" emits its value as a STRING through v-model, so coerce here — otherwise
 *  typed dimensions never reach the preview until a save round-trips them back as numbers. */
const num = (value: number | "" | null) => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""))

  return Number.isFinite(n) && n > 0 ? n : 0
}

const dims = computed(() => ({ w: num(props.width), h: num(props.height), d: num(props.depth) }))
const hasDims = computed(() => dims.value.w > 0 || dims.value.h > 0 || dims.value.d > 0)

/** Scale real dims to screen px so the largest axis fills the room; a floor keeps a zero/blank
 *  axis readable as a thin slab rather than collapsing. */
const scaled = computed(() => {
  const { w, h, d } = dims.value
  const max = Math.max(w, h, d, 1)
  const span = 84
  const floor = 12
  const to = (value: number) => (value > 0 ? floor + (value / max) * (span - floor) : floor)

  return { w: to(w), h: to(h), d: to(d) }
})

const px = (n: number) => `${n.toFixed(1)}px`

/** Each face is centered on the cuboid origin (translate -50%,-50%) then rotated into place and
 *  pushed out by half the perpendicular dimension. width/height/transform all CSS-transition. */
const faces = computed(() => {
  const { w, h, d } = scaled.value
  const wh = { width: px(w), height: px(h) }
  const dh = { width: px(d), height: px(h) }
  const wd = { width: px(w), height: px(d) }
  const base = "translate(-50%, -50%)"

  return [
    { name: "front", style: { ...wh, transform: `${base} translateZ(${px(d / 2)})` } },
    { name: "back", style: { ...wh, transform: `${base} rotateY(180deg) translateZ(${px(d / 2)})` } },
    { name: "right", style: { ...dh, transform: `${base} rotateY(90deg) translateZ(${px(w / 2)})` } },
    { name: "left", style: { ...dh, transform: `${base} rotateY(-90deg) translateZ(${px(w / 2)})` } },
    { name: "top", style: { ...wd, transform: `${base} rotateX(90deg) translateZ(${px(h / 2)})` } },
    { name: "bottom", style: { ...wd, transform: `${base} rotateX(-90deg) translateZ(${px(h / 2)})` } }
  ]
})

const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))
const caption = computed(() => {
  const { w, h, d } = dims.value
  const unit = props.widthUnit || props.heightUnit || props.depthUnit
  const dimsText = `${fmt(w)} × ${fmt(h)} × ${fmt(d)}`

  return unit ? `${dimsText} ${unit}` : dimsText
})
</script>

<style scoped>
.dim-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  min-height: 220px;
}

.scene {
  width: 220px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 640px;
  animation: dim-pop 0.28s ease both;
}

.cuboid {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(-24deg) rotateY(-36deg);
}

.face {
  position: absolute;
  left: 50%;
  top: 50%;
  border: 1px solid var(--ion-color-primary-shade, #3171e0);
  /* the smooth morph: faces resize and reposition over 280ms when dimensions change */
  transition: width 0.28s ease, height 0.28s ease, transform 0.28s ease;
}

.face-front,
.face-back { background: var(--ion-color-primary, #3880ff); opacity: 0.92; }
.face-right,
.face-left { background: var(--ion-color-primary-shade, #3171e0); opacity: 0.92; }
.face-top,
.face-bottom { background: var(--ion-color-primary-tint, #6a9bf4); opacity: 0.92; }

.dim-caption {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ion-text-color, #1b1b1b);
}

.dim-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--ion-color-medium);
  text-align: center;
  max-width: 220px;
}

.dim-empty ion-icon {
  font-size: 96px;
  color: var(--ion-color-step-300, #b9b9c0);
}

.dim-empty p {
  margin: 0;
  font-size: 13px;
}

@keyframes dim-pop {
  from { opacity: 0; transform: scale(0.7); }
  to { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .scene { animation: none; }
  .face { transition: none; }
}
</style>
