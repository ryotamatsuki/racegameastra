# Implementation status

Baseline: main 3463066. GAME_SPEC.md read in full before implementation. Repository initially contained only specification and README.

## Scope decision
The copied specification mentions racegame in its header and deployment section. The user's explicit target is racegameastra. All base paths and deployment target therefore use /racegameastra/. No mandatory feature is removed.

## Milestone 1
Implemented typed 4-machine/27-part catalog, common fixed-step simulation, curved procedural car models, workshop, React garage and race UI, storage, audio, and initial model tests. Build succeeds. Eight model tests pass. Three-course tuning and real-browser verification are still in progress. This milestone is NOT a completed acceptance result.

## Milestone 2
- Fixed multi-lap landing comparisons, launch-surface recontact, right-handed model orientation, and recovery run-up.
- Added deterministic tradeoff fixture, 20 model/geometry/storage tests, and browser acceptance workflow.
- Added desktop and touch UI, original procedural assets and licenses, audio, settings, failure handling, camera module.
- CI npm ci/typecheck/model tests/build succeeded. Pages enablement was denied by integration permission. Interactive cloud Chrome cannot create WebGL 2; explicit error UI was inspected. Public URL is currently 404.
- Browser acceptance on GitHub-hosted headless Chromium is in progress. Its images must be inspected before any rendered-view PASS.
- See QA_REPORT.md for the acceptance matrix; this project is not yet a verified public completion.

## Milestone 3 — four-lap lane cycle
- Rebased the change on main `398f0efcf87f6ca178d0d2014877670e99e52176`, preserving the completed-lane separation and finish-pose regression fix.
- Normal race and time attack now run four laps. Each lap advances to the next of four lanes, so every car traverses all four lanes exactly once regardless of its seed-based starting lane.
- The final 12% of every course is a smooth lane-change route; arc-length state is remapped at the timing line to prevent false laps or render jumps when lane lengths differ.
- Existing course styling is retained. Internal dividers open only in the lane-change zone, while the two exterior course walls remain in place.
- HUD, result table, best-time keys, README, architecture notes and GAME_SPEC were updated for four-lap semantics. Legacy three-lap bests are not compared with the new records.
- Branch validation passed `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`, including new regression tests for lane-change continuity, four-lane visitation and four-lap completion.
- Slow software rendering exposed a countdown deadlock: frames over 0.25 s were discarded before countdown ticks could run. Countdown presentation time now advances by at most one second on such frames while vehicle-physics catch-up remains disabled; running races still use the existing explicit pause safeguard. Browser acceptance also resumes that intentional safeguard instead of treating it as a product failure.
- Pull-request desktop and mobile browser acceptance are the final gates before merge.
