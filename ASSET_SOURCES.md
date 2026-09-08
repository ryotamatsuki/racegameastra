# Asset provenance

| Asset | Author/source | Usage and generation |
|---|---|---|
| Four machine bodies and all 27 part variants | Original code authored for this repository | `src/game/rendering/car.ts`: lofted cross sections, bevel extrusion, canopy ellipsoid, wheel/gear geometry. No real product geometry, logo, reference-site source or screenshot copied. |
| Wooden workbench, cutting mat, grid, screwdriver and tray | Original procedural geometry | `scene.ts`; wood grain and mat lines are geometry. No downloaded texture. |
| Three courses, rails, supports, start markings, minimap | Original course functions | `track.ts` is shared by simulation and rendering. Minimap is a precise SVG polyline of these samples. |
| Reflection environment | Original procedural studio panels | Generated with Three.js PMREM at runtime from local geometry; no HDR download. |
| Engine and event sounds | Original Web Audio synthesis | Oscillator frequency follows simulated RPM; short synthesized tones. No sampled audio. |
| Interface typography | Installed system fonts | No font file or external font CDN. Fallback depends on device. |
| Three.js and examples (OrbitControls, BufferGeometryUtils) | Three.js contributors, npm `three` 0.180.0 | MIT; included license text in `THIRD_PARTY_LICENSES.txt`. Bundled locally by Vite. |
| React / React DOM / scheduler | Meta and contributors | MIT; bundled locally; license text in `THIRD_PARTY_LICENSES.txt`. |

Original source is supplied in this repository for the requested game. No paid API, third-party model service, runtime AI call, or hotlink is required. Screenshots in QA artifacts are generated from this implementation and are verification evidence, not game assets.
