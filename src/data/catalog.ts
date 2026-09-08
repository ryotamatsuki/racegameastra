export const categories = [
  "body",
  "chassis",
  "motor",
  "gear",
  "tire",
  "roller",
  "battery",
  "wing",
  "brake",
] as const;
export type Category = (typeof categories)[number];
export type Setup = Record<Category, string>;
export const labels: Record<Category, string> = {
  body: "ボディー",
  chassis: "シャーシ",
  motor: "モーター",
  gear: "ギヤ",
  tire: "タイヤ",
  roller: "ローラー",
  battery: "電池",
  wing: "ウイング",
  brake: "ブレーキ",
};
export type Stats = {
  mass: number;
  cg: number;
  drag: number;
  efficiency: number;
  rpm: number;
  torque: number;
  ratio: number;
  radius: number;
  grip: number;
  rolling: number;
  support: number;
  contact: number;
  voltage: number;
  capacity: number;
  stability: number;
  brake: number;
};
export type Part = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  model: string;
  mass: number;
  values: Partial<Stats>;
};
const p = (
  id: string,
  name: string,
  description: string,
  mass: number,
  values: Partial<Stats>,
): Part => ({
  id,
  name,
  description,
  mass,
  values,
  tags: ["micro-v1"],
  model: id,
});
export const parts: Record<Category, Part[]> = {
  body: [
    p(
      "body-light",
      "薄肉ライト",
      "軽快な加速。重心と空気抵抗は標準より大きい。",
      0.009,
      { cg: 0.002, drag: 0.0014 },
    ),
    p(
      "body-standard",
      "エアロシェル",
      "抵抗を抑えた流線形。軽量型より重い。",
      0.016,
      { cg: 0.001, drag: 0.00065 },
    ),
    p(
      "body-stable",
      "ワイドシェル",
      "低重心の安定型。重量と抵抗が増える。",
      0.024,
      { cg: -0.003, drag: 0.0011, stability: 0.15 },
    ),
  ],
  chassis: [
    p(
      "chassis-light",
      "軽量フレーム",
      "軽量化を優先。伝達効率は控えめ。",
      0.018,
      { cg: 0.002, efficiency: 0.83 },
    ),
    p(
      "chassis-rigid",
      "剛性フレーム",
      "駆動効率が高い。重いフレーム。",
      0.028,
      { cg: 0, efficiency: 0.94 },
    ),
    p(
      "chassis-low",
      "低重心フレーム",
      "電池を低く搭載。安定性と重量の交換。",
      0.032,
      { cg: -0.005, efficiency: 0.9, stability: 0.16 },
    ),
  ],
  motor: [
    p("motor-speed", "REV 28K", "高回転・低トルク。長い直線向け。", 0.017, {
      rpm: 28000,
      torque: 0.0017,
    }),
    p(
      "motor-torque",
      "PULL 19K",
      "低回転・高トルク。登坂と再加速向け。",
      0.019,
      { rpm: 19000, torque: 0.0032 },
    ),
    p("motor-balance", "DUAL 23K", "回転数とトルクを両立。", 0.018, {
      rpm: 23000,
      torque: 0.0023,
    }),
  ],
  gear: [
    p("gear-speed", "3.5 : 1", "高速寄り。発進と坂道では不利。", 0.003, {
      ratio: 3.5,
    }),
    p("gear-mid", "4.2 : 1", "速度と加速の中間。", 0.0035, { ratio: 4.2 }),
    p("gear-power", "5.0 : 1", "駆動力を増加。最高速度は低下。", 0.004, {
      ratio: 5,
    }),
  ],
  tire: [
    p("tire-small", "Ø24 ローハイト", "小径で軽快。荒れた着地に弱い。", 0.01, {
      radius: 0.012,
      grip: 0.85,
      rolling: 0.026,
    }),
    p("tire-large", "Ø30 スピード", "大径で高速向け。重心が上がる。", 0.015, {
      radius: 0.015,
      grip: 0.8,
      rolling: 0.023,
      cg: 0.003,
    }),
    p(
      "tire-grip",
      "Ø26 ソフトグリップ",
      "高摩擦でカーブに強い。転がり抵抗増。",
      0.016,
      { radius: 0.013, grip: 1.35, rolling: 0.05 },
    ),
  ],
  roller: [
    p("roller-fast", "ベアリング 13", "低接触抵抗。横支持は弱い。", 0.004, {
      support: 1.9,
      contact: 0.011,
    }),
    p("roller-standard", "アルミ 15", "抵抗と横支持の均衡。", 0.007, {
      support: 2.7,
      contact: 0.018,
    }),
    p("roller-stable", "ダブル 19", "広い支持幅。重さと接触抵抗増。", 0.012, {
      support: 4.2,
      contact: 0.032,
      stability: 0.14,
    }),
  ],
  battery: [
    p(
      "battery-light",
      "LIGHT 60",
      "軽い小容量。負荷時の電圧低下が早い。",
      0.022,
      { voltage: 2.65, capacity: 60 },
    ),
    p(
      "battery-capacity",
      "ENDURE 180",
      "重量と引き換えに電圧を長く維持。",
      0.039,
      { voltage: 2.8, capacity: 180 },
    ),
    p("battery-power", "PUNCH 90", "高出力。消費と重量に注意。", 0.033, {
      voltage: 3.1,
      capacity: 90,
    }),
  ],
  wing: [
    p(
      "wing-small",
      "ショートフィン",
      "軽量・低抵抗。着地安定補正は小さい。",
      0.002,
      { drag: 0.00005, stability: 0 },
    ),
    p("wing-standard", "エアロブリッジ", "抵抗と安定の中間。", 0.004, {
      drag: 0.00016,
      stability: 0.16,
    }),
    p(
      "wing-stable",
      "ワイドスタビライザー",
      "空中姿勢を安定。重さと抵抗増。",
      0.007,
      { drag: 0.00038, stability: 0.38 },
    ),
  ],
  brake: [
    p(
      "brake-weak",
      "ソフト 0.15N",
      "速度を残す。高速ジャンプでは危険。",
      0.001,
      { brake: 0.15 },
    ),
    p("brake-mid", "ミディアム 0.35N", "離陸前の速度を穏やかに調整。", 0.002, {
      brake: 0.35,
    }),
    p(
      "brake-strong",
      "ハード 0.65N",
      "着地を安定させる。区間時間は増加。",
      0.003,
      { brake: 0.65 },
    ),
  ],
};
export const machines = [
  {
    id: "falcon",
    name: "AERO FALCON",
    ja: "直線を切り裂く低いノーズ",
    color: 0xeebc45,
    defaults: [1, 0, 0, 0, 1, 0, 2, 0, 1],
  },
  {
    id: "bison",
    name: "TORQUE BISON",
    ja: "力強い中央部とショートテール",
    color: 0xe76b4a,
    defaults: [0, 1, 1, 2, 0, 1, 1, 1, 1],
  },
  {
    id: "lynx",
    name: "CORNER LYNX",
    ja: "細身のシェルとワイドローラー",
    color: 0x65c8ba,
    defaults: [0, 2, 2, 1, 2, 2, 0, 1, 2],
  },
  {
    id: "orca",
    name: "BALANCE ORCA",
    ja: "滑らかな曲面で安定を追求",
    color: 0x8ca8ed,
    defaults: [2, 2, 2, 1, 2, 1, 1, 2, 1],
  },
];
export function standard(index: number): Setup {
  return Object.fromEntries(
    categories.map((c, i) => [c, parts[c][machines[index].defaults[i]].id]),
  ) as Setup;
}
export function validSetup(v: unknown): v is Setup {
  return (
    !!v &&
    typeof v === "object" &&
    categories.every((c) =>
      parts[c].some(
        (p) => p.id === (v as Setup)[c] && p.tags.includes("micro-v1"),
      ),
    )
  );
}
export function derive(setup: Setup): Stats {
  const s: Stats = {
    mass: 0.014,
    cg: 0.022,
    drag: 0.00015,
    efficiency: 1,
    rpm: 0,
    torque: 0,
    ratio: 0,
    radius: 0,
    grip: 0,
    rolling: 0,
    support: 0,
    contact: 0,
    voltage: 0,
    capacity: 0,
    stability: 0.8,
    brake: 0,
  };
  for (const c of categories) {
    const a = parts[c].find((p) => p.id === setup[c]);
    if (!a) throw Error("不明な部品 " + setup[c]);
    s.mass += a.mass;
    for (const [k, v] of Object.entries(a.values)) {
      if (["cg", "drag", "stability"].includes(k)) s[k as keyof Stats] += v;
      else s[k as keyof Stats] = v;
    }
  }
  return s;
}
export function metrics(s: Stats) {
  return {
    速度:
      (((((s.rpm / 60) * 2 * Math.PI * s.radius) / s.ratio) * s.voltage) /
        2.8) *
      3.6,
    加速: (s.torque * s.ratio * s.efficiency) / s.radius / s.mass,
    コーナー: s.grip * 9.81 + s.support / s.mass,
    安定性: s.stability / s.cg,
    持久力: s.capacity / ((s.torque * s.rpm) / 60),
    総重量: s.mass * 1000,
  };
}
