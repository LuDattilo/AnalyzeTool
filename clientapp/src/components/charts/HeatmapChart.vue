<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import { Chart as ChartJS } from "chart.js/auto";
import { useChartDefaults, resolveCssVar } from "@/composables/useChartDefaults";

type HeatCell = {
  x: string;
  y: string;
  v: number;
};

const props = defineProps<{
  data: HeatCell[];
  xLabels: string[];
  yLabels: string[];
  title?: string;
  exportFilename?: string;
  valueFormat?: "percent" | "count";
  colorScale?: "blue" | "redgreen" | "viridis";
}>();

const { themeVersion } = useChartDefaults();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isFullscreen = ref(false);

let chartInstance: any = null;

function getColor(value: number, max: number): string {
  const scale = props.colorScale || "blue";
  const t = max > 0 ? value / max : 0;

  if (scale === "redgreen") {
    const r = Math.round(239 * (1 - t) + 16 * t);
    const g = Math.round(68 * (1 - t) + 185 * t);
    const b = Math.round(68 * (1 - t) + 129 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (scale === "viridis") {
    const stops = [
      [68, 1, 84],
      [59, 82, 139],
      [33, 145, 140],
      [94, 201, 98],
      [253, 231, 37],
    ];
    const idxF = t * (stops.length - 1);
    const i = Math.floor(idxF);
    const f = idxF - i;
    const a = stops[Math.min(i, stops.length - 1)];
    const b = stops[Math.min(i + 1, stops.length - 1)];
    const r = Math.round(a[0] * (1 - f) + b[0] * f);
    const g = Math.round(a[1] * (1 - f) + b[1] * f);
    const bl = Math.round(a[2] * (1 - f) + b[2] * f);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  const alpha = 0.15 + 0.85 * t;
  return `rgba(59, 130, 246, ${alpha})`;
}

const maxValue = computed(() => Math.max(0, ...props.data.map((d) => d.v)));

function buildConfig() {
  void themeVersion.value;
  const max = maxValue.value;

  return {
    type: "matrix" as any,
    data: {
      datasets: [
        {
          label: props.title || "Heatmap",
          data: props.data.map((d) => ({ x: d.x, y: d.y, v: d.v })),
          backgroundColor(ctx: any) {
            const v = ctx.raw?.v ?? 0;
            return getColor(v, max);
          },
          borderColor: resolveCssVar("--p-surface-0", "#ffffff"),
          borderWidth: 1,
          width(ctx: any) {
            const a = ctx.chart.chartArea;
            if (!a) return 20;
            return (a.right - a.left) / Math.max(1, props.xLabels.length) - 1;
          },
          height(ctx: any) {
            const a = ctx.chart.chartArea;
            if (!a) return 20;
            return (a.bottom - a.top) / Math.max(1, props.yLabels.length) - 1;
          },
        } as any,
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title() {
              return "";
            },
            label(ctx: any) {
              const v = ctx.raw?.v ?? 0;
              const formatted =
                props.valueFormat === "percent" ? `${v.toFixed(1)}%` : `${v}`;
              return [`${ctx.raw?.y}`, `${ctx.raw?.x}`, `Value: ${formatted}`];
            },
          },
        },
      },
      scales: {
        x: {
          type: "category" as const,
          labels: props.xLabels,
          ticks: {
            color: resolveCssVar("--p-surface-700", "#334155"),
            autoSkip: true,
            maxRotation: 45,
            minRotation: 0,
          },
          grid: { display: false },
        },
        y: {
          type: "category" as const,
          labels: props.yLabels,
          offset: true,
          reverse: false,
          ticks: { color: resolveCssVar("--p-surface-700", "#334155") },
          grid: { display: false },
        },
      },
    },
  };
}

function destroy() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function create() {
  if (!canvasRef.value) return;
  destroy();
  chartInstance = new ChartJS(canvasRef.value, buildConfig() as any);
}

watch(
  () => [props.data, props.xLabels, props.yLabels, themeVersion.value],
  () => {
    if (!chartInstance) {
      create();
      return;
    }
    chartInstance.data = buildConfig().data;
    chartInstance.options = buildConfig().options;
    chartInstance.update();
  },
  { deep: true },
);

onMounted(() => create());
onBeforeUnmount(() => destroy());

async function handleToggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  await nextTick();
  window.dispatchEvent(new Event("resize"));
  chartInstance?.resize?.();
}

function handleDownloadPng() {
  if (!chartInstance) return;
  const url = chartInstance.toBase64Image?.("image/png", 1);
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${props.exportFilename || props.title || "heatmap"}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function onKey(e: KeyboardEvent) {
  if (isFullscreen.value && e.key === "Escape") {
    isFullscreen.value = false;
  }
}
if (typeof window !== "undefined") window.addEventListener("keydown", onKey);
onBeforeUnmount(() => {
  if (typeof window !== "undefined") window.removeEventListener("keydown", onKey);
});

const containerClass = computed(() =>
  isFullscreen.value ? "heatmap-container is-fullscreen" : "heatmap-container",
);

const legendStops = computed(() => {
  const max = maxValue.value;
  return [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: max * t,
    color: getColor(max * t, max),
  }));
});
</script>

<template>
  <div :class="containerClass">
    <div class="heatmap-toolbar">
      <span v-if="title" class="heatmap-title">{{ title }}</span>
      <div class="heatmap-actions">
        <button class="heatmap-btn" title="Download PNG" @click="handleDownloadPng">
          <i class="pi pi-image" />
        </button>
        <button
          class="heatmap-btn"
          :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          @click="handleToggleFullscreen"
        >
          <i :class="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'" />
        </button>
      </div>
    </div>
    <div class="heatmap-canvas-wrap">
      <canvas ref="canvasRef" />
    </div>
    <div class="heatmap-legend">
      <span class="heatmap-legend__label">0</span>
      <div class="heatmap-legend__bar">
        <span
          v-for="(stop, i) in legendStops"
          :key="i"
          class="heatmap-legend__stop"
          :style="{ background: stop.color }"
        />
      </div>
      <span class="heatmap-legend__label">
        {{ valueFormat === "percent" ? `${maxValue.toFixed(0)}%` : maxValue }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.heatmap-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 18rem;
  background: var(--p-surface-0, #ffffff);
  border-radius: 8px;
  overflow: hidden;
}

.heatmap-container.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 1rem 1.5rem 1.5rem;
  background: var(--p-surface-0, #ffffff);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
}

.heatmap-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem 0.5rem;
}

.heatmap-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--p-surface-700, #334155);
}

.heatmap-actions {
  display: flex;
  gap: 0.25rem;
}

.heatmap-btn {
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--p-surface-600, #475569);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.heatmap-btn:hover {
  background: var(--p-surface-100, #f1f5f9);
  border-color: var(--p-surface-200, #e2e8f0);
  color: var(--p-primary-600, #2563eb);
}

.heatmap-canvas-wrap {
  flex: 1 1 auto;
  position: relative;
  min-height: 14rem;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--p-surface-600, #475569);
}

.heatmap-legend__bar {
  flex: 1 1 auto;
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.heatmap-legend__stop {
  flex: 1 1 0;
  height: 100%;
}
</style>
