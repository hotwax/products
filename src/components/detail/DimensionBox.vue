<template>
  <div class="dim-box">
    <svg
      v-if="hasAny"
      :viewBox="`0 0 ${VIEW} ${VIEW}`"
      class="dim-svg"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- back edges (dashed, behind) -->
      <polyline
        :points="backEdges"
        class="edge edge-hidden"
      />
      <!-- three visible faces, painted back-to-front -->
      <polygon
        :points="faceLeft"
        class="face face-left"
      />
      <polygon
        :points="faceRight"
        class="face face-right"
      />
      <polygon
        :points="faceTop"
        class="face face-top"
      />
      <polyline
        :points="frontEdges"
        class="edge"
      />

      <!-- dimension labels at edge midpoints -->
      <text
        v-if="width"
        :x="widthLabel.x"
        :y="widthLabel.y"
        class="dim-label"
      >{{ fmt(width) }} {{ widthUnit }}</text>
      <text
        v-if="depth"
        :x="depthLabel.x"
        :y="depthLabel.y"
        class="dim-label"
      >{{ fmt(depth) }} {{ depthUnit }}</text>
      <text
        v-if="height"
        :x="heightLabel.x"
        :y="heightLabel.y"
        class="dim-label dim-label--v"
      >{{ fmt(height) }} {{ heightUnit }}</text>
    </svg>

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

const VIEW = 240
const COS = Math.cos(Math.PI / 6) // 30°
const SIN = Math.sin(Math.PI / 6)

const num = (value: number | "" | null) => (typeof value === "number" && value > 0 ? value : 0)
const width = computed(() => num(props.width))
const height = computed(() => num(props.height))
const depth = computed(() => num(props.depth))
const hasAny = computed(() => width.value > 0 || height.value > 0 || depth.value > 0)

/** Scale real dims to screen units so the largest axis fills the available room; each axis keeps a
 *  small minimum so a zero/blank dimension still reads as a thin slab rather than vanishing. */
const scaled = computed(() => {
  const max = Math.max(width.value, height.value, depth.value, 1)
  const span = 96
  const floor = 14
  const to = (value: number) => (value > 0 ? floor + (value / max) * (span - floor) : floor)

  return { w: to(width.value), h: to(height.value), d: to(depth.value) }
})

/** project (i,j,k) in box space → screen point. width↘, depth↙, height↑ */
const project = (i: number, j: number, k: number) => {
  const { w, h, d } = scaled.value
  const cx = VIEW / 2
  const cy = VIEW / 2 + h / 2

  return {
    x: cx + i * w * COS - j * d * COS,
    y: cy + i * w * SIN + j * d * SIN - k * h
  }
}
const pt = (p: { x: number; y: number }) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`
const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

// 8 corners
const c = computed(() => ({
  o: project(0, 0, 0), x: project(1, 0, 0), z: project(0, 1, 0), xz: project(1, 1, 0),
  oH: project(0, 0, 1), xH: project(1, 0, 1), zH: project(0, 1, 1), xzH: project(1, 1, 1)
}))

const faceTop = computed(() => [c.value.oH, c.value.xH, c.value.xzH, c.value.zH].map(pt).join(" "))
const faceRight = computed(() => [c.value.x, c.value.xz, c.value.xzH, c.value.xH].map(pt).join(" "))
const faceLeft = computed(() => [c.value.z, c.value.xz, c.value.xzH, c.value.zH].map(pt).join(" "))
const frontEdges = computed(() =>
  [c.value.x, c.value.o, c.value.z, c.value.zH, c.value.oH, c.value.xH, c.value.x, c.value.xz].map(pt).join(" "))
const backEdges = computed(() => [c.value.o, c.value.oH].map(pt).join(" "))

const widthLabel = computed(() => {
  const m = mid(c.value.o, c.value.x);

  return { x: m.x + 6, y: m.y + 14 }
})
const depthLabel = computed(() => {
  const m = mid(c.value.o, c.value.z);

  return { x: m.x - 6, y: m.y + 14 }
})
const heightLabel = computed(() => {
  const m = mid(c.value.x, c.value.xH);

  return { x: m.x + 8, y: m.y }
})

const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))
const ariaLabel = computed(() =>
  `${fmt(width.value)} ${props.widthUnit} wide, ${fmt(height.value)} ${props.heightUnit} high, ${fmt(depth.value)} ${props.depthUnit} deep`)
</script>

<style scoped>
.dim-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 220px;
}

.dim-svg {
  width: 100%;
  max-width: 320px;
}

.face {
  stroke: var(--ion-color-primary-shade, #3171e0);
  stroke-width: 1;
  stroke-linejoin: round;
}

.face-top { fill: var(--ion-color-primary-tint, #6a9bf4); }
.face-right { fill: var(--ion-color-primary, #3880ff); }
.face-left { fill: var(--ion-color-primary-shade, #3171e0); }

.edge {
  fill: none;
  stroke: var(--ion-color-primary-shade, #3171e0);
  stroke-width: 1.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.edge-hidden {
  stroke: var(--ion-color-medium, #92949c);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.6;
}

.dim-label {
  fill: var(--ion-text-color, #1b1b1b);
  font-size: 11px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
}

.dim-label--v { text-anchor: start; }

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
</style>
