import { standard } from "../src/data/catalog";
import { runBench } from "../src/game/simulation/engine";
for (let course = 0; course < 3; course++)
  for (let m = 0; m < 4; m++) {
    const c = runBench(standard(m), course);
    console.log(
      JSON.stringify({
        course,
        m,
        state: c.state,
        time: c.finish,
        s: c.s,
        outs: c.outs,
        events: c.events.filter((e) => e.kind !== "corner").slice(0, 12),
      }),
    );
  }
