import { computed, onBeforeUnmount, onMounted, ref } from "vue";

export type ChartZoomMode = "x" | "y" | "xy";

export interface ChartDefaultsOptions {
  zoomMode?: ChartZoomMode;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableLegend?: boolean;
  beginAtZero?: boolean;
}

export function resolveCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function useThemeVersion() {
  const themeVersion = ref(0);
  let observer: MutationObserver | null = null;

  onMounted(() => {
    if (typeof window === "undefined") return;
    observer = new MutationObserver(() => {
      themeVersion.value += 1;
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return themeVersion;
}

export function usePalette(themeVersion: { value: number }) {
  return computed(() => {
    void themeVersion.value;
    return [
      resolveCssVar("--p-blue-500", "#3b82f6"),
      resolveCssVar("--p-emerald-500", "#10b981"),
      resolveCssVar("--p-amber-500", "#f59e0b"),
      resolveCssVar("--p-violet-500", "#8b5cf6"),
      resolveCssVar("--p-cyan-500", "#06b6d4"),
      resolveCssVar("--p-red-500", "#ef4444"),
      resolveCssVar("--p-yellow-500", "#eab308"),
      resolveCssVar("--p-lime-500", "#84cc16"),
      resolveCssVar("--p-orange-500", "#f97316"),
      resolveCssVar("--p-pink-500", "#ec4899"),
      resolveCssVar("--p-teal-500", "#14b8a6"),
      resolveCssVar("--p-indigo-500", "#6366f1"),
    ];
  });
}

export function useHoverPalette(themeVersion: { value: number }) {
  return computed(() => {
    void themeVersion.value;
    return [
      resolveCssVar("--p-blue-600", "#2563eb"),
      resolveCssVar("--p-emerald-600", "#059669"),
      resolveCssVar("--p-amber-600", "#d97706"),
      resolveCssVar("--p-violet-600", "#7c3aed"),
      resolveCssVar("--p-cyan-600", "#0891b2"),
      resolveCssVar("--p-red-600", "#dc2626"),
      resolveCssVar("--p-yellow-600", "#ca8a04"),
      resolveCssVar("--p-lime-600", "#65a30d"),
      resolveCssVar("--p-orange-600", "#ea580c"),
      resolveCssVar("--p-pink-600", "#db2777"),
      resolveCssVar("--p-teal-600", "#0d9488"),
      resolveCssVar("--p-indigo-600", "#4f46e5"),
    ];
  });
}

export function buildZoomPluginOptions(
  enableZoom: boolean,
  enablePan: boolean,
  mode: ChartZoomMode,
) {
  return {
    pan: {
      enabled: enablePan,
      mode,
      modifierKey: undefined,
      threshold: 4,
    },
    zoom: {
      wheel: {
        enabled: enableZoom,
        speed: 0.08,
      },
      pinch: {
        enabled: enableZoom,
      },
      drag: {
        enabled: false,
      },
      mode,
    },
    limits: {
      x: { min: "original" as const, max: "original" as const, minRange: 1 },
      y: { min: "original" as const, max: "original" as const, minRange: 1 },
    },
  };
}

export function useChartDefaults(opts: ChartDefaultsOptions = {}) {
  const {
    zoomMode = "xy",
    enableZoom = true,
    enablePan = true,
    enableLegend = false,
    beginAtZero = true,
  } = opts;

  const themeVersion = useThemeVersion();
  const palette = usePalette(themeVersion);
  const hoverPalette = useHoverPalette(themeVersion);

  const baseOptions = computed(() => {
    void themeVersion.value;
    const textColor = resolveCssVar("--p-surface-700", "#334155");
    const gridColor = resolveCssVar("--p-surface-300", "#e2e8f0");

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: {
        mode: "nearest" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: enableLegend,
          position: "top" as const,
          labels: { color: textColor },
        },
        tooltip: {
          enabled: true,
          backgroundColor: resolveCssVar("--p-surface-900", "#0f172a"),
          titleColor: resolveCssVar("--p-surface-0", "#ffffff"),
          bodyColor: resolveCssVar("--p-surface-100", "#f1f5f9"),
          borderColor: resolveCssVar("--p-primary-500", "#3b82f6"),
          borderWidth: 1,
          padding: 8,
          cornerRadius: 6,
        },
        zoom: buildZoomPluginOptions(enableZoom, enablePan, zoomMode),
      },
      scales: {
        x: {
          ticks: { autoSkip: true, maxRotation: 0, color: textColor },
          grid: { display: false },
        },
        y: {
          beginAtZero,
          ticks: { precision: 0, color: textColor },
          grid: { color: gridColor },
        },
      },
    };
  });

  return {
    themeVersion,
    palette,
    hoverPalette,
    baseOptions,
  };
}
