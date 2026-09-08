# Acceptance report — in progress, NOT a completed public release

Date: 2026-09-08. Baseline specification: `3463066033b7aac602ba0e6b9887806c1313f9a5`.

## Environment and evidence boundaries

- Node 24.19.0, Linux container. Locked npm dependencies. 20 model/geometry/storage tests passed; production build passed.
- GitHub-hosted Ubuntu 24.04 build: npm ci, typecheck, tests and build succeeded in run 34197269555; the deployment job failed at Pages initial enablement.
- Interactive cloud Chrome: actual page reached and screenshot examined, but WebGL 2 is unavailable. The game shows the explicit Japanese error/retry UI. No 3D-rendering PASS can be inferred from this browser.
- CI headless Chromium/ANGLE SwiftShader browser acceptance is a separate test. It is not real GPU or actual smartphone evidence. Results will be recorded after the workflow completes.
- iOS Safari, Android Chrome on real hardware, Edge, Firefox and Safari: unconfirmed.

## A01–A16

| ID | Status | Evidence / remaining limitation |
|---|---|---|
| A01 | PASS | Local model/storage suite 20/20; typecheck/build. Clean npm ci/build verified in GitHub Actions. |
| A02 | BLOCKED | Four lofted geometries implemented; interactive cloud browser lacks WebGL 2; CI images pending visual inspection. |
| A03 | BLOCKED | All 27 entries affect shared setup and physics; save round-trip tests pass. Rendered changes and browser restore need completed E2E. |
| A04 | BLOCKED | Group-based assembly, opposed wheel explosion, orbit/zoom/focus implemented; browser operation and images pending. |
| A05 | PASS | Drive-force tests verify high-torque launch and high-rpm high-speed advantage; gear ratio direction follows the equation. |
| A06 | PASS | Same seed, same lane: A = standard Falcon; B = A with 5:1 gear + grip tires. Oval A 14.0371 s < B 14.2714 s; Technical A 16.4137 s > B 15.8439 s. See evidence/tradeoff.json. |
| A07 | BLOCKED | Model simulation completes all three courses with Falcon and all four machines on every oval lane. Browser full-cycle verification pending. |
| A08 | BLOCKED | Normal/sign, continuity, under-speed loop DNF and three physical landings tested. Actual rendered loop/jump continuity needs visual confirmation. |
| A09 | PASS | Same setup/lane with different car ID produces identical state and charge. Same integrator is used by every car. |
| A10 | PASS | 30/60/120 Hz driver tests produce identical time and position; long-frame pause test passes. |
| A11 | BLOCKED | Visibility/pause and audio lifecycle implemented; interactive successful-render browser test pending. |
| A12 | BLOCKED | Five camera modes and touch buttons implemented; real rendered camera and touch-layout verification pending. |
| A13 | BLOCKED | WebGL failure/retry UI observed in cloud Chrome; quota/access denial/corrupt saves and DNF tested. Asset-fetch error handler implemented; browser fault injection pending. |
| A14 | BLOCKED | Local compressed build estimate recorded. No actual phone/GPU 60-second timing sample. Headless timing collection is separately labeled. |
| A15 | BLOCKED | Pages site creation denied: Resource not accessible by integration. Public URL opened in interactive Chrome and returned 404. Screenshot: evidence/astra-pages-404.jpg. No public-play claim. |
| A16 | PASS | ASSET_SOURCES.md and THIRD_PARTY_LICENSES.txt cover procedural assets and bundled runtime libraries. |

## Known deployment blocker

Run 34197269555 deploy job 101967783055: `Get Pages site failed: Not Found`, then `Create Pages site failed: Resource not accessible by integration`. The workflow has pages:write and id-token:write; its token cannot perform initial site creation. Connected GitHub tools do not expose Pages administration.

Owner action required: repository Settings → Pages → Source → GitHub Actions. Then rerun CI and GitHub Pages. A public URL browser E2E must still follow; successful Actions alone is not completion.

## Required remaining confirmation

Inspect successful headless screenshots and fix any defects; run public deployment after enablement; open and play the actual public URL; collect actual device/browser and 60-second performance samples, and 10-retry resource behavior. Any unperformed test remains BLOCKED. There is no claim of 60 FPS, iPhone compatibility, or public availability at this stage.

## Follow-up verification (2026-09-08)

- Main `cef84eee87c2dba8dd6b120d48f5383a4cedf52a`: CI failed because the WebGL fault-injection test lacked a TypeScript `this` annotation. Browser run 34210772129 failed during the first full-resolution screenshot (15-second timeout); nine tests did not run. These runs are FAIL, not acceptance PASS.
- The retained Chromium trace image was visually inspected: TORQUE BISON has a curved orange shell, canopy, separate wheels/hubs, rollers, wing, shadows and a rendered workbench. This proves this captured frame rendered, not completion of all visual acceptance tests.
- Fix `85be114bed694d443bfc3ce2a6e914b06177f9d5`: annotate the receiver and allow 60 seconds for software-rendered screenshots. Local typecheck/build and all 20 tests pass. Clean CI build job 102102288849 also passes.
- Pages run 34238490431 still fails initial creation with `Resource not accessible by integration` (deploy job 102102417139). Initial Pages configuration remains an owner/admin action. No published-game success is claimed.
- Browser rerun: https://github.com/ryotamatsuki/racegameastra/actions/runs/34238490476 . FAIL: all four machine screenshots were captured and nine-category installation/save restoration passed their assertions, but the 180-second test-wide timeout expired during explosion/focus operations. Nine remaining tests did not run. No camera, finish, phone-performance or public-environment PASS is inferred. Follow-up uses the actual quality settings UI to select low after medium-quality machine captures, with a 480-second functional test budget.
