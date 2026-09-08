import { defineConfig } from "vite";
export default defineConfig({
  base: "/racegameastra/",
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
  build: { target: "es2022" },
});
