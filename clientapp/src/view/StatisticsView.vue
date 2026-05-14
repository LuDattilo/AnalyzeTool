<script setup lang="ts">
import { computed, shallowRef, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useElementsStore } from "@/stores/useElementsStore";
import { useCategoriesStore } from "@/stores/useCategoriesStore";
import TreemapChart from "@/components/charts/TreemapChart.vue";
import HeatmapChart from "@/components/charts/HeatmapChart.vue";
import ChartContainer from "@/components/charts/ChartContainer.vue";
import { useChartDefaults } from "@/composables/useChartDefaults";
import type { ElementItem, ParameterData } from "@/stores/types";

const elementsStore = useElementsStore();
const categoriesStore = useCategoriesStore();
const { items } = storeToRefs(elementsStore);

const { palette, hoverPalette, baseOptions } = useChartDefaults({
  enableZoom: true,
  enablePan: true,
  enableLegend: false,
  zoomMode: "x",
});

const selectedCategoryFilter = shallowRef<string | null>(null);

const visibleItems = computed<ElementItem[]>(() => {
  const all = items.value || [];
  if (!selectedCategoryFilter.value) return all;
  return all.filter((e) => (e?.categoryName || (e as any)?.CategoryName) === selectedCategoryFilter.value);
});

const categoryDistribution = computed(() => {
  const counts = new Map<string, number>();
  for (const el of visibleItems.value) {
    const cat = el?.categoryName || (el as any)?.CategoryName || "Unknown";
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
});

const totalElements = computed(() => visibleItems.value.length);
const totalCategories = computed(() => categoryDistribution.value.length);
const totalParameters = computed(() => {
  const set = new Set<string>();
  for (const el of visibleItems.value) {
    for (const p of (el.parameters || []) as ParameterData[]) {
      if (p?.name) set.add(p.name);
    }
  }
  return set.size;
});

const fillRate = computed(() => {
  let filled = 0;
  let total = 0;
  for (const el of visibleItems.value) {
    for (const p of (el.parameters || []) as ParameterData[]) {
      total++;
      if (p?.value !== undefined && p?.value !== null && p?.value !== "") filled++;
    }
  }
  return total > 0 ? (filled / total) * 100 : 0;
});

const heatmapMaxParams = 12;
const heatmapMaxCategories = 12;

const heatmapData = computed(() => {
  const byCategory = new Map<string, Map<string, { filled: number; total: number }>>();
  const paramFrequency = new Map<string, number>();
  const categoryFrequency = new Map<string, number>();

  for (const el of visibleItems.value) {
    const cat = el?.categoryName || (el as any)?.CategoryName || "Unknown";
    categoryFrequency.set(cat, (categoryFrequency.get(cat) || 0) + 1);

    if (!byCategory.has(cat)) byCategory.set(cat, new Map());
    const paramMap = byCategory.get(cat)!;

    for (const p of (el.parameters || []) as ParameterData[]) {
      if (!p?.name) continue;
      paramFrequency.set(p.name, (paramFrequency.get(p.name) || 0) + 1);

      if (!paramMap.has(p.name)) paramMap.set(p.name, { filled: 0, total: 0 });
      const cell = paramMap.get(p.name)!;
      cell.total++;
      if (p.value !== undefined && p.value !== null && p.value !== "") cell.filled++;
    }
  }

  const topCategories = Array.from(categoryFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, heatmapMaxCategories)
    .map(([k]) => k);

  const topParams = Array.from(paramFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, heatmapMaxParams)
    .map(([k]) => k);

  const data = [] as Array<{ x: string; y: string; v: number }>;
  for (const cat of topCategories) {
    for (const param of topParams) {
      const cell = byCategory.get(cat)?.get(param);
      const rate = cell && cell.total > 0 ? (cell.filled / cell.total) * 100 : 0;
      data.push({ x: param, y: cat, v: rate });
    }
  }

  return { data, xLabels: topParams, yLabels: topCategories };
});

const topCategoriesData = computed(() => {
  const top = categoryDistribution.value.slice(0, 10);
  return {
    labels: top.map((c) => c.label),
    datasets: [
      {
        label: "Elements",
        data: top.map((c) => c.value),
        backgroundColor: top.map((_, i) => palette.value[i % palette.value.length]),
        hoverBackgroundColor: top.map((_, i) => hoverPalette.value[i % hoverPalette.value.length]),
        borderColor: top.map((_, i) => hoverPalette.value[i % hoverPalette.value.length]),
        borderRadius: 4,
        maxBarThickness: 32,
      },
    ],
  };
});

const topCategoriesOptions = computed(() => ({
  ...baseOptions.value,
  indexAxis: "y" as const,
  scales: {
    x: { ...baseOptions.value.scales.x, beginAtZero: true },
    y: baseOptions.value.scales.x,
  },
  onClick: (evt: any, _els: any, chart: any) => {
    const points = chart?.getElementsAtEventForMode(evt, "nearest", { intersect: true }, false);
    if (!points?.length) return;
    const idx = points[0].index;
    const cat = topCategoriesData.value.labels[idx];
    selectedCategoryFilter.value = selectedCategoryFilter.value === cat ? null : cat;
  },
}));

function clearFilter() {
  selectedCategoryFilter.value = null;
}

onMounted(() => {
  if (!elementsStore.lastLoadedCategory) {
    // No category loaded yet; data will arrive from Revit on demand.
  }
});
</script>

<template>
  <div class="stats-view">
    <header class="stats-header">
      <div>
        <h1 class="stats-title">Statistics Dashboard</h1>
        <p class="stats-subtitle">
          Multi-chart overview of the current category data. Click a bar to filter.
        </p>
      </div>
      <div v-if="selectedCategoryFilter" class="stats-filter-pill">
        Filtered by: <strong>{{ selectedCategoryFilter }}</strong>
        <button class="stats-filter-clear" @click="clearFilter" title="Clear filter">
          <i class="pi pi-times" />
        </button>
      </div>
    </header>

    <div class="stats-kpis">
      <div class="kpi-card">
        <div class="kpi-label">Elements</div>
        <div class="kpi-value">{{ totalElements.toLocaleString() }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Categories</div>
        <div class="kpi-value">{{ totalCategories }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Unique Parameters</div>
        <div class="kpi-value">{{ totalParameters }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Fill Rate</div>
        <div class="kpi-value">{{ fillRate.toFixed(1) }}%</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stats-card stats-card--wide">
        <ChartContainer
          v-if="topCategoriesData.labels.length"
          type="bar"
          :data="topCategoriesData"
          :options="topCategoriesOptions"
          title="Top categories"
          export-filename="top-categories"
        />
        <div v-else class="stats-empty">Load a category to populate.</div>
      </div>

      <div class="stats-card">
        <TreemapChart
          v-if="categoryDistribution.length"
          :data="categoryDistribution"
          title="Category proportions"
          export-filename="category-treemap"
        />
        <div v-else class="stats-empty">No category data.</div>
      </div>

      <div class="stats-card stats-card--full">
        <HeatmapChart
          v-if="heatmapData.data.length"
          :data="heatmapData.data"
          :x-labels="heatmapData.xLabels"
          :y-labels="heatmapData.yLabels"
          title="Parameter fill rate by category"
          export-filename="fill-rate-heatmap"
          value-format="percent"
          color-scale="viridis"
        />
        <div v-else class="stats-empty">Load a category to see the heatmap.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.stats-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--p-surface-800, #1e293b);
  margin: 0;
}

.stats-subtitle {
  font-size: 0.85rem;
  color: var(--p-surface-500, #64748b);
  margin: 0.25rem 0 0;
}

.stats-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 0.25rem 0.75rem;
  background: var(--p-primary-50, #eff6ff);
  border: 1px solid var(--p-primary-200, #bfdbfe);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--p-primary-800, #1e40af);
}

.stats-filter-clear {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--p-primary-700, #1d4ed8);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stats-filter-clear:hover {
  background: var(--p-primary-100, #dbeafe);
}

.stats-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.kpi-card {
  background: var(--p-surface-0, #ffffff);
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 10px;
  padding: 0.75rem 1rem;
}

.kpi-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-surface-500, #64748b);
}

.kpi-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--p-surface-800, #1e293b);
  margin-top: 0.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
}

.stats-card {
  grid-column: span 6;
  height: 22rem;
  background: var(--p-surface-0, #ffffff);
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 12px;
  padding: 0.5rem;
  overflow: hidden;
}

.stats-card--wide {
  grid-column: span 6;
}

.stats-card--full {
  grid-column: span 12;
  height: 28rem;
}

@media (max-width: 1024px) {
  .stats-card,
  .stats-card--wide,
  .stats-card--full {
    grid-column: span 12;
  }
}

.stats-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: var(--p-surface-500, #64748b);
}
</style>
