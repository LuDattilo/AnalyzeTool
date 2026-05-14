<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useElementsStore } from "@/stores/useElementsStore";
import { useChartDefaults } from "@/composables/useChartDefaults";
import ChartContainer from "@/components/charts/ChartContainer.vue";

const { items } = storeToRefs(useElementsStore());
const filtered = items;

const { palette, hoverPalette, baseOptions } = useChartDefaults({
  enableZoom: true,
  enablePan: true,
  enableLegend: false,
  zoomMode: "x",
});

const currentType = ref("bar");

const categories = computed(() => {
  const list = Array.isArray(filtered.value) ? filtered.value : [];
  const set = new Set(list.map((e) => (e?.categoryName ?? e?.CategoryName)).filter(Boolean));
  return Array.from(set);
});

const counts = computed(() =>
  categories.value.map((cat) => filtered.value.filter((e) => (e?.categoryName ?? e?.CategoryName) === cat).length),
);

const chartData = computed(() => ({
  labels: categories.value,
  datasets: [
    {
      label: "Elements count",
      data: counts.value,
      backgroundColor: categories.value.map((_, i) => palette.value[i % palette.value.length]),
      hoverBackgroundColor: categories.value.map(
        (_, i) => hoverPalette.value[i % hoverPalette.value.length],
      ),
      borderColor: categories.value.map((_, i) => hoverPalette.value[i % hoverPalette.value.length]),
      borderRadius: 4,
      maxBarThickness: 36,
    },
  ],
}));

const chartOptions = computed(() => {
  const base = baseOptions.value;
  const isCircular = currentType.value === "doughnut" || currentType.value === "polarArea";
  return {
    ...base,
    plugins: {
      ...base.plugins,
      legend: { ...base.plugins.legend, display: isCircular },
    },
    scales: isCircular
      ? undefined
      : {
          x: { ...base.scales.x, title: { display: true, text: "Category" } },
          y: { ...base.scales.y, title: { display: true, text: "Count" } },
        },
  };
});

function onTypeChange(t) {
  currentType.value = t;
}
</script>

<template>
  <div class="category-chart">
    <ChartContainer
      :type="currentType"
      :data="chartData"
      :options="chartOptions"
      title="Categories"
      export-filename="categories-distribution"
      :type-switcher="['bar', 'line', 'doughnut', 'polarArea']"
      @type-change="onTypeChange"
    />
  </div>
</template>

<style scoped>
.category-chart {
  width: 100%;
  height: 22rem;
  min-height: 18rem;
}
</style>
