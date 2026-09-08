export type V = { x: number; y: number; z: number };
export const add = (a: V, b: V): V => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
export const sub = (a: V, b: V): V => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const mul = (a: V, k: number): V => ({
  x: a.x * k,
  y: a.y * k,
  z: a.z * k,
});
export const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
export const length = (a: V) => Math.hypot(a.x, a.y, a.z);
export const norm = (a: V) => mul(a, 1 / (length(a) || 1));
export const cross = (a: V, b: V): V => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export type Frame = {
  p: V;
  t: V;
  n: V;
  side: V;
  k: V;
  curvature: number;
  bank: number;
  u: number;
  s: number;
  zone: string;
  gap: boolean;
  brake: boolean;
  loop: boolean;
};
export type Track = {
  id: number;
  name: string;
  description: string;
  lanes: Frame[][];
  lengths: number[];
  jump: { start: number; end: number } | null;
};
export const trackNames = ["WORKSHOP OVAL", "TECHNICAL RIDGE", "SKY LOOP"];
const N = 2400;
// Smooth closed centerline; loop is an explicit vertical circle inserted into the north straight.
function raw(
  id: number,
  u: number,
  lane: number,
): { p: V; n: V; bank: number } {
  const a = 2 * Math.PI * u,
    r = 3.3 + (lane - 1.5) * 0.16;
  let x = 6 * Math.cos(a),
    z = r * Math.sin(a),
    y = 0.42,
    bank = 0;
  if (id === 0) y += 0.14 * Math.pow(Math.sin(a), 4);
  if (id === 1) {
    const R = 1.5 + (lane - 1.5) * 0.16;
    if (u < 0.25) {
      x = -5 + 40 * u;
      z = -R;
      y = 0.5;
    } else if (u < 0.5) {
      const q = (u - 0.25) * 4,
        ang = -Math.PI / 2 + Math.PI * q;
      x = 5 + R * Math.cos(ang);
      z = R * Math.sin(ang);
      y = 0.5;
      bank = 0.22 * Math.sin(Math.PI * q);
    } else if (u < 0.75) {
      const q = (u - 0.5) * 4;
      x = 5 - 10 * q;
      z = R + 0.55 * Math.pow(Math.sin(2 * Math.PI * q), 3);
      y = 0.5 + 0.6 * Math.pow(Math.sin(Math.PI * q), 2);
      bank = 0.18 * Math.sin(4 * Math.PI * q);
    } else {
      const q = (u - 0.75) * 4,
        ang = Math.PI / 2 + Math.PI * q;
      x = -5 + R * Math.cos(ang);
      z = R * Math.sin(ang);
      y = 0.5;
      bank = 0.22 * Math.sin(Math.PI * q);
    }
  }
  if (id === 2) {
    // Piecewise closed stadium, one loop has a slight forward drift to separate entrance/exit.
    const R = 2.8 + (lane - 1.5) * 0.16,
      loopR = 1.03;
    if (u < 0.25) {
      const q = u / 0.25;
      x = -5 + 10 * q;
      z = -R;
      y = 0.5;
    } else if (u < 0.45) {
      const q = (u - 0.25) / 0.2,
        ang = -Math.PI / 2 + Math.PI * q;
      x = 5 + R * Math.cos(ang);
      z = R * Math.sin(ang);
      y = 0.5;
    } else if (u < 0.55) {
      const q = (u - 0.45) / 0.1;
      x = 5 - 4 * q;
      z = R;
      y = 0.5;
    } else if (u < 0.75) {
      const q = (u - 0.55) / 0.2,
        ang = 2 * Math.PI * q;
      x = 1 - loopR * Math.sin(ang) - 0.45 * q;
      z = R;
      y = 0.5 + loopR * (1 - Math.cos(ang));
      return {
        p: { x, y, z },
        n: norm({ x: Math.sin(ang), y: Math.cos(ang), z: 0 }),
        bank: 0,
      };
    } else if (u < 0.85) {
      const q = (u - 0.75) / 0.1;
      x = 0.55 - 5.55 * q;
      z = R;
      y = 0.5;
    } else {
      const q = (u - 0.85) / 0.15,
        ang = Math.PI / 2 + Math.PI * q;
      x = -5 + R * Math.cos(ang);
      z = R * Math.sin(ang);
      y = 0.5;
    }
    // Elevated bridge is the loop itself crossing its own entrance, supports are rendered beneath.
  }
  // localized ramp ending at jump start; landing resumes lower on same lane.
  if (id > 0) {
    const start = 0.12,
      end = start + 0.015;
    if (u > start - 0.03 && u < start) y += (0.1 * (u - (start - 0.03))) / 0.03;
    if (u >= start && u < end) y += 0.1 * (1 - (u - start) / 0.015);
  }
  return { p: { x, y, z }, n: { x: 0, y: 1, z: 0 }, bank };
}
export function makeTrack(id: number): Track {
  const lanes: Frame[][] = [],
    lengths: number[] = [];
  for (let lane = 0; lane < 4; lane++) {
    const f: Frame[] = [];
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N,
        cur = raw(id, u % 1, lane),
        prev = raw(id, (u - 1 / N + 1) % 1, lane),
        next = raw(id, (u + 1 / N) % 1, lane);
      const t = norm(sub(next.p, prev.p));
      let side = norm(cross(t, cur.n)),
        n = norm(cross(side, t));
      if (cur.bank) {
        n = add(mul(n, Math.cos(cur.bank)), mul(side, Math.sin(cur.bank)));
        side = norm(cross(t, n));
      }
      if (i) s += length(sub(cur.p, f[i - 1].p));
      const start = 0.12;
      f.push({
        p: cur.p,
        t,
        n,
        side,
        k: { x: 0, y: 0, z: 0 },
        curvature: 0,
        bank: cur.bank,
        u,
        s,
        zone:
          id === 2 && u >= 0.55 && u <= 0.75
            ? "垂直ループ"
            : id > 0 && u > start - 0.03 && u < start + 0.015
              ? "ジャンプ"
              : Math.abs(t.y) > 0.12
                ? "スロープ"
                : Math.abs(t.x) > 0.8
                  ? "ストレート"
                  : "コーナー",
        gap: id > 0 && u >= start && u < start + 0.015,
        brake: id > 0 && u > start - 0.04 && u < start,
        loop: id === 2 && u >= 0.55 && u <= 0.75,
      });
    }
    for (let i = 0; i < N; i++) {
      const a = f[(i - 1 + N) % N],
        b = f[(i + 1) % N];
      const ds = length(sub(f[i].p, a.p)) + length(sub(b.p, f[i].p));
      f[i].k = mul(sub(b.t, a.t), 1 / ds);
      f[i].curvature = length(f[i].k);
    }
    f[N] = { ...f[0], u: 1, s };
    lanes.push(f);
    lengths.push(s);
  }
  return {
    id,
    name: trackNames[id],
    description: [
      "直線と緩い坂。最高速と加速の基準コース。",
      "連続カーブ、バンク、登坂とジャンプ。",
      "垂直ループと立体交差。進入速度を見極めよう。",
    ][id],
    lanes,
    lengths,
    jump: id === 0 ? null : { start: 0.12, end: 0.135 },
  };
}
export const tracks = [0, 1, 2].map(makeTrack);
export function sample(track: Track, lane: number, s: number): Frame {
  const len = track.lengths[lane];
  s = ((s % len) + len) % len;
  const arr = track.lanes[lane];
  let lo = 0,
    hi = arr.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = arr[lo],
    b = arr[hi],
    q = (s - a.s) / (b.s - a.s || 1);
  const mix = (a: V, b: V) => add(mul(a, 1 - q), mul(b, q));
  return {
    ...a,
    s,
    u: a.u + (b.u - a.u) * q,
    p: mix(a.p, b.p),
    t: norm(mix(a.t, b.t)),
    n: norm(mix(a.n, b.n)),
    side: norm(mix(a.side, b.side)),
    k: mix(a.k, b.k),
  };
}
export function atU(track: Track, lane: number, u: number) {
  const f = track.lanes[lane];
  return f[Math.min(N, Math.max(0, Math.round(u * N)))];
}
