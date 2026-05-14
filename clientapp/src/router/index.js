import { createWebHistory, createRouter } from "vue-router";

import ParameterCanvasView from "@/view/InfiniteCanvas/ParameterCanvasView.vue";

const AboutView = () => import("@/view/AboutView.vue");
const ParameterFilledEmptyPage = () => import("@/view/ParameterFilledEmptyView.vue");
const RevitDocumentHealthView = () => import("@/view/RevitDocumentHealthView.vue");
const ParameterValueCheckView = () => import("@/view/ParameterValueCheckView.vue");
const FamiliesView = () => import("@/view/FamiliesView.vue");
const ConnectParameters = () => import("@/view/ConnectParameters/ConnectParametersView.vue");
const StatisticsView = () => import("@/view/StatisticsView.vue");

const routes = [
  { path: "/", component: ParameterCanvasView },
  { path: "/index.html", redirect: "/" },
  { path: "/about", component: AboutView },
  { path: "/parameterFilledEmptyPage", component: ParameterFilledEmptyPage },
  { path: "/documenthealth", component: RevitDocumentHealthView },
  { path: "/parametervaluecheck", component: ParameterValueCheckView },
  { path: "/families", component: FamiliesView },
  { path: "/connectParameters", component: ConnectParameters },
  { path: "/parameterCanvasView", component: ParameterCanvasView },
  { path: "/statistics", component: StatisticsView },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
