# Architecture and implementation decisions

## Scope and baseline

Read GAME_SPEC.md in full at main `3463066033b7aac602ba0e6b9887806c1313f9a5`. It contained no implementation. The user's explicit `racegameastra` target overrides copied references to `racegame`. Vite base is `/racegameastra/`; no alternate hosting target is used.

## Modules

- `src/data/catalog.ts`: 4 original silhouettes, 27 interchangeable parts (9 × 3), compatibility tags, SI physical values, and common derived metrics. Geometry and physics read the same Setup IDs. All released parts use micro-v1; invalid IDs are rejected.
- `src/game/simulation/track.ts`: independent arc-length tables for 4 lanes, shared by road mesh and simulation; tangent, normal, lateral direction, curvature vector, bank, gap and brake zones. 2,400 samples per lap; binary search and interpolation by arc length. Horizontal loops and vertical loop have explicit consistent normals.
- `src/game/simulation/engine.ts`: DOM-free common player/CPU integrator and race state machine. No player-specific speed multiplier. Seed rotates lane assignments and chooses visible standard CPU configurations. Time attack uses lane 2 for all builds.
- `src/game/rendering/car.ts`: lofted curved body shells, canopy, vents, stripes, beveled chassis, wheels/hubs/spokes, roller assemblies, motor, gears, batteries, wing and brake. Garage keeps movable part groups; race merges fixed geometry by material and retains rotating wheels.
- `src/game/rendering/scene.ts`: PBR environment generated locally, light, shadow, workshop/track scenes, resource disposal and render diagnostics.
- `src/game/audio/sound.ts`: user-activated Web Audio oscillator, RPM pitch, transient tones, mute and volume.
- `src/ui/App.tsx`: screen flow and semantic HTML controls. HUD updates at about 10 Hz, independently of 120 Hz simulation and requestAnimationFrame rendering.
- `src/storage/save.ts`: versioned validation, three slots, settings, best times separated by race/time-attack mode. Failure continues in memory with a warning.

## Physics (game approximations, not product measurements)

Units: m, kg, s, N, rad. Coordinate system: Y up; model local X forward, Y road normal, Z lateral.

`omega = speed / tireRadius × gearRatio`

`freeOmega = rpm × pi / 30 × voltage / 2.8 × (1 − 0.25 × (1 − charge))`

`drive = stallTorque × voltageFactor × max(0, 1 − omega/freeOmega) × gearRatio × efficiency / tireRadius`

`acceleration = (drive − rolling − air − cornerLoss − brake) / mass − 9.81 × tangent.y`

Rolling loss uses rolling coefficient, mass and positive normal acceleration. Air loss is `0.5 × 1.225 × dragArea × speed²`. Lateral acceleration is `speed² × abs(curvatureVector · side)`. Available lateral support combines tire friction with roller support in N, divided by mass and corrected for CG height. Excess lateral demand produces deterministic drag and overload accumulation; overload above 8 m/s² for 0.32 s causes an out. There is no random out.

Vertical support acceleration is `speed² × (curvatureVector · roadNormal) + 9.81 × roadNormal.y`. At the loop top the gravitational term is negative; insufficient speed loses contact. Recovery for the loop is before its entry, providing run-up distance.

Jump launch uses the incoming ramp tangent, not the descending gap tangent. Flight integrates position and velocity under gravity. Swept segments intersect forward surface patches on the same lane; gap/launch surfaces are excluded and arc lengths are reduced modulo lap length. Impact normal speed and alignment determine loss or out. This prevents the original second-lap landing bug. Flight projection is local and does not choose a globally nearest lower road.

Battery energy is an accelerated gameplay approximation: consumption `(0.18 W + mechanicalPower) × dt / (capacity × 8 J)`. Catalog capacity values are game energy units, not mAh. Voltage sag and mass create a tradeoff; do not interpret this as real battery life.

Brake pads act only in explicit pre-jump zones and above 3.5 m/s. This avoids a constant braking force preventing launch from a recovery stop. Wing stability is an explicit gameplay approximation, not a CFD-derived downforce claim.

## Timing, states and ranking

Fixed step 1/120 s; max 30 substeps. Frames longer than 0.25 s request a pause, rather than silently skipping race time. Render position is interpolated between states. Three laps; crossing times linearly interpolated within the fixed step. Finished records freeze. Rank uses lap plus shared course parameter (checkpoint progression), never raw lane distance. Equal finish times share rank; ID stabilizes row ordering only.

Recovery lasts 2 simulation seconds, race time continues, third out is DNF, and 180 s is an absolute race timeout. Visibility pauses require explicit resume. Retry recreates cars, clock, countdown and camera with the same seed.

## Metrics

Garage speed is no-load gearing speed in km/h; acceleration is zero-speed drive acceleration in m/s². Corner is derived lateral-support acceleration; stability is stability/CG height; endurance is capacity/(stall torque × rpm/60); weight is grams. The latter two are comparative game indices, not measured ratings. Each metric uses one common scale across machines. Pros and cons accompany every part; before/after deltas precede installation.

## Rendering and performance

Curved procedural meshes are source assets. No runtime CDN, texture, model, sound or font download is required. Rubber, metal, paint and canopy use separate roughness/metalness. Race merges static car geometry and retains four wheel groups. Quality controls DPR (1/1.5/2) and shadow resolution (off/1024/2048). Scene changes dispose geometries/materials; renderer lifetime is the app lifetime.

The cloud interactive browser currently lacks WebGL 2. It is not evidence that user devices lack support. CI browser tests are separately labeled headless Chromium/SwiftShader and cannot establish actual phone FPS or real-GPU visual quality.

## Deployment

`pages.yml` runs npm ci → typecheck → model tests → build → upload-pages-artifact → configure-pages → deploy-pages. PR runs never deploy. Node 24.19.0 and dependencies are pinned with lockfile. Actions versions were checked against official GitHub Pages guidance on 2026-09-08. Permissions are contents:read, pages:write and id-token:write on deployment only.

Initial enablement failed with `Resource not accessible by integration`; the repository owner must select Settings → Pages → Source → GitHub Actions. The connected GitHub tool supports code writes but exposes no Pages-admin setting action. Required functionality has not been deleted to bypass this restriction.

Official implementation references:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://vite.dev/guide/static-deploy.html
- https://threejs.org/docs/pages/WebGLRenderer.html
