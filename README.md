# MICRO RACER / ASTRA WORKSHOP

Original mini 4WD workshop and automatic racing game. React, TypeScript, Three.js, Vite. Four silhouettes, 27 parts, three courses, shared CPU/player physics, five cameras and local saves.

**Acceptance is still in progress. GitHub Pages initial enablement is blocked by repository permissions; this is not yet a verified public release.**

Target: https://ryotamatsuki.github.io/racegameastra/

## Development

Node 24.19.0; `npm ci`, `npm test`, `npm run build`, `npm run dev`.

Model tests: `npm test`. Full course benchmarks: `node --import tsx tests/bench.ts`. Tradeoff search: `node --import tsx tests/tradeoff.ts`.

Browser tests: `npx playwright install chromium`, then `npx playwright test`. To test the actual Pages site, use `PUBLIC_URL=https://ryotamatsuki.github.io/racegameastra/ npx playwright test`. Screenshots and traces are uploaded by the Browser acceptance workflow. Headless rendering is not a real-device GPU/FPS certification.

## Controls

Drag to orbit, wheel/pinch to zoom; garage buttons for explosion, assembly, close-up and wheel test. Select a candidate part, inspect differences, then install. Three local save slots.

Race: 1–5 selects camera, Space pauses while focus is inside the game, R requests retry confirmation. Touch buttons provide the same actions. Three laps, 2-second recovery, 3 outs = DNF, 180-second timeout. Time attack uses fixed lane 2; normal race displays seed-based fixed lane assignments.

## Deployment unblock

The first deploy workflow built successfully but `actions/configure-pages` could not create the Pages site: `Resource not accessible by integration`.

Repository owner: Settings → Pages → Build and deployment → Source → **GitHub Actions**. Then rerun the latest CI and GitHub Pages workflow. No token should be placed in source code or chat. The post-deploy browser acceptance must still be run before claiming completion.

See `docs/GAME_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/QA_REPORT.md`, and `ASSET_SOURCES.md`.
