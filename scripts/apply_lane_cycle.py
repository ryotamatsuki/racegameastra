from pathlib import Path


def patch(path: str, old: str, new: str, expected: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found != expected:
        raise RuntimeError(f"{path}: expected {expected} occurrences, found {found}: {old[:80]!r}")
    p.write_text(text.replace(old, new))


# ---- track model: reusable constants + smooth route sampling in the lane-change zone ----
patch(
    "src/game/simulation/track.ts",
    'export const trackNames = ["WORKSHOP OVAL", "TECHNICAL RIDGE", "SKY LOOP"];\nconst N = 2400;',
    'export const trackNames = ["WORKSHOP OVAL", "TECHNICAL RIDGE", "SKY LOOP"];\nexport const LANE_COUNT = 4;\nexport const RACE_LAPS = 4;\nexport const LANE_CHANGE_START = 0.88;\nconst N = 2400;',
)
patch(
    "src/game/simulation/track.ts",
    '  for (let lane = 0; lane < 4; lane++) {',
    '  for (let lane = 0; lane < LANE_COUNT; lane++) {',
)
route_helpers = r'''
function frameAtU(track: Track, lane: number, u: number): Frame {
  const arr = track.lanes[lane],
    x = Math.max(0, Math.min(N, u * N)),
    lo = Math.min(N - 1, Math.floor(x)),
    hi = Math.min(N, lo + 1),
    q = x - lo,
    a = arr[lo],
    b = arr[hi],
    mix = (a: V, b: V) => add(mul(a, 1 - q), mul(b, q));
  return {
    ...a,
    p: mix(a.p, b.p),
    t: norm(mix(a.t, b.t)),
    n: norm(mix(a.n, b.n)),
    side: norm(mix(a.side, b.side)),
    k: mix(a.k, b.k),
    curvature: a.curvature * (1 - q) + b.curvature * q,
    bank: a.bank * (1 - q) + b.bank * q,
    u,
    s: a.s + (b.s - a.s) * q,
  };
}

// The physical four-lane bed remains unchanged until the final 12% of a lap.
// In that zone each racing route blends to the next lane with a smoothstep.
// The route endpoint therefore coincides with the next lane's start point, so
// switching lane indices at the timing line is continuous rather than a teleport.
export function routeSample(track: Track, lane: number, s: number): Frame {
  const base = sample(track, lane, s);
  if (base.u < LANE_CHANGE_START) return base;
  const nextLane = (lane + 1) % LANE_COUNT,
    target = frameAtU(track, nextLane, base.u),
    x = Math.max(
      0,
      Math.min(1, (base.u - LANE_CHANGE_START) / (1 - LANE_CHANGE_START)),
    ),
    q = x * x * (3 - 2 * x),
    dqdu = (6 * x * (1 - x)) / (1 - LANE_CHANGE_START),
    p = add(mul(base.p, 1 - q), mul(target.p, q)),
    tangent = norm(
      add(
        add(
          mul(base.t, track.lengths[lane] * (1 - q)),
          mul(target.t, track.lengths[nextLane] * q),
        ),
        mul(sub(target.p, base.p), dqdu),
      ),
    );
  let n = norm(add(mul(base.n, 1 - q), mul(target.n, q))),
    side = norm(cross(tangent, n));
  n = norm(cross(side, tangent));
  const k = add(mul(base.k, 1 - q), mul(target.k, q));
  return {
    ...base,
    p,
    t: tangent,
    n,
    side,
    k,
    curvature: length(k),
    bank: base.bank * (1 - q) + target.bank * q,
    zone: "レーンチェンジャー",
    gap: false,
    brake: false,
    loop: false,
  };
}

'''
patch(
    "src/game/simulation/track.ts",
    'export function atU(track: Track, lane: number, u: number) {',
    route_helpers + 'export function atU(track: Track, lane: number, u: number) {',
)

# ---- simulation: four laps, lane switch at each timing-line crossing, remap arc coordinate safely ----
patch(
    "src/game/simulation/engine.ts",
    '  atU,\n',
    '  atU,\n  routeSample,\n  RACE_LAPS,\n  LANE_COUNT,\n',
)
patch("src/game/simulation/engine.ts", '  maxTime: 180,', '  maxTime: 240,')
patch(
    "src/game/simulation/engine.ts",
    '  const shift = ((seed % 4) + 4) % 4;',
    '  const shift = ((seed % LANE_COUNT) + LANE_COUNT) % LANE_COUNT;',
)
patch(
    "src/game/simulation/engine.ts",
    '  for (let id = 0; id < (mode === "race" ? 4 : 1); id++) {',
    '  for (let id = 0; id < (mode === "race" ? LANE_COUNT : 1); id++) {',
)
patch(
    "src/game/simulation/engine.ts",
    '      lane = mode === "time" ? 1 : (id + shift) % 4;',
    '      lane = mode === "time" ? 1 : (id + shift) % LANE_COUNT;',
)
patch(
    "src/game/simulation/engine.ts",
    '      c.p = sample(track, c.lane, c.s).p;',
    '      c.p = routeSample(track, c.lane, c.s).p;',
)
patch(
    "src/game/simulation/engine.ts",
    '  let f = sample(track, c.lane, c.s);',
    '  let f = routeSample(track, c.lane, c.s);',
)
patch(
    "src/game/simulation/engine.ts",
    '    const next = sample(track, c.lane, c.s);',
    '    const next = routeSample(track, c.lane, c.s);',
)
old_lap_block = r'''  const lap = Math.floor(c.s / len);
  if (lap > c.lap) {
    const fraction = (lap * len - c.previousS) / (c.s - c.previousS || 1);
    const crossing = time - dt + Math.max(0, Math.min(1, fraction)) * dt;
    c.lapTimes.push(crossing - c.lastLap);
    c.lastLap = crossing;
    c.lap = lap;
    if (c.lap >= 3) {
      c.state = "finished";
      c.finish = crossing;
      c.previousS = c.s; // Freeze the final render pose as well as physics.
      c.v = 0;
    }
  }
  c.progress = c.lap + sample(track, c.lane, c.s).u;
'''
new_lap_block = r'''  const completedLap = Math.floor(c.s / len);
  if (completedLap > c.lap) {
    const boundary = (c.lap + 1) * len,
      fraction = (boundary - c.previousS) / (c.s - c.previousS || 1),
      crossing = time - dt + Math.max(0, Math.min(1, fraction)) * dt,
      overflow = Math.max(0, c.s - boundary);
    c.lapTimes.push(crossing - c.lastLap);
    c.lastLap = crossing;
    c.lap += 1;

    // routeSample() has already converged to the next lane at u=1. Remap the
    // cumulative arc coordinate to that lane so its different circumference
    // cannot create a false lap or a render jump on the following tick.
    c.lane = (c.lane + 1) % LANE_COUNT;
    const nextLen = track.lengths[c.lane];
    c.s = c.lap * nextLen + (c.lap >= RACE_LAPS ? 0 : overflow);
    c.previousS = c.s;
    c.safeS = c.lap * nextLen;
    const after = routeSample(track, c.lane, c.s);
    c.p = { ...after.p };
    c.previousP = { ...c.p };

    if (c.lap >= RACE_LAPS) {
      c.state = "finished";
      c.finish = crossing;
      c.v = 0;
      c.progress = RACE_LAPS;
      return;
    }
  }
  c.progress = c.lap + routeSample(track, c.lane, c.s).u;
'''
patch("src/game/simulation/engine.ts", old_lap_block, new_lap_block)

# ---- rendering: retain current track look, open walls only in lane-change zone and draw route guides ----
patch(
    "src/game/rendering/scene.ts",
    'import { sample, type Track } from "../simulation/track";',
    'import { LANE_CHANGE_START, routeSample, type Track } from "../simulation/track";',
)
patch(
    "src/game/rendering/scene.ts",
    '''    const road = material(0xe3e4d7, 0, 0.67),\n      walls = [0xdfb348, 0x9dafa5, 0xb9c4bb, 0x788f84].map((c) =>\n        material(c, 0.15, 0.48),\n      );''',
    '''    const road = material(0xe3e4d7, 0, 0.67),\n      wallColors = [0xdfb348, 0x9dafa5, 0xb9c4bb, 0x788f84],\n      walls = wallColors.map((c) => material(c, 0.15, 0.48));''',
)
patch(
    "src/game/rendering/scene.ts",
    '''          if (i > 0 && !f.gap && !fs[i - 4].gap)\n            idx.push(k - 2, k - 1, k, k - 1, k + 1, k);''',
    '''          if (\n            i > 0 &&\n            !f.gap &&\n            !fs[i - 4].gap &&\n            (type === "road" ||\n              (f.u < LANE_CHANGE_START && fs[i - 4].u < LANE_CHANGE_START))\n          )\n            idx.push(k - 2, k - 1, k, k - 1, k + 1, k);''',
)
guide_block = r'''    // Lane-change guides sit on the existing road bed. Removing only the
    // internal walls in this short zone preserves the established course design
    // while making the four smooth crossover routes visually explicit.
    for (let lane = 0; lane < 4; lane++) {
      const points: number[] = [],
        len = track.lengths[lane];
      for (let i = Math.floor(LANE_CHANGE_START * 2400); i < 2400; i += 8) {
        const f = routeSample(track, lane, (i / 2400) * len);
        points.push(f.p.x, f.p.y + 0.004, f.p.z);
      }
      const g = new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(points, 3),
      );
      this.content.add(
        new T.Line(
          g,
          new T.LineBasicMaterial({
            color: wallColors[lane],
            transparent: true,
            opacity: 0.9,
          }),
        ),
      );
    }

'''
patch(
    "src/game/rendering/scene.ts",
    '    // Structural supports and clear start/finish markings.\n',
    guide_block + '    // Structural supports and clear start/finish markings.\n',
)
patch(
    "src/game/rendering/scene.ts",
    '''          f = sample(\n            r.track,\n            c.lane,\n            c.previousS + (c.s - c.previousS) * alpha,\n          );''',
    '''          f = routeSample(\n            r.track,\n            c.lane,\n            c.previousS + (c.s - c.previousS) * alpha,\n          );''',
)

# ---- UI: show four laps/current lane changer, do not mix old 3-lap best records ----
patch(
    "src/ui/App.tsx",
    'import { tracks } from "../game/simulation/track";',
    'import { tracks, RACE_LAPS, routeSample } from "../game/simulation/track";',
)
patch(
    "src/ui/App.tsx",
    '          const key = r.mode + ":" + r.track.id + (r.track.id === 0 ? ":lanes-v2" : ""),',
    '          const key = r.mode + ":" + r.track.id + ":lane-cycle-v1",',
)
patch(
    "src/ui/App.tsx",
    '                    基準レーン {t.lengths[1].toFixed(1)} m / 3 LAPS',
    '                    4レーン1巡 / 4 LAPS',
)
patch(
    "src/ui/App.tsx",
    'BEST {time(saved.bests[mode + ":" + i + (i === 0 ? ":lanes-v2" : "")] ?? null)}',
    'BEST {time(saved.bests[mode + ":" + i + ":lane-cycle-v1"] ?? null)}',
)
patch(
    "src/ui/App.tsx",
    '<option value="time">タイムアタック（基準レーン2）</option>',
    '<option value="time">タイムアタック（4レーン1巡）</option>',
)
patch(
    "src/ui/App.tsx",
    '<summary>レース前確認：レーンとCPUの公開構成</summary>',
    '<summary>レース前確認：スタートレーンとCPUの公開構成</summary>',
)
patch(
    "src/ui/App.tsx",
    '                固定レーンには内外差があります。比較走行はタイムアタックを使ってください。',
    '                4周で全車が4レーンを1回ずつ走行し、周回終盤のレーンチェンジャーで次レーンへ移ります。',
)
patch(
    "src/ui/App.tsx",
    '<strong>{Math.min(3, c.lap + 1)} / 3</strong>',
    '<strong>{Math.min(RACE_LAPS, c.lap + 1)} / {RACE_LAPS}</strong>',
)
patch(
    "src/ui/App.tsx",
    '                        : Math.min(3, a.lap + 1) + "/3"}',
    '                        : Math.min(RACE_LAPS, a.lap + 1) + "/" + RACE_LAPS}',
)
patch(
    "src/ui/App.tsx",
    '''                      : r.track.lanes[c.lane][\n                          Math.min(2400, Math.floor((c.progress % 1) * 2400))\n                        ]?.zone}''',
    '                      : routeSample(r.track, c.lane, c.s).zone}',
)
patch(
    "src/ui/App.tsx",
    '''                    <th>LAP 3</th>\n                    <th>状態</th>''',
    '''                    <th>LAP 3</th>\n                    <th>LAP 4</th>\n                    <th>状態</th>''',
)
patch(
    "src/ui/App.tsx",
    '                      {[0, 1, 2].map((i) => (',
    '                      {[0, 1, 2, 3].map((i) => (',
)

# ---- unit/regression tests ----
patch(
    "tests/model.test.ts",
    'import { tracks, atU, dot, length, sub } from "../src/game/simulation/track";',
    'import {\n  tracks,\n  atU,\n  dot,\n  length,\n  sub,\n  routeSample,\n  RACE_LAPS,\n  LANE_COUNT,\n} from "../src/game/simulation/track";',
)
patch("tests/model.test.ts", '    assert.equal(c.lapTimes.length, 3);', '    assert.equal(c.lapTimes.length, 4);', expected=2)
patch(
    "tests/model.test.ts",
    'test("A06 fixed-lane tradeoff reverses between oval and technical", () => {',
    'test("A06 four-lane-cycle tradeoff reverses between oval and technical", () => {',
)
patch(
    "tests/model.test.ts",
    '        3,\n      );',
    '        4,\n      );',
)
patch(
    "tests/model.test.ts",
    'test("finish requires three traversed laps and freezes a distinct lane pose", () => {',
    'test("finish requires four traversed laps and freezes a distinct lane pose", () => {',
)
patch(
    "tests/model.test.ts",
    '            assert.ok(c.s >= 3 * r.track.lengths[c.lane]);',
    '            assert.ok(c.s >= RACE_LAPS * r.track.lengths[c.lane]);',
)
# The preceding global lapTimes replacement covers this block too.
extra_tests = r'''test("lane changer joins continuously to the next lane on every course", () => {
  for (const track of tracks)
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const before = routeSample(track, lane, track.lengths[lane] - 1e-5).p,
        after = routeSample(track, (lane + 1) % LANE_COUNT, 0).p;
      assert.ok(
        length(sub(before, after)) < 0.002,
        `lane-change discontinuity: course ${track.id}, lane ${lane}`,
      );
    }
});

test("four-lap races visit all four lanes exactly once", () => {
  for (let course = 0; course < 3; course++)
    for (let seed = 0; seed < LANE_COUNT; seed++) {
      const r = createRace(0, standard(0), course, seed),
        c = r.cars[0],
        startLane = c.lane,
        visited = [c.lane];
      let observedLap = 0;
      r.phase = "running";
      while (r.phase === "running") {
        tick(r);
        if (c.lap > observedLap) {
          observedLap = c.lap;
          if (c.lap < RACE_LAPS) visited.push(c.lane);
        }
      }
      assert.equal(c.state, "finished", `course ${course}, seed ${seed}`);
      assert.equal(c.lap, RACE_LAPS);
      assert.equal(c.lapTimes.length, RACE_LAPS);
      assert.equal(new Set(visited).size, LANE_COUNT);
      assert.equal(c.lane, startLane);
    }
});

'''
patch(
    "tests/model.test.ts",
    'test("stationary cars never receive laps or a finish on any course", () => {',
    extra_tests + 'test("stationary cars never receive laps or a finish on any course", () => {',
)

patch(
    "tests/e2e/finish-regression.spec.ts",
    "test('separated oval lanes from countdown through actual finish', async ({ page }, info) => {",
    "test('four-lap oval lane cycle from countdown through actual finish', async ({ page }, info) => {",
)
patch(
    "tests/e2e/finish-regression.spec.ts",
    "  for (const row of await page.locator('tbody tr').all()) await expect(row).toContainText('完走');",
    "  for (const row of await page.locator('tbody tr').all()) await expect(row).toContainText('完走');\n  await expect(page.getByRole('columnheader', { name: 'LAP 4' })).toBeVisible();",
)

# ---- docs: specification and implementation notes match the new race semantics ----
patch(
    "README.md",
    'Race: 1–5 selects camera, Space pauses while focus is inside the game, R requests retry confirmation. Touch buttons provide the same actions. Three laps, 2-second recovery, 3 outs = DNF, 180-second timeout. Time attack uses fixed lane 2; normal race displays seed-based fixed lane assignments.',
    'Race: 1–5 selects camera, Space pauses while focus is inside the game, R requests retry confirmation. Touch buttons provide the same actions. Four laps, 2-second recovery, 3 outs = DNF, 240-second timeout. Normal race and time attack both use the four-lane cycle: the seed determines only the starting lane, and the lane changer advances every car once per lap so all four lanes are traversed once.',
)
patch("docs/GAME_SPEC.md", '版：1.0  ', '版：1.1  ')
patch(
    "docs/GAME_SPEC.md",
    '| F05 | レース | 自車とCPU3台、3周、カウントダウン、順位、タイム、結果 |',
    '| F05 | レース | 自車とCPU3台、4周、毎周レーンチェンジ、カウントダウン、順位、タイム、結果 |',
)
patch(
    "docs/GAME_SPEC.md",
    '''4本の固定レーンを使い、初回はレーンチェンジと車体同士の衝突を省略する。\n各レーンの長さと曲率を個別に計算する。\nCPUも自車と同じ走行モデルを使い、隠れた速度補正や結果の事前決定を入れない。\n難易度はCPUの公開された装着構成で調整する。\n\n内外レーンの長さによる有利不利をゼロと称しない。\n初回の通常レースはレーンを表示し、固定seedから割当を決定する。\n比較用タイムアタックは全構成を同じ基準レーンで測る。''',
    '''4本のレーンを使い、全3コースにレーンチェンジャーを設ける。車体同士の衝突は省略する。\n各レーンの長さと曲率を個別に計算し、通常レース・タイムアタックとも4周で全4レーンを1回ずつ走行する。周回終盤のレーンチェンジャーで次レーンへ移り、4周終了時に全車が同じレーン集合を一巡する。\nCPUも自車と同じ走行モデルを使い、隠れた速度補正や結果の事前決定を入れない。\n難易度はCPUの公開された装着構成で調整する。\n\n内外レーンの長さによる有利不利は、4周で各レーンを一巡させることで総走行条件を均す。開始レーンは固定seedから割り当てる。\nタイムアタックも同じ4レーン1巡を用い、通常レースと比較可能なコース条件にする。''',
)
patch("docs/GAME_SPEC.md", '3周完了時はゴール通過時刻を補間して記録する。', '4周完了時はゴール通過時刻を補間して記録する。')
patch("docs/GAME_SPEC.md", 'レース上限は180秒とし、未完走車をDNFにして結果へ進む。', 'レース上限は240秒とし、未完走車をDNFにして結果へ進む。')
patch(
    "docs/ARCHITECTURE.md",
    '- `src/game/simulation/engine.ts`: DOM-free common player/CPU integrator and race state machine. No player-specific speed multiplier. Seed rotates lane assignments and chooses visible standard CPU configurations. Time attack uses lane 2 for all builds.',
    '- `src/game/simulation/engine.ts`: DOM-free common player/CPU integrator and race state machine. No player-specific speed multiplier. Seed rotates starting-lane assignments and chooses visible standard CPU configurations; every lap advances to the next lane, so four laps traverse all four lanes once in both race and time-attack modes.',
)
patch(
    "docs/ARCHITECTURE.md",
    'Fixed step 1/120 s; max 30 substeps. Frames longer than 0.25 s request a pause, rather than silently skipping race time. Render position is interpolated between states. Three laps; crossing times linearly interpolated within the fixed step. Finished records freeze. Rank uses lap plus shared course parameter (checkpoint progression), never raw lane distance. Equal finish times share rank; ID stabilizes row ordering only.',
    'Fixed step 1/120 s; max 30 substeps. Frames longer than 0.25 s request a pause, rather than silently skipping race time. Render position is interpolated between states. Four laps; the final 12% of each lap smoothly blends onto the next lane and crossing times are linearly interpolated within the fixed step. Arc coordinates are remapped at the timing line to the new lane length so no false lap or render jump is introduced. Finished records freeze. Rank uses lap plus shared course parameter (checkpoint progression), never raw lane distance. Equal finish times share rank; ID stabilizes row ordering only.',
)
patch(
    "docs/ARCHITECTURE.md",
    'Recovery lasts 2 simulation seconds, race time continues, third out is DNF, and 180 s is an absolute race timeout.',
    'Recovery lasts 2 simulation seconds, race time continues, third out is DNF, and 240 s is an absolute race timeout.',
)

print("lane-cycle patch applied")
