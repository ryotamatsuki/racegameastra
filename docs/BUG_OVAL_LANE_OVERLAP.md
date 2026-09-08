# OVAL lane overlap investigation

User report: separate lanes visually overlap at the start/finish, cars stop there, and results report a finish (seed 731, iPhone screenshot).

## Root cause and scope

OVAL previously used x=6*cos(a) for every lane and changed only the z radius. At a=0 and a=pi, every lane therefore had exactly the same position. This affects every machine and part configuration on OVAL. The same coordinates build both road meshes and rendered vehicle poses. TECHNICAL RIDGE and SKY LOOP use separate stadium lanes and do not have this endpoint collapse.

Cars legitimately freeze after completing three laps. On the broken OVAL, the later finishers froze on top of the earlier finishers. This is not evidence of a stopped car receiving a timed, predetermined finish: stationary zero-torque cars on all three courses remain at lap zero until DNF. The finish condition remains distance crossing three full lane lengths. A separate all-course render issue left previousS at the last pre-finish step; it now freezes together with s so interpolation cannot jitter a finished car.

## Fix

Offset the entire OVAL centerline along the ellipse's unit outward normal, at 0.16 m lane spacing. Physics, lane lengths, road meshes, cameras and render positions all consume the corrected shared track. No CPU compensation or preassigned results were introduced. OVAL best-time keys now use a lanes-v2 suffix so old geometry records are retained but not compared with the corrected course. Garage saves and other course records remain available.

## Verification

- 23/23 local model, geometry and storage tests pass; TypeScript/build pass.
- Every sampled frame of all three courses maintains adjacent lane center separation of at least 0.1599 m, including the closing frame.
- Zero-drive cars on all three courses receive no lap, finish time or finish status; they DNF.
- All four standard machine races on each of the three courses: every reported finish requires at least three lane lengths, three lap records and frozen render interpolation.
- Existing all-four-machines/all-four-seeded-lanes OVAL completion and two-course setup-tradeoff tests continue to pass.
- Focused public-browser regression added with start/finish screenshots and explicit software-render pause reporting. Its outcome must be recorded after execution; DOM assertions alone do not establish the visual fix.
- User iPhone screenshots are the original visual evidence. No claim of retesting that physical phone is made.
