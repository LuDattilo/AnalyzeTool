<script setup lang="ts">
import { ref, computed, nextTick, watch, onBeforeUnmount } from "vue";
import Chart from "primevue/chart";

type ChartType = "bar" | "line" | "pie" | "doughnut" | "polarArea" | "radar";

const props = defineProps<{
  type: ChartType;
  data: any;
  options: any;
  title?: string;
  exportFilename?: string;
  showToolbar?: boolean;
  typeSwitcher?: ChartType[];
  height?: string;
}>();

const emit = defineEmits<{
  (e: "type-change", value: ChartType): void;
}>();

const chartRef = ref<any>(null);
const wrapperRef = ref<HTMLDivElement | null>(null);
const isFullscreen = ref(false);
const currentType = ref<ChartType>(props.type);

watch(
  () => props.type,
  (v) => {
    currentType.value = v;
  },
);

const showToolbar = computed(() => props.showToolbar !== false);

function getChartJsInstance(): any {
  const inst = chartRef.value;
  if (!inst) return null;
  return inst.getChart?.() ?? inst.chart ?? null;
}

function handleResetZoom() {
  const chart = getChartJsInstance();
  if (chart?.resetZoom) chart.resetZoom();
}

function handleDownloadPng() {
  const chart = getChartJsInstance();
  if (!chart) return;
  const url = chart.toBase64Image?.("image/png", 1) ?? chart.canvas?.toDataURL?.("image/png");
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${props.exportFilename || props.title || "chart"}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function handleDownloadCsv() {
  if (!props.data?.labels || !props.data?.datasets) return;
  const labels: string[] = props.data.labels;
  const datasets: Array<{ label?: string; data: number[] }> = props.data.datasets;

  const header = ["label", ...datasets.map((d, i) => d.label || `series_${i + 1}`)];
  const rows = labels.map((label, idx) => {
    const cells = [label, ...datasets.map((d) => d.data?.[idx] ?? "")];
    return cells.map(csvEscape).join(",");
  });
  const csv = [header.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${props.exportFilename || props.title || "chart"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function handleToggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  await nextTick();
  window.dispatchEvent(new Event("resize"));
}

function handleTypeChange(t: ChartType) {
  currentType.value = t;
  emit("type-change", t);
}

function onKey(e: KeyboardEvent) {
  if (isFullscreen.value && e.key === "Escape") {
    isFullscreen.value = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", onKey);
}

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onKey);
  }
});

const containerClass = computed(() =>
  isFullscreen.value ? "chart-container chart-container--fullscreen" : "chart-container",
);

const heightStyle = computed(() => (props.height ? { minHeight: props.height } : {}));
</script>

<template>
  <div ref="wrapperRef" :class="containerClass">
    <div v-if="showToolbar" class="chart-toolbar">
      <div class="chart-toolbar__title">
        <span v-if="title" class="chart-toolbar__title-text">{{ title }}</span>
      </div>
      <div class="chart-toolbar__actions">
        <template v-if="typeSwitcher && typeSwitcher.length > 1">
          <button
            v-for="t in typeSwitcher"
            :key="t"
            class="chart-toolbar__btn chart-toolbar__btn--type"
            :class="{ 'is-active': currentType === t }"
            :title="`View as ${t}`"
            @click="handleTypeChange(t)"
          >
            <i :class="iconForType(t)" />
          </button>
          <span class="chart-toolbar__sep" />
        </template>
        <button
          class="chart-toolbar__btn"
          title="Reset zoom"
          @click="handleResetZoom"
        >
          <i class="pi pi-refresh" />
        </button>
        <button
          class="chart-toolbar__btn"
          title="Download PNG"
          @click="handleDownloadPng"
        >
          <i class="pi pi-image" />
        </button>
        <button
          class="chart-toolbar__btn"
          title="Download CSV"
          @click="handleDownloadCsv"
        >
          <i class="pi pi-file" />
        </button>
        <button
          class="chart-toolbar__btn"
          :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          @click="handleToggleFullscreen"
        >
          <i :class="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'" />
        </button>
      </div>
    </div>
    <div class="chart-canvas-wrap" :style="heightStyle">
      <Chart
        ref="chartRef"
        :type="currentType"
        :data="data"
        :options="options"
        class="chart-canvas"
      />
    </div>
    <div v-if="showToolbar" class="chart-hint">
      Scroll to zoom · Drag to pan · Click data to act in Revit
    </div>
  </div>
</template>

<script lang="ts">
function iconForType(t: string): string {
  switch (t) {
    case "bar":
      return "pi pi-chart-bar";
    case "line":
      return "pi pi-chart-line";
    case "pie":
      return "pi pi-chart-pie";
    case "doughnut":
      return "pi pi-circle";
    case "polarArea":
      return "pi pi-compass";
    case "radar":
      return "pi pi-sitemap";
    default:
      return "pi pi-chart-bar";
  }
}
export default { name: "ChartContainer" };
</script>

<style scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 14rem;
  background: var(--p-surface-0, #ffffff);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.chart-container--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 1rem 1.5rem 1.5rem;
  background: var(--p-surface-0, #ffffff);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  min-height: 100vh;
}

.chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 0.5rem;
  flex-shrink: 0;
}

.chart-toolbar__title-text {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--p-surface-700, #334155);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.chart-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--p-surface-600, #475569);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  padding: 0;
}

.chart-toolbar__btn:hover {
  background: var(--p-surface-100, #f1f5f9);
  border-color: var(--p-surface-200, #e2e8f0);
  color: var(--p-primary-600, #2563eb);
}

.chart-toolbar__btn.is-active {
  background: var(--p-primary-50, #eff6ff);
  border-color: var(--p-primary-300, #93c5fd);
  color: var(--p-primary-700, #1d4ed8);
}

.chart-toolbar__btn i {
  font-size: 0.85rem;
}

.chart-toolbar__sep {
  width: 1px;
  height: 18px;
  background: var(--p-surface-200, #e2e8f0);
  margin: 0 0.25rem;
}

.chart-canvas-wrap {
  flex: 1 1 auto;
  width: 100%;
  min-height: 12rem;
  position: relative;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.chart-hint {
  font-size: 0.7rem;
  color: var(--p-surface-500, #94a3b8);
  text-align: right;
  padding: 0.25rem 0.5rem 0;
  flex-shrink: 0;
  user-select: none;
}
</style>
