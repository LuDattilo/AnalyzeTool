<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import { Commands, sendRequest } from "@/RevitBridge";
import { ParameterOrgin } from "@/stores/types";
import type { ElementItem, ParameterData } from "@/stores/types";
import { resolveInstanceActionElementIds, type RevitActionMatch } from "@/utils/revitActionTargets";
import { useChartDefaults } from "@/composables/useChartDefaults";
import ChartContainer from "@/components/charts/ChartContainer.vue";

type ChartType = "bar" | "line" | "doughnut" | "polarArea";

type ParamChart = {
  parameter: string;
  entries: { value: string; count: number; elementIds: number[] }[];
  data: any;
  options: any;
};

const props = defineProps<{
  items: ElementItem[];
  filters?: string[];
  search?: string;
  clickAction?: string;
  selectedParameter?: string | null;
}>();

const { palette, hoverPalette, baseOptions } = useChartDefaults({
  enableZoom: true,
  enablePan: true,
  enableLegend: false,
  zoomMode: "x",
});

const activeFilters = computed(() => props.filters ?? []);
const activeSearch = computed(() => (props.search ?? "").trim().toLowerCase());
const hasItems = computed(() => Array.isArray(props.items) && props.items.length > 0);
const expanded = ref<string | null>(null);
const chartTypes = ref<Record<string, ChartType>>({});

const activeClickAction = computed(() =>
  props.clickAction && props.clickAction.toLowerCase() === "isolation" ? "Isolation" : "Selection",
);

function matchesFilters(param: ParameterData, filters: string[]): boolean {
  if (!filters || filters.length === 0) return true;
  return filters.every((filter) => {
    if (filter === "Instance") return param.isTypeParameter === false;
    if (filter === "Type") return param.isTypeParameter === true;
    if (filter === "Schared") return param.orgin === ParameterOrgin.Shared;
    if (filter === "Project") return param.orgin === ParameterOrgin.Project;
    if (filter === "BuildIn") return param.orgin === ParameterOrgin.BuiltIn;
    return false;
  });
}

const parameterCharts = computed(() => {
  if (!props.items || !Array.isArray(props.items)) return [];

  const grouped = new Map<string, Map<string, RevitActionMatch[]>>();

  for (const element of props.items) {
    const parameters: ParameterData[] = (element as any).parameters ?? [];

    for (const param of parameters) {
      if (!matchesFilters(param, activeFilters.value)) continue;

      const paramName = param?.name ?? "Unknown";
      if (props.selectedParameter && paramName !== props.selectedParameter) continue;
      const rawValue = param?.value;
      const valueLabel =
        rawValue === undefined || rawValue === null || rawValue === ""
          ? "(empty)"
          : String(rawValue);

      if (!grouped.has(paramName)) grouped.set(paramName, new Map());
      const valueMap = grouped.get(paramName)!;

      if (!valueMap.has(valueLabel)) valueMap.set(valueLabel, []);
      valueMap.get(valueLabel)!.push({ element, parameter: param });
    }
  }

  return Array.from(grouped.entries())
    .map(([parameter, valueMap]) => {
      const entries = Array.from(valueMap.entries())
        .map(([value, matches]) => {
          const elementIds = resolveInstanceActionElementIds(props.items, matches);
          return { value, count: elementIds.length, elementIds };
        })
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count);

      const q = activeSearch.value;
      let filteredEntries = entries;
      if (q) {
        const paramMatch = parameter.toLowerCase().includes(q);
        filteredEntries = paramMatch
          ? entries
          : entries.filter((e) => e.value.toLowerCase().includes(q));
      }

      if (filteredEntries.length === 0) return null;

      const colors = filteredEntries.map(
        (_, idx) => palette.value[idx % palette.value.length],
      );
      const hoverColors = filteredEntries.map(
        (_, idx) => hoverPalette.value[idx % hoverPalette.value.length],
      );

      const currentType: ChartType = chartTypes.value[parameter] || "bar";
      const isCircular = currentType === "doughnut" || currentType === "polarArea";

      const data = {
        labels: filteredEntries.map((e) => e.value),
        datasets: [
          {
            label: "Count",
            data: filteredEntries.map((e) => e.count),
            backgroundColor: colors,
            hoverBackgroundColor: hoverColors,
            borderColor: hoverColors,
            borderRadius: isCircular ? 0 : 4,
            maxBarThickness: 32,
            fill: currentType === "line" ? false : true,
            tension: 0.3,
          },
        ],
      };

      const base = baseOptions.value;
      const options = {
        ...base,
        plugins: {
          ...base.plugins,
          legend: { ...base.plugins.legend, display: isCircular },
          tooltip: {
            ...base.plugins.tooltip,
            callbacks: {
              label: (context: any) => `Count: ${context.formattedValue}`,
            },
          },
        },
        scales: isCircular ? undefined : base.scales,
        onClick: (evt: any, _elements: any, chart: any) => {
          const points = chart?.getElementsAtEventForMode(
            evt,
            "nearest",
            { intersect: true },
            false,
          );
          if (!points?.length) return;
          const idx = points[0].index;
          const entry = filteredEntries[idx];
          if (!entry) return;
          const command =
            activeClickAction.value === "Isolation"
              ? Commands.IsolationInRevit
              : Commands.SelectionInRevit;
          sendRequest(command, { elementIds: entry.elementIds }).catch((err) => {
            console.error("Failed to send selection request", err);
          });
        },
      };

      return { parameter, entries: filteredEntries, data, options };
    })
    .filter((c): c is ParamChart => Boolean(c))
    .sort((a, b) => {
      const totalA = a.entries.reduce((sum, e) => sum + e.count, 0);
      const totalB = b.entries.reduce((sum, e) => sum + e.count, 0);
      if (totalA !== totalB) return totalB - totalA;
      return a.parameter.localeCompare(b.parameter);
    });
});

const visibleCharts = computed(() => {
  if (!expanded.value) return parameterCharts.value;
  return parameterCharts.value.filter((c) => c.parameter === expanded.value);
});

function toggleExpand(parameter: string) {
  expanded.value = expanded.value === parameter ? null : parameter;
  nextTick(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function getChartType(parameter: string): ChartType {
  return chartTypes.value[parameter] || "bar";
}

function onTypeChange(parameter: string, t: ChartType) {
  chartTypes.value = { ...chartTypes.value, [parameter]: t };
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="parameterCharts.length === 0 && hasItems" class="text-sm text-surface-500">
      No parameters match the selected filters.
    </div>

    <div
      class="grid gap-4"
      :class="expanded ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'"
    >
      <Panel v-for="chart in visibleCharts" :key="chart.parameter" class="w-full">
        <template #header>
          <div class="flex justify-between items-center w-full gap-2">
            <span class="font-semibold truncate">{{ chart.parameter }}</span>
            <Button
              size="small"
              severity="secondary"
              :icon="
                expanded === chart.parameter ? 'pi pi-window-minimize' : 'pi pi-window-maximize'
              "
              :label="expanded === chart.parameter ? 'Collapse' : 'Expand'"
              @click.stop="toggleExpand(chart.parameter)"
            />
          </div>
        </template>
        <div class="chart-slot" :class="expanded === chart.parameter ? 'is-expanded' : ''">
          <ChartContainer
            :type="getChartType(chart.parameter)"
            :data="chart.data"
            :options="chart.options"
            :title="chart.parameter"
            :type-switcher="['bar', 'line', 'doughnut', 'polarArea']"
            :export-filename="chart.parameter"
            :show-toolbar="true"
            @type-change="(t) => onTypeChange(chart.parameter, t)"
          />
        </div>
      </Panel>
    </div>
  </div>
</template>

<style scoped>
.chart-slot {
  width: 100%;
  height: 18rem;
}

.chart-slot.is-expanded {
  height: calc(100vh - 14rem);
  min-height: 24rem;
}
</style>
