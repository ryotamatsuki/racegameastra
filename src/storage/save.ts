import { validSetup, type Setup } from "../data/catalog";
export type Settings = {
  quality: "low" | "medium" | "high";
  volume: number;
  muted: boolean;
  reduced: boolean;
};
export type Save = {
  version: 1;
  slots: ({ machine: number; setup: Setup } | null)[];
  settings: Settings;
  bests: Record<string, number>;
};
export const defaults = (): Save => ({
  version: 1,
  slots: [null, null, null],
  settings: { quality: "medium", volume: 0.2, muted: true, reduced: false },
  bests: {},
});
export let storageWarning = "";
export function load(): Save {
  try {
    const raw = localStorage.getItem("astra-workshop-v1");
    if (!raw) return defaults();
    const v = JSON.parse(raw);
    if (v.version !== 1 || !Array.isArray(v.slots))
      throw Error("保存形式が不正");
    const d = defaults();
    d.slots = [0, 1, 2].map((i) => {
      const a = v.slots[i];
      if (a === null || a === undefined) return null;
      if (
        !Number.isInteger(a.machine) ||
        a.machine < 0 ||
        a.machine > 3 ||
        !validSetup(a.setup)
      )
        throw Error("保存内の部品IDが不正");
      return a;
    });
    if (
      v.settings &&
      ["low", "medium", "high"].includes(v.settings.quality) &&
      typeof v.settings.muted === "boolean" &&
      typeof v.settings.reduced === "boolean" &&
      Number.isFinite(v.settings.volume)
    ) {
      d.settings = {
        ...v.settings,
        volume: Math.max(0, Math.min(1, v.settings.volume)),
      };
    }
    if (v.bests && typeof v.bests === "object")
      for (const [k, val] of Object.entries(v.bests))
        if (typeof val === "number" && Number.isFinite(val) && val > 0)
          d.bests[k] = val;
    return d;
  } catch {
    storageWarning = "保存データを読めません。標準構成で続行します。";
    return defaults();
  }
}
export function persist(v: Save) {
  try {
    localStorage.setItem("astra-workshop-v1", JSON.stringify(v));
    return true;
  } catch {
    storageWarning = "端末保存不可：この画面内でプレイを続行できます。";
    return false;
  }
}
