<script setup lang="ts">
import { ref, computed } from "vue";

type ChartActionOption = {
  label: string;
  value: string;
  icon?: string;
};

const props = defineProps<{
  chartActionOptions: ChartActionOption[];
  chartAction: string;
  chartActionColor: string;
  refreshingAll: boolean;
  resettingView: boolean;
  hasSelectedCards: boolean;
  hasCards: boolean;
}>();

const emit = defineEmits<{
  (e: "update:chartAction", value: string): void;
  (e: "update:chartActionColor", value: string): void;
  (e: "toggleCreate"): void;
  (e: "openGenerator"): void;
  (e: "refreshAll"): void;
  (e: "resetView"): void;
  (e: "removeSelected"): void;
  (e: "removeAll"): void;
  (e: "openSettings"): void;
}>();

const swatches = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#1F2937",
  "#FFFFFF",
];

const showColorPicker = ref(false);
const isColorAction = computed(() => props.chartAction === "OverrideColorInRevit");

function onChartActionChange(value: string | null | undefined) {
  const next = value || "SelectionInRevit";
  emit("update:chartAction", next);
  if (next === "OverrideColorInRevit") {
    showColorPicker.value = true;
  }
}

function pickColor(c: string) {
  emit("update:chartActionColor", c);
}

function onHexInput(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) emit("update:chartActionColor", v.toUpperCase());
}
</script>

<template>
  <div class="toolbar-controls">
    <div class="action-cluster">
      <SelectButton
        class="chart-action-switch"
        :options="props.chartActionOptions"
        optionLabel="label"
        optionValue="value"
        :modelValue="props.chartAction"
        :allowEmpty="false"
        aria-label="Chart click action"
        @update:modelValue="onChartActionChange"
      >
        <template #option="slotProps">
          <span class="action-opt">
            <i v-if="slotProps.option.icon" :class="slotProps.option.icon" />
            <span>{{ slotProps.option.label }}</span>
          </span>
        </template>
      </SelectButton>

      <div v-if="isColorAction" class="color-pill">
        <button
          type="button"
          class="color-swatch-btn"
          :style="{ background: props.chartActionColor }"
          :title="`Click action color: ${props.chartActionColor}`"
          aria-label="Open color picker"
          @click="showColorPicker = !showColorPicker"
        />
        <div v-if="showColorPicker" class="color-popover">
          <div class="color-popover__title">Override color</div>
          <div class="swatches">
            <button
              v-for="c in swatches"
              :key="c"
              type="button"
              class="swatch"
              :class="{ 'swatch--active': c.toLowerCase() === props.chartActionColor.toLowerCase() }"
              :style="{ background: c }"
              :title="c"
              @click="pickColor(c)"
            />
          </div>
          <div class="color-popover__hex">
            <label>Hex</label>
            <input
              type="text"
              :value="props.chartActionColor"
              maxlength="7"
              spellcheck="false"
              @input="onHexInput"
            />
          </div>
          <button class="color-popover__close" type="button" @click="showColorPicker = false">
            Close
          </button>
        </div>
      </div>
    </div>

    <span class="divider" />

    <button
      type="button"
      class="toolbar-btn"
      title="Create card"
      @click="emit('toggleCreate')"
    >
      <i class="pi pi-plus" />
    </button>
    <button
      type="button"
      class="toolbar-btn toolbar-btn--accent"
      title="Bulk generator"
      @click="emit('openGenerator')"
    >
      <i class="pi pi-sparkles" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Refresh all cards"
      :disabled="props.refreshingAll"
      @click="emit('refreshAll')"
    >
      <i class="pi pi-refresh" :class="props.refreshingAll ? 'pi-spin' : ''" />
    </button>

    <span class="divider" />

    <button
      type="button"
      class="toolbar-btn toolbar-btn--reset"
      title="Reset overrides and isolation in the active Revit view"
      :disabled="props.resettingView"
      @click="emit('resetView')"
    >
      <i class="pi pi-undo" :class="props.resettingView ? 'pi-spin' : ''" />
      <span class="toolbar-btn__text">Reset view</span>
    </button>

    <span class="divider" />

    <button
      type="button"
      class="toolbar-btn toolbar-btn--danger"
      title="Delete selected cards"
      :disabled="!props.hasSelectedCards"
      @click="emit('removeSelected')"
    >
      <i class="pi pi-times" />
    </button>
    <button
      type="button"
      class="toolbar-btn toolbar-btn--danger"
      title="Delete all cards"
      :disabled="!props.hasCards"
      @click="emit('removeAll')"
    >
      <i class="pi pi-trash" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="AI settings"
      @click="emit('openSettings')"
    >
      <i class="pi pi-cog" />
    </button>
  </div>
</template>

<style scoped>
.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-cluster {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  gap: 0.4rem;
}

.chart-action-switch {
  min-width: 14rem;
}

.action-opt {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.action-opt i {
  font-size: 0.85rem;
}

.color-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.color-swatch-btn {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.6rem;
  border: 2px solid var(--p-surface-300, #d1d5db);
  cursor: pointer;
  box-shadow: inset 0 0 0 2px var(--p-surface-0, #ffffff);
  transition: transform 0.12s, border-color 0.12s;
}

.color-swatch-btn:hover {
  transform: scale(1.05);
  border-color: var(--p-primary-500, #0284c7);
}

.color-popover {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  z-index: 100;
  width: 14rem;
  padding: 0.75rem;
  background: var(--p-surface-0, #ffffff);
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 0.6rem;
  box-shadow:
    0 12px 28px -8px rgba(15, 23, 42, 0.35),
    0 4px 8px -4px rgba(15, 23, 42, 0.2);
}

.color-popover__title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-surface-600, #475569);
  margin-bottom: 0.55rem;
}

.swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
}

.swatch {
  aspect-ratio: 1;
  width: 100%;
  border-radius: 0.4rem;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  padding: 0;
}

.swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
}

.swatch--active {
  box-shadow: 0 0 0 2px var(--p-primary-500, #0284c7);
}

.color-popover__hex {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.65rem;
}

.color-popover__hex label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--p-surface-500, #64748b);
}

.color-popover__hex input {
  flex: 1;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.75rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid var(--p-surface-300, #d1d5db);
  border-radius: 0.35rem;
  background: var(--p-surface-50, #f8fafc);
  text-transform: uppercase;
}

.color-popover__hex input:focus {
  outline: none;
  border-color: var(--p-primary-500, #0284c7);
  background: var(--p-surface-0, #ffffff);
}

.color-popover__close {
  width: 100%;
  margin-top: 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.3rem 0.55rem;
  background: var(--p-surface-100, #f1f5f9);
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 0.35rem;
  cursor: pointer;
  color: var(--p-surface-700, #334155);
}

.color-popover__close:hover {
  background: var(--p-surface-200, #e2e8f0);
}

.divider {
  width: 1px;
  height: 1.6rem;
  background: var(--p-surface-200, #e2e8f0);
  margin: 0 0.15rem;
  align-self: center;
}

.toolbar-btn {
  height: 2.2rem;
  min-width: 2.2rem;
  padding: 0 0.6rem;
  border: 1px solid var(--p-surface-300, #d1d5db);
  border-radius: 0.6rem;
  background: var(--p-surface-0, #ffffff);
  color: var(--p-surface-800, #1e293b);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--p-surface-100, #f1f5f9);
  border-color: var(--p-surface-400, #94a3b8);
}

.toolbar-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.toolbar-btn__text {
  white-space: nowrap;
}

.toolbar-btn--accent {
  border-color: var(--p-primary-400, #38bdf8);
  color: var(--p-primary-600, #0284c7);
  background: var(--p-primary-50, #f0f9ff);
}

.toolbar-btn--accent:hover:not(:disabled) {
  background: var(--p-primary-100, #e0f2fe);
  border-color: var(--p-primary-500, #0284c7);
}

.toolbar-btn--reset {
  border-color: var(--p-amber-400, #fbbf24);
  color: var(--p-amber-700, #b45309);
  background: var(--p-amber-50, #fffbeb);
  padding: 0 0.7rem;
}

.toolbar-btn--reset:hover:not(:disabled) {
  background: var(--p-amber-100, #fef3c7);
  border-color: var(--p-amber-500, #f59e0b);
}

.toolbar-btn--danger {
  border-color: var(--p-red-300, #fca5a5);
  color: var(--p-red-600, #dc2626);
}

.toolbar-btn--danger:hover:not(:disabled) {
  background: var(--p-red-50, #fef2f2);
  border-color: var(--p-red-500, #dc2626);
}
</style>
