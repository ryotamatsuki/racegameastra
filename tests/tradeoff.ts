import { standard } from "../src/data/catalog";
import { runBench } from "../src/game/simulation/engine";
const configs = [];
for (const motor of ["motor-speed", "motor-torque", "motor-balance"])
  for (const gear of ["gear-speed", "gear-mid", "gear-power"])
    for (const tire of ["tire-large", "tire-grip"])
      for (const roller of ["roller-fast", "roller-stable"]) {
        const s = { ...standard(0), motor, gear, tire, roller };
        configs.push({ s, t: [runBench(s, 0).finish, runBench(s, 1).finish] });
      }
let found = false;
for (const a of configs)
  for (const b of configs)
    if (
      !found &&
      a.t[0] &&
      a.t[1] &&
      b.t[0] &&
      b.t[1] &&
      a.t[0] < b.t[0] - 0.2 &&
      a.t[1] > b.t[1] + 0.2
    ) {
      console.log(JSON.stringify({ a, b }, null, 2));
      found = true;
    }
if (!found) console.log("NO REVERSAL");
