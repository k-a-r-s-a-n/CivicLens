import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), ...tanstackStart(), react()],
  server: {
    hmr: {
      overlay: false,
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["@react-leaflet/core"],
  },
  optimizeDeps: {
    include: ["react-leaflet", "@react-leaflet/core", "leaflet"],
  },
});
