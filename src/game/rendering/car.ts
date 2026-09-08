import * as T from "three";
import {
  derive,
  machines,
  parts,
  type Setup,
  type Category,
} from "../../data/catalog";
export type CarModel = {
  root: T.Group;
  groups: Record<Category, T.Group>;
  wheels: T.Group[];
  explode: (amount: number) => void;
  highlight: (c: Category | null) => void;
};
export function material(
  color: T.ColorRepresentation,
  metalness = 0,
  roughness = 0.45,
) {
  return new T.MeshStandardMaterial({ color, metalness, roughness });
}
export function mesh(
  g: T.BufferGeometry,
  m: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const o = new T.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
export function buildCar(index: number, setup: Setup, lite = false): CarModel {
  const root = new T.Group(),
    groups = {} as Record<Category, T.Group>,
    wheels: T.Group[] = [];
  for (const c of Object.keys(setup) as Category[]) {
    groups[c] = new T.Group();
    groups[c].name = c;
    root.add(groups[c]);
  }
  const s = derive(setup),
    color = machines[index].color,
    paint = material(color, 0.42, 0.28),
    dark = material(0x20282b, 0.15, 0.42),
    rubber = material(0x171b1c, 0, 0.88),
    silver = material(0xb6c6ca, 0.85, 0.23),
    gold = material(0xe8b759, 0.75, 0.32),
    glass = material(0x142d3f, 0.68, 0.15),
    white = material(0xeceee6, 0.2, 0.36);
  const detail = lite ? 12 : 24;
  const box = (
    parent: T.Object3D,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => mesh(new T.BoxGeometry(w, h, d), m, parent, x, y, z);
  const cyl = (
    parent: T.Object3D,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
  ) => mesh(new T.CylinderGeometry(r, r, h, detail), m, parent, x, y, z);
  // A loft of elliptical cross sections gives each shell a genuinely distinct, curved silhouette.
  const profiles = [
    [
      [0.073, 0.006, 0.011],
      [0.044, 0.029, 0.016],
      [0.009, 0.025, 0.033],
      [-0.034, 0.038, 0.023],
      [-0.068, 0.044, 0.009],
    ],
    [
      [0.065, 0.02, 0.016],
      [0.036, 0.033, 0.032],
      [-0.004, 0.034, 0.044],
      [-0.042, 0.03, 0.037],
      [-0.062, 0.022, 0.014],
    ],
    [
      [0.078, 0.005, 0.01],
      [0.04, 0.017, 0.019],
      [0, 0.022, 0.036],
      [-0.04, 0.018, 0.025],
      [-0.075, 0.012, 0.01],
    ],
    [
      [0.074, 0.003, 0.012],
      [0.041, 0.028, 0.027],
      [0, 0.035, 0.035],
      [-0.04, 0.029, 0.029],
      [-0.076, 0.008, 0.012],
    ],
  ][index];
  const bodyVariant = parts.body.findIndex((p) => p.id === setup.body),
    widthScale = bodyVariant === 0 ? 0.88 : bodyVariant === 2 ? 1.1 : 1;
  const vertices: number[] = [],
    indices: number[] = [];
  const rings = lite ? 12 : 24;
  for (const [x, w, h] of profiles)
    for (let j = 0; j < rings; j++) {
      const a = (j / rings) * 2 * Math.PI;
      vertices.push(
        x,
        0.016 + Math.sin(a) * h * 0.55 + h * 0.4,
        Math.cos(a) * w * widthScale,
      );
    }
  for (let i = 0; i < profiles.length - 1; i++)
    for (let j = 0; j < rings; j++) {
      const a = i * rings + j,
        b = i * rings + ((j + 1) % rings),
        c = b + rings,
        d = a + rings;
      indices.push(a, b, d, b, c, d);
    }
  for (const end of [0, profiles.length - 1])
    for (let j = 1; j < rings - 1; j++)
      indices.push(end * rings, end * rings + j, end * rings + j + 1);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  mesh(geo, paint, groups.body);
  const canopy = mesh(
    new T.SphereGeometry(1, detail, 12),
    glass,
    groups.body,
    index === 1 ? -0.006 : 0.001,
    0.046,
    0,
  );
  canopy.scale.set(
    index === 1 ? 0.023 : 0.028,
    index === 2 ? 0.013 : 0.014,
    index === 2 ? 0.014 : 0.02,
  );
  // Contrasting inset racing stripes follow the tapered nose, plus vents and a numbered badge.
  const stripe = new T.Shape();
  stripe.moveTo(0.066, -0.003);
  stripe.lineTo(0.066, 0.003);
  stripe.lineTo(-0.058, 0.006);
  stripe.lineTo(-0.058, -0.006);
  stripe.closePath();
  const strip = mesh(
    new T.ShapeGeometry(stripe),
    white,
    groups.body,
    0,
    0.039,
    0,
  );
  strip.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const vent = box(
        groups.body,
        dark,
        -0.027 - i * 0.008,
        0.039,
        side * 0.021,
        0.004,
        0.002,
        0.016,
      );
      vent.rotation.y = side * 0.25;
    }
    const sill = box(
      groups.body,
      paint,
      0,
      0.018,
      side * (index === 2 ? 0.022 : 0.034),
      0.09,
      0.006,
      0.008,
    );
    sill.rotation.y = side * 0.1;
  }
  const chassisColor =
    setup.chassis === "chassis-light"
      ? 0x333b3c
      : setup.chassis === "chassis-low"
        ? 0x495f62
        : 0x777c83;
  const shape = new T.Shape();
  shape.moveTo(-0.078, -0.027);
  shape.lineTo(-0.07, -0.039);
  shape.lineTo(0.06, -0.033);
  shape.lineTo(0.078, -0.019);
  shape.lineTo(0.078, 0.019);
  shape.lineTo(0.06, 0.033);
  shape.lineTo(-0.07, 0.039);
  shape.lineTo(-0.078, 0.027);
  shape.closePath();
  const ch = mesh(
    new T.ExtrudeGeometry(shape, {
      depth: 0.004,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.0015,
      bevelSegments: 2,
      steps: 1,
    }),
    material(chassisColor, 0.35, 0.5),
    groups.chassis,
    0,
    0.005,
    0,
  );
  ch.rotation.x = -Math.PI / 2;
  for (const x of [-0.049, 0.049]) {
    const axle = cyl(groups.chassis, silver, x, 0.014, 0, 0.002, 0.095);
    axle.rotation.x = Math.PI / 2;
    for (const z of [-0.044, 0.044]) {
      const wh = new T.Group();
      wh.position.set(x, s.radius, z);
      groups.tire.add(wh);
      wheels.push(wh);
      const tyre = cyl(wh, rubber, 0, 0, 0, s.radius, 0.014);
      tyre.rotation.x = Math.PI / 2;
      for (const sign of [-1, 1]) {
        const rim = cyl(
          wh,
          silver,
          0,
          0,
          sign * 0.0073,
          s.radius * 0.72,
          0.0016,
        );
        rim.rotation.x = Math.PI / 2;
        const hub = cyl(wh, gold, 0, 0, sign * 0.0084, s.radius * 0.25, 0.002);
        hub.rotation.x = Math.PI / 2;
        if (!lite)
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * Math.PI * 2;
            const spoke = box(
              wh,
              dark,
              Math.cos(a) * s.radius * 0.42,
              Math.sin(a) * s.radius * 0.42,
              sign * 0.0083,
              s.radius * 0.45,
              0.002,
              0.001,
            );
            spoke.rotation.z = a;
          }
      }
      if (setup.tire === "tire-grip" && !lite)
        for (let j = 0; j < 16; j++) {
          const a = (j / 16) * 2 * Math.PI;
          const tread = box(
            wh,
            material(0x313537),
            Math.cos(a) * s.radius,
            Math.sin(a) * s.radius,
            0,
            0.0015,
            0.0015,
            0.012,
          );
          tread.rotation.z = a;
        }
    }
  }
  const rollerVariant = parts.roller.findIndex((p) => p.id === setup.roller);
  for (const x of [-0.083, 0.083]) {
    box(
      groups.roller,
      dark,
      x,
      0.014,
      0,
      0.014,
      0.004,
      0.126 + rollerVariant * 0.008,
    );
    for (const side of [-1, 1]) {
      const z = side * (0.054 + rollerVariant * 0.007);
      cyl(
        groups.roller,
        silver,
        x,
        0.023,
        z,
        0.007 + rollerVariant * 0.0015,
        0.006,
      );
      cyl(groups.roller, gold, x, 0.027, z, 0.002, 0.006);
      if (rollerVariant === 2)
        cyl(groups.roller, dark, x, 0.013, z, 0.009, 0.003);
    }
  }
  for (const z of [-0.015, 0.015]) {
    const b = cyl(
      groups.battery,
      setup.battery === "battery-power"
        ? gold
        : setup.battery === "battery-light"
          ? white
          : material(0x72b4a3, 0.3),
      -0.006,
      0.018,
      z,
      0.007,
      0.05,
    );
    b.rotation.z = Math.PI / 2;
    for (const x of [-0.032, 0.02]) {
      const terminal = cyl(groups.battery, silver, x, 0.018, z, 0.004, 0.002);
      terminal.rotation.z = Math.PI / 2;
    }
  }
  const motor = cyl(
    groups.motor,
    setup.motor === "motor-speed"
      ? material(0xdd594c, 0.6)
      : setup.motor === "motor-torque"
        ? gold
        : silver,
    -0.048,
    0.022,
    0,
    0.009,
    0.024,
  );
  motor.rotation.x = Math.PI / 2;
  box(groups.motor, dark, -0.048, 0.022, 0.015, 0.013, 0.013, 0.005);
  const gearVariant = parts.gear.findIndex((p) => p.id === setup.gear);
  for (let i = 0; i < 2; i++) {
    const r = 0.006 + i * 0.001 + gearVariant * 0.001;
    const gear = cyl(
      groups.gear,
      i ? gold : material(0xf0ede0),
      -0.04 + i * 0.017,
      0.018,
      0.025,
      r,
      0.004,
    );
    gear.rotation.x = Math.PI / 2;
    if (!lite)
      for (let j = 0; j < 12; j++) {
        const a = (j * Math.PI) / 6;
        const tooth = box(
          groups.gear,
          white,
          -0.04 + i * 0.017 + Math.cos(a) * r,
          0.018 + Math.sin(a) * r,
          0.025,
          0.003,
          0.003,
          0.004,
        );
        tooth.rotation.z = a;
      }
  }
  const wingVariant = parts.wing.findIndex((p) => p.id === setup.wing),
    span = 0.045 + wingVariant * 0.025;
  for (const z of [-span * 0.3, span * 0.3])
    box(groups.wing, dark, -0.061, 0.04, z, 0.006, 0.03, 0.004);
  const wing = box(groups.wing, paint, -0.065, 0.055, 0, 0.021, 0.003, span);
  wing.rotation.z = -0.12;
  for (const side of [-1, 1])
    box(
      groups.wing,
      paint,
      -0.065,
      0.06,
      side * span * 0.5,
      0.025,
      0.014,
      0.003,
    );
  const brakeVariant = parts.brake.findIndex((p) => p.id === setup.brake);
  box(
    groups.brake,
    material([0x93ae8a, 0xdaac69, 0xd16475][brakeVariant], 0, 0.9),
    -0.08,
    0.004,
    0,
    0.01 + brakeVariant * 0.004,
    0.003,
    0.04,
  );
  if (!lite)
    for (const x of [-0.066, 0.066])
      for (const z of [-0.025, 0.025]) {
        cyl(groups.chassis, silver, x, 0.011, z, 0.002, 0.002);
        box(groups.chassis, dark, x, 0.0122, z, 0.003, 0.0005, 0.0005);
      }
  const offsets: Record<Category, T.Vector3> = {
    body: new T.Vector3(0, 0.1, 0),
    chassis: new T.Vector3(0, 0, 0),
    motor: new T.Vector3(-0.045, 0.04, 0),
    gear: new T.Vector3(0.02, 0.065, 0.035),
    tire: new T.Vector3(0, 0.015, 0),
    roller: new T.Vector3(0, 0.035, -0.055),
    battery: new T.Vector3(0, 0.05, 0),
    wing: new T.Vector3(-0.045, 0.1, 0),
    brake: new T.Vector3(-0.025, -0.025, 0),
  };
  return {
    root,
    groups,
    wheels,
    explode(amount) {
      for (const c of Object.keys(groups) as Category[])
        groups[c].position.copy(offsets[c]).multiplyScalar(amount);
      for (const w of wheels)
        w.position.z = Math.sign(w.position.z) * (0.044 + 0.07 * amount);
    },
    highlight(c) {
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          const m = o.material as T.MeshStandardMaterial;
          if (m.emissive) m.emissive.setHex(0);
        }
      });
      if (c)
        groups[c].traverse((o) => {
          if (o instanceof T.Mesh) {
            const m = o.material as T.MeshStandardMaterial;
            m.emissive?.setHex(0x19302a);
          }
        });
    },
  };
}
export function disposeObject(root: T.Object3D) {
  const mats = new Set<T.Material>(),
    geos = new Set<T.BufferGeometry>();
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.LineSegments) {
      geos.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        mats.add(m);
    }
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  root.removeFromParent();
}
