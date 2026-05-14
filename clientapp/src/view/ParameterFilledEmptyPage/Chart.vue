<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ParameterFilledEmptyChart",
});
</script>

<script setup>
import { computed, ref } from "vue";
import { Commands, sendRequest } from "@/RevitBridge";
import { resolveInstanceActionElementIds } from "@/utils/revitActionTargets";
import { useChartDefaults, resolveCssVar } from "@/composables/useChartDefaults";
import ChartContainer from "@/components/charts/ChartContainer.vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
});

const { baseOptions } = useChartDefaults({
  enableZoom: true,
  enablePan: true,
  enableLegend: true,
  zoomMode: "x",
});

const currentType = ref("bar");

const parameterStats = computed(() => {
  if (!props.items || !Array.isArray(props.items)) return [];

  const allParams = props.items.flatMap((el) => el.parameters || []);

  const grouped = {};
  for (const p of allParams) {
    if (!grouped[p.name]) grouped[p.name] = [];
    grouped[p.name].push(p);
  }

  return Object.entries(grouped).map(([paramName, params]) => {
    const filled = params.filter((p) => p.value).length;
    const empty = params.filter((p) => !p.value).length;
    return { parameter: paramName, filled, empty };
  });
});

const chartData = computed(() => ({
  labels: parameterStats.value.map((s) => s.parameter),
  datasets: [
    {
      label: "Filled",
      data: parameterStats.value.map((s) => s.filled),
      backgroundColor: resolveCssVar("--p-emerald-500", "#10b981"),
      borderColor: resolveCssVar("--p-emerald-600", "#059669"),
      stack: "params",
      borderRadius: 2,
    },
    {
      label: "Empty",
      data: parameterStats.value.map((s) => s.empty),
      backgroundColor: resolveCssVar("--p-red-500", "#ef4444"),
      borderColor: resolveCssVar("--p-red-600", "#dc2626"),
      stack: "params",
      borderRadius: 2,
    },
  ],
}));

const handleChartClick = (evt, elements, chart) => {
  try {
    const points = chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, false);
    if (!points || !points.length) return;

    const first = points[0];
    const dataIndex = first.index;
    const datasetIndex = first.datasetIndex;

    const paramName = parameterStats.value[dataIndex]?.parameter;
    if (!paramName) return;

    const matchedEntries = (props.items || []).flatMap((element) =>
      (element.parameters || [])
        .filter((parameter) => parameter.name === paramName)
        .map((parameter) => ({ element, parameter })),
    );

    let matches = [];
    if (datasetIndex === 0) {
      matches = matchedEntries.filter((entry) => entry.parameter.value);
    } else if (datasetIndex === 1) {
      matches = matchedEntries.filter((entry) => !entry.parameter.value);
    } else {
      matches = matchedEntries;
    }

    const elementIds = resolveInstanceActionElementIds(props.items || [], matches);

    sendRequest(Commands.SelectionInRevit, { elementIds }).catch((err) =>
      console.error("Error sending chart click:", err),
    );
  } catch (e) {
    console.error("handleChartClick error", e);
  }
};

const chartOptions = computed(() => {
  const base = baseOptions.value;
  return {
    ...base,
    plugins: {
      ...base.plugins,
      legend: { ...base.plugins.legend, position: "top", display: true },
      tooltip: { ...base.plugins.tooltip, mode: "index", intersect: false },
    },
    scales: {
      x: {
        ...base.scales.x,
        stacked: true,
        title: { display: true, text: "Parameters" },
      },
      y: {
        ...base.scales.y,
        stacked: true,
        title: { display: true, text: "Count" },
      },
    },
    onClick: handleChartClick,
  };
});

function onTypeChange(t) {
  currentType.value = t;
}
</script>

<template>
  <div class="filled-empty-chart">
    <ChartContainer
      :type="currentType"
      :data="chartData"
      :options="chartOptions"
      title="Parameter Fill Status"
      export-filename="parameter-fill-status"
      :type-switcher="['bar', 'line']"
      @type-change="onTypeChange"
    />
  </div>
</template>

<style scoped>
.filled-empty-chart {
  width: 100%;
  height: 26rem;
  min-height: 22rem;
}
</style>
