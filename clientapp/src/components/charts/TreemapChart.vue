<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { Chart as ChartJS } from "chart.js/auto";
import { useChartDefaults, resolveCssVar } from "@/composables/useChartDefaults";

type TreeNode = { label: string; value: number; group?: string };

const props = defineProps<{
  data: TreeNode[];
  title?: string;
  exportFilename?: string;
  groupBy?: string;
}>();

const { palette, themeVersion } = useChartDefaults({ enableLegend: false });
const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapperRef = ref<HTMLDivElement | null>(null);
const isFullscreen = ref(false);

let chartInstance: any = null;

function buildConfig() {
  const colors = palette.value;

  return {
    type: "treemap" as any,
    data: {
      datasets: [
        {
          tree: props.data.map((d) => ({ ...d })),
          key: "value",
          groups: props.groupBy ? [props.groupBy] : undefined,
          spacing: 1,
          borderWidth: 1,
          borderColor: resolveCssVar("--p-surface-0", "#ffffff"),
          backgroundColor(ctx: any) {
            if (ctx.type !== "data") return "transparent";
            const idx = ctx.dataIndex ?? 0;
            return colors[idx % colors.length];
          },
          labels: {
            display: true,
            color: "#ffffff",
            font: { size: 11, weight: "bold" as any },
            formatter(ctx: any) {
              const raw = ctx.raw?._data ?? ctx.raw;
              if (!raw) return "";
              return `${raw.label}\n${raw.value}`;
            },
            overflow: "hidden" as any,
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
            title(items: any) {
              const raw = items?.[0]?.raw?._data;
              return raw?.label ?? "";
            },
            label(item: any) {
              const raw = item.raw?._data;
              if (!raw) return "";
              const total = props.data.reduce((sum, d) => sum + d.value, 0);
              const pct = total ? ((raw.value / total) * 100).toFixed(1) : "0";
              return `Count: ${raw.value} (${pct}%)`;
            },
          },
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
  () => [props.data, themeVersion.value],
  () => {
    if (!chartInstance) return;
    chartInstance.data = buildConfig().data;
    chartInstance.update();
  },
  { deep: true },
);

onMounted(() => {
  create();
});

onBeforeUnmount(() => {
  destroy();
});

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
  a.download = `${props.exportFilename || props.title || "treemap"}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
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
  isFullscreen.value ? "treemap-container is-fullscreen" : "treemap-container",
);
</script>

<template>
  <div ref="wrapperRef" :class="containerClass">
    <div class="treemap-toolbar">
      <span v-if="title" class="treemap-title">{{ title }}</span>
      <div class="treemap-actions">
        <button class="treemap-btn" title="Download PNG" @click="handleDownloadPng">
          <i class="pi pi-image" />
        </button>
        <button
          class="treemap-btn"
          :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          @click="handleToggleFullscreen"
        >
          <i :class="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'" />
        </button>
      </div>
    </div>
    <div class="treemap-canvas-wrap">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>

<style scoped>
.treemap-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 16rem;
  background: var(--p-surface-0, #ffffff);
  border-radius: 8px;
  overflow: hidden;
}

.treemap-container.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 1rem 1.5rem 1.5rem;
  background: var(--p-surface-0, #ffffff);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
}

.treemap-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem 0.5rem;
}

.treemap-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--p-surface-700, #334155);
}

.treemap-actions {
  display: flex;
  gap: 0.25rem;
}

.treemap-btn {
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

.treemap-btn:hover {
  background: var(--p-surface-100, #f1f5f9);
  border-color: var(--p-surface-200, #e2e8f0);
  color: var(--p-primary-600, #2563eb);
}

.treemap-canvas-wrap {
  flex: 1 1 auto;
  position: relative;
  min-height: 14rem;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
