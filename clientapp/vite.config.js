import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import plugin from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [plugin(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(fileURLToPath(new URL(".", import.meta.url)), "./src"),
    },
  },
  server: {
    port: 22524,
    middlewareMode: false,
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("chart.js") || id.includes("chartjs-")) {
              return "vendor-chartjs";
            }
            if (id.includes("primevue") || id.includes("@primeuix")) {
              return "vendor-primevue";
            }
            if (id.includes("primeicons")) {
              return "vendor-primeicons";
            }
            if (id.includes("vue-router") || id.includes("pinia")) {
              return "vendor-vue-ecosystem";
            }
            if (id.includes("/vue/") || id.includes("@vue/")) {
              return "vendor-vue";
            }
            if (id.includes("tailwindcss")) {
              return "vendor-tailwind";
            }
            return "vendor-misc";
          }
        },
      },
    },
  },
});
