import { Chart as ChartJS } from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import {
  TreemapController,
  TreemapElement,
} from "chartjs-chart-treemap";

let isRegistered = false;

export function registerChartPlugins() {
  if (isRegistered) return;

  ChartJS.register(
    zoomPlugin,
    MatrixController,
    MatrixElement,
    TreemapController,
    TreemapElement,
  );

  isRegistered = true;
}
