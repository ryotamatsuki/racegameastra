import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180000,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    actionTimeout: 15000,
    navigationTimeout: 30000,
    baseURL: process.env.PUBLIC_URL || "http://127.0.0.1:4173/racegameastra/",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: process.env.PUBLIC_URL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173/racegameastra/",
        reuseExistingServer: false,
      },
  projects: [
    {
      name: "chromium-desktop",
      use: { browserName: "chromium", viewport: { width: 1920, height: 1080 } },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 915, height: 412 },
      },
    },
  ],
});
