# Changelog

## [Unreleased - fork by LuDattilo] — feature/chart-improvements

### Charts & Visualization

- 🔍 **Zoom & Pan** on all bar/line charts (mouse wheel zoom, drag to pan, pinch on touch). Reset-zoom button in toolbar.
- 🆕 **Statistics Dashboard** view (`/statistics`) with KPI cards, top-categories bar chart, treemap and parameter fill-rate heatmap.
- 🆕 **Treemap chart** — proportional category visualization using `chartjs-chart-treemap`.
- 🆕 **Heatmap chart** — category × parameter fill-rate matrix using `chartjs-chart-matrix` with switchable color scales (blue/viridis/red-green).
- 🔄 **Chart type switcher** in toolbar — switch any chart between bar, line, doughnut, polarArea on the fly.
- 💾 **PNG and CSV export** built into every chart toolbar.
- 🖥 **Fullscreen mode** for any chart (Escape to exit).
- 🎨 Unified palette and dark-mode-aware tooltips/legends via `useChartDefaults` composable.

### Architecture & Performance

- 📦 **Bundle splitting**: vendor chunks for Chart.js, PrimeVue, Vue, and Vue ecosystem. Initial `index` chunk reduced from **1,319 kB to 30 kB** (-97%).
- ⚡ **Lazy-loaded routes**: all secondary views are dynamically imported, loading only the code needed for the active route.
- 🧩 New reusable `ChartContainer.vue` wrapper — single source of truth for chart UX (toolbar, zoom, export, fullscreen).
- 🧮 `useChartDefaults` composable centralizes options, palette, hover colors and theme reactivity.
- 🔧 Plugin registration in `composables/chartSetup.ts` (idempotent, called once on app boot).

### Fixes

- 🐛 Repaired broken `CategoryChart.vue`: store import (`useElements` → `useElementsStore`) and category field (`CategoryName` → `categoryName` with fallback).

## [1.3.0] / 2026-05-10

- 🆕 Added a new "Home" page. Infinite Kanban, where you can view diagrams and tables in one place.
- 🔄 Added a visual "thinking" indicator for buttons during background operations.
- 🔧 Fixed minor bugs in parameter validation and background operations.
- ⚙️ Improved internal processes to make UI actions more responsive.
- ⚙️ Made minor UI refinements for better clarity and consistency.
- ✏️ Added parameter editing functionality.
- 🤖 Added Ollama integration, which enables free local AI usage (Ollama installation is required).
- 🧠 Added AI mode: you can edit parameters with AI or analyze them with AI.

## [1.2.1] / 2025-12-06

- 🆕 Added a new page "Parameter Value Check".
- 🔄 Added a visual "thinking" indicator for buttons to inform users that background operations are running.
- 🔧 Fixed a bug with Revit 2026; the plugin now works correctly with this version.
- 🔧 Fixed several minor bugs related to parameter validation and background operations.
- ⚙️ Improved several internal processes to make UI actions more responsive.
- ⚙️ Minor UI refinements for better clarity and consistency.

## [1.2.0] / 2025-11-29

- Added a new web-based visual interface.
- Added a new code architecture: backend C# and frontend JavaScript/TypeScript with Vue.
- Added a diagram.
- Added a new page "About".
- Removed Revit 2024 support (focus on newer versions).

## [1.1.0] / 2025-09-19

- Added support for Revit 2026.
- Added a brand-new visual interface.
- Made all parameters visible (not only shared parameters).
- Added element selection via right-click on rows.
- Added category selection via ComboBox instead of loading all at once.
- Added parameter filtering by Instance/Type and BuiltIn/Shared/Project.
- Removed Revit 2023 support (focus on newer versions).

## [1.0.0] / 2024-09-18

- First public release of AnalyseTool plugin.
