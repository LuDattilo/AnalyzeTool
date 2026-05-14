<script setup lang="ts">
import { computed, ref } from "vue";
import { Commands, sendRequest } from "@/RevitBridge";
import type { ElementItem, ParameterData } from "@/stores/types";
import { resolveInstanceActionElementIds, type RevitActionMatch } from "@/utils/revitActionTargets";
import { useChartDefaults } from "@/composables/useChartDefaults";
import ChartContainer from "@/components/charts/ChartContainer.vue";

type ChartType = "bar" | "line" | "doughnut" | "polarArea";

const props = defineProps<{
  items: ElementItem[];
  selectedParameter?: string | null;
  actionCommand?: string;
  actionColor?: string;
}>();

const { palette, hoverPalette, baseOptions } = useChartDefaults({
  enableZoom: true,
  enablePan: true,
  enableLegend: false,
  zoomMode: "x",
});

const currentType = ref<ChartType>("bar");

const chartRows = computed(() => {
  const buckets = new Map<string, RevitActionMatch[]>();

  for (const element of props.items || []) {
    const parameters = (element.parameters || []) as ParameterData[];
    for (const parameter of parameters) {
      const name = String(parameter?.name ?? "");
      if (props.selectedParameter && name !== props.selectedParameter) continue;

      const raw = parameter?.value;
      const label = raw === undefined || raw === null || raw === "" ? "(empty)" : String(raw);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push({ element, parameter });
    }
  }

  return Array.from(buckets.entries())
    .map(([label, matches]) => {
      const elementIds = resolveInstanceActionElementIds(props.items || [], matches);
      return { label, value: elementIds.length, elementIds };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 24);
});

const chartData = computed(() => ({
  labels: chartRows.value.map((row) => row.label),
  datasets: [
    {
      label: "Count",
      data: chartRows.value.map((row) => row.value),
      borderRadius: 5,
      backgroundColor: chartRows.value.map((_, idx) => palette.value[idx % palette.value.length]),
      hoverBackgroundColor: chartRows.value.map(
        (_, idx) => hoverPalette.value[idx % hoverPalette.value.length],
      ),
      borderColor: chartRows.value.map(
        (_, idx) => hoverPalette.value[idx % hoverPalette.value.length],
      ),
      maxBarThickness: 32,
      fill: currentType.value === "line" ? false : true,
      tension: 0.3,
    },
  ],
}));

function runActionForIds(elementIds: number[]) {
  if (!elementIds.length) return;
  const command = props.actionCommand || Commands.SelectionInRevit;
  const payload: any =
    command === Commands.OverrideColorInRevit
      ? { elementIds, color: props.actionColor || "#EF4444" }
      : { elementIds };
  sendRequest(command as any, payload).catch((err) => {
    console.error("Failed to execute chart action", err);
  });
}

const chartOptions = computed(() => {
  const base = baseOptions.value;
  const isCircular = currentType.value === "doughnut" || currentType.value === "polarArea";
  return {
    ...base,
    plugins: {
      ...base.plugins,
      legend: {
        ...base.plugins.legend,
        display: isCircular,
      },
    },
    scales: isCircular ? undefined : base.scales,
    onClick: (evt: any, _els: any, chart: any) => {
      const points = chart?.getElementsAtEventForMode(evt, "nearest", { intersect: true }, false);
      if (!points?.length) return;
      const idx = points[0].index;
      const row = chartRows.value[idx];
      if (!row) return;
      runActionForIds(row.elementIds || []);
    },
  };
});

function onTypeChange(t: ChartType) {
  currentType.value = t;
}
</script>

<template>
  <div class="chart-wrap">
    <div v-if="chartRows.length === 0" class="empty-state">No values for this parameter.</div>
    <ChartContainer
      v-else
      :type="currentType"
      :data="chartData"
      :options="chartOptions"
      :title="selectedParameter || 'Values'"
      :type-switcher="['bar', 'line', 'doughnut', 'polarArea']"
      export-filename="bar-chart"
      @type-change="onTypeChange"
    />
  </div>
</template>

<style scoped>
.chart-wrap {
  width: 100%;
  height: 100%;
  min-height: 12rem;
}

.empty-state {
  height: 100%;
  min-height: 12rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  color: var(--p-surface-500, #64748b);
}
</style>
