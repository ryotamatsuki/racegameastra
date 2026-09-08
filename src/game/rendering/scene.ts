import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildCar, disposeObject, material, mesh, type CarModel } from "./car";
import { sample, type Track } from "../simulation/track";
import { type Race } from "../simulation/engine";
import { updateCamera } from "../cameras/camera";
import { type Setup, type Category } from "../../data/catalog";
import { type Settings } from "../../storage/save";
export type Telemetry = {
  frames: number[];
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  renderer: string;
};
export class Scene {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(40, 1, 0.003, 180);
  controls: OrbitControls;
  content = new T.Group();
  garage: CarModel | null = null;
  raceModels: CarModel[] = [];
  mode: "garage" | "race" = "garage";
  exploded = 0;
  explodeTarget = 0;
  spin = false;
  cameraMode = 0;
  reduced = false;
  telemetry: Telemetry = {
    frames: [],
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    renderer: "",
  };
  resize: ResizeObserver;
  last = 0;
  cameraInit = true;
  environment: T.Texture;
  shadow: T.DirectionalLight;
  constructor(
    public host: HTMLElement,
    settings: Settings,
    onError: (s: string) => void,
  ) {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      antialias: settings.quality !== "low",
    });
    if (!gl)
      throw Error(
        "WebGL 2を利用できません。対応ブラウザまたはGPU設定を確認してください。",
      );
    this.renderer = new T.WebGLRenderer({
      canvas,
      context: gl,
      antialias: settings.quality !== "low",
    });
    this.renderer.setClearColor(0x101715);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    host.appendChild(canvas);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      onError("WebGLコンテキストが失われました。再読込して復帰してください。");
    });
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    this.telemetry.renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    this.scene.add(new T.HemisphereLight(0xd9efe8, 0x635044, 1.1));
    this.shadow = new T.DirectionalLight(0xffe6b4, 2.2);
    this.shadow.position.set(4, 7, 3);
    this.shadow.castShadow = true;
    Object.assign(this.shadow.shadow.camera, {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
      near: 0.1,
      far: 30,
    });
    this.shadow.shadow.bias = -0.0004;
    this.scene.add(this.shadow);
    const rim = new T.DirectionalLight(0xb4d5ff, 1.2);
    rim.position.set(-3, 4, -4);
    this.scene.add(rim);
    // Locally generated studio environment supplies broad PBR reflections without external assets.
    const envScene = new T.Scene();
    envScene.background = new T.Color(0x87988e);
    for (const [x, y, z] of [
      [0, 5, 0],
      [-4, 2, 1],
      [4, 1, -2],
    ]) {
      const panel = mesh(
        new T.PlaneGeometry(5, 3),
        new T.MeshBasicMaterial({ color: 0xfff4df, side: T.DoubleSide }),
        envScene,
        x,
        y,
        z,
      );
      panel.lookAt(0, 0, 0);
    }
    const pmrem = new T.PMREMGenerator(this.renderer);
    const target = pmrem.fromScene(envScene, 0.1);
    this.environment = target.texture;
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.7;
    pmrem.dispose();
    disposeObject(envScene);
    this.scene.add(this.content);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.22;
    this.controls.maxDistance = 1.2;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.resize = new ResizeObserver(() => {
      const w = host.clientWidth,
        h = host.clientHeight;
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    });
    this.resize.observe(host);
    this.quality(settings);
  }
  quality(settings: Settings) {
    this.reduced = settings.reduced;
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        { low: 1, medium: 1.5, high: 2 }[settings.quality],
      ),
    );
    this.renderer.shadowMap.enabled = settings.quality !== "low";
    const size = settings.quality === "high" ? 2048 : 1024;
    if (this.shadow.shadow.mapSize.x !== size) {
      this.shadow.shadow.mapSize.set(size, size);
      this.shadow.shadow.map?.dispose();
      this.shadow.shadow.map = null;
    }
    this.renderer.setSize(this.host.clientWidth, this.host.clientHeight, false);
  }
  clear() {
    disposeObject(this.content);
    this.content = new T.Group();
    this.scene.add(this.content);
    this.garage = null;
    this.raceModels = [];
  }
  showGarage(machine: number, setup: Setup) {
    this.clear();
    this.mode = "garage";
    this.scene.fog = null;
    this.scene.background = new T.Color(0x17201d);
    this.controls.enabled = true;
    this.controls.minDistance = 0.23;
    this.controls.maxDistance = 1;
    this.controls.target.set(0, 0.005, 0);
    this.camera.position.set(0.27, 0.27, 0.32);
    this.controls.update();
    this.shadow.position.set(0.5, 1, 0.4);
    Object.assign(this.shadow.shadow.camera, {
      left: -0.6,
      right: 0.6,
      top: 0.6,
      bottom: -0.6,
    });
    this.shadow.shadow.camera.updateProjectionMatrix();
    mesh(
      new T.BoxGeometry(1.8, 0.055, 1.25),
      material(0x775139, 0, 0.84),
      this.content,
      0,
      -0.045,
      0,
    );
    const mat = mesh(
      new T.BoxGeometry(0.57, 0.003, 0.4),
      material(0x245a4a, 0, 0.94),
      this.content,
      0,
      -0.014,
      0,
    );
    mat.receiveShadow = true;
    const pts: number[] = [];
    for (let x = -0.27; x <= 0.28; x += 0.02)
      pts.push(x, -0.012, -0.19, x, -0.012, 0.19);
    for (let z = -0.19; z <= 0.2; z += 0.02)
      pts.push(-0.27, -0.012, z, 0.27, -0.012, z);
    const grid = new T.LineSegments(
      new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(pts, 3),
      ),
      new T.LineBasicMaterial({
        color: 0x6e9d78,
        transparent: true,
        opacity: 0.35,
      }),
    );
    this.content.add(grid);
    // Subtle grain lines in the actual wooden work surface.
    const grain: number[] = [];
    for (let i = 0; i < 70; i++) {
      const z = -0.61 + i * 0.018;
      grain.push(-0.9, -0.016, z, 0.9, -0.016, z + 0.003 * Math.sin(i));
    }
    this.content.add(
      new T.LineSegments(
        new T.BufferGeometry().setAttribute(
          "position",
          new T.Float32BufferAttribute(grain, 3),
        ),
        new T.LineBasicMaterial({
          color: 0x513729,
          transparent: true,
          opacity: 0.3,
        }),
      ),
    );
    const tray = new T.Group();
    tray.position.set(0.37, -0.009, -0.04);
    this.content.add(tray);
    mesh(new T.BoxGeometry(0.15, 0.009, 0.24), material(0x343d3d, 0.5), tray);
    for (const x of [-0.073, 0.073])
      mesh(
        new T.BoxGeometry(0.004, 0.018, 0.24),
        material(0x727e7c, 0.6),
        tray,
        x,
        0.009,
        0,
      );
    for (const z of [-0.118, 0, 0.118])
      mesh(
        new T.BoxGeometry(0.15, 0.018, 0.004),
        material(0x727e7c, 0.6),
        tray,
        0,
        0.009,
        z,
      );
    for (let i = 0; i < 5; i++) {
      const a = mesh(
        new T.TorusGeometry(0.009, 0.003, 6, 16),
        material(0xa2a9a7, 0.8),
        tray,
        -0.045 + i * 0.022,
        0.008,
        -0.06,
      );
      a.rotation.x = Math.PI / 2;
    }
    const tool = new T.Group();
    tool.rotation.y = -0.25;
    tool.position.set(-0.34, 0.004, 0);
    this.content.add(tool);
    mesh(
      new T.CylinderGeometry(0.012, 0.015, 0.1, 16),
      material(0xc88736),
      tool,
      0,
      0.012,
      -0.055,
    ).rotation.x = Math.PI / 2;
    mesh(
      new T.CylinderGeometry(0.002, 0.002, 0.11, 8),
      material(0xc5cccf, 0.85),
      tool,
      0,
      0.012,
      0.05,
    ).rotation.x = Math.PI / 2;
    this.garage = buildCar(machine, setup);
    this.content.add(this.garage.root);
    this.exploded = 0;
    this.explodeTarget = 0;
  }
  updateCar(machine: number, setup: Setup) {
    if (this.garage) {
      disposeObject(this.garage.root);
    }
    this.garage = buildCar(machine, setup);
    this.content.add(this.garage.root);
    this.garage.explode(this.exploded);
  }
  focus(category: Category | null) {
    if (!this.garage) return;
    this.garage.highlight(category);
    const target = category
      ? this.garage.groups[category].position
          .clone()
          .add(new T.Vector3(0, 0.025, 0))
      : new T.Vector3(0, 0.005, 0);
    this.controls.target.copy(target);
    if (category) {
      const direction = this.camera.position.clone().sub(target).normalize();
      this.camera.position.copy(target).addScaledVector(direction, 0.24);
    } else this.camera.position.set(0.27, 0.27, 0.32);
    this.controls.update();
  }
  showRace(r: Race) {
    this.clear();
    this.mode = "race";
    this.cameraInit = true;
    this.controls.enabled = false;
    this.scene.background = new T.Color(0x142222);
    this.scene.fog = new T.Fog(0x142222, 22, 65);
    this.shadow.position.set(3, 10, 5);
    Object.assign(this.shadow.shadow.camera, {
      left: -12,
      right: 12,
      top: 12,
      bottom: -12,
    });
    this.shadow.shadow.camera.updateProjectionMatrix();
    mesh(
      new T.BoxGeometry(40, 0.15, 30),
      material(0x263935, 0, 0.86),
      this.content,
      0,
      -0.15,
      0,
    );
    this.buildTrack(r.track);
    for (const c of r.cars) {
      const car = buildCar(c.machine, c.setup, true);
      const tires = car.groups.tire;
      tires.removeFromParent();
      this.optimize(car.root);
      car.root.add(tires);
      for (const w of car.wheels) this.optimize(w);
      this.content.add(car.root);
      this.raceModels.push(car);
    }
  }
  optimize(root: T.Group) {
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();
    const by = new Map<T.Material, T.BufferGeometry[]>();
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        const m = o.material as T.Material;
        if (!by.has(m)) by.set(m, []);
        by.get(m)!.push(
          o.geometry
            .clone()
            .applyMatrix4(inverse.clone().multiply(o.matrixWorld)),
        );
      }
    });
    const merged = new T.Group();
    for (const [mat, gs] of by) {
      const g = mergeGeometries(gs, false);
      if (g) mesh(g, mat.clone(), merged);
      gs.forEach((g) => g.dispose());
    }
    const parent = root.parent;
    disposeObject(root);
    if (parent) parent.add(root);
    root.clear();
    root.add(merged);
  }
  buildTrack(track: Track) {
    const road = material(0xe3e4d7, 0, 0.67),
      walls = [0xdfb348, 0x9dafa5, 0xb9c4bb, 0x788f84].map((c) =>
        material(c, 0.15, 0.48),
      );
    for (let lane = 0; lane < 4; lane++) {
      const fs = track.lanes[lane];
      for (const type of ["road", "left", "right"] as const) {
        const v: number[] = [],
          idx: number[] = [];
        for (let i = 0; i < fs.length; i += 4) {
          const f = fs[i];
          let a: T.Vector3, b: T.Vector3;
          const pos = new T.Vector3(f.p.x, f.p.y, f.p.z),
            side = new T.Vector3(f.side.x, f.side.y, f.side.z),
            n = new T.Vector3(f.n.x, f.n.y, f.n.z);
          if (type === "road") {
            a = pos.clone().addScaledVector(side, -0.076);
            b = pos.clone().addScaledVector(side, 0.076);
          } else {
            a = pos
              .clone()
              .addScaledVector(side, type === "left" ? -0.078 : 0.078);
            b = a.clone().addScaledVector(n, 0.055);
          }
          v.push(a.x, a.y, a.z, b.x, b.y, b.z);
          const k = (i / 4) * 2;
          if (i > 0 && !f.gap && !fs[i - 4].gap)
            idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
        }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        const m = type === "road" ? road : walls[lane];
        m.side = T.DoubleSide;
        mesh(g, m, this.content);
      }
    }
    // Structural supports and clear start/finish markings.
    const support = material(0x526861, 0.55);
    for (let i = 0; i < track.lanes[0].length; i += 100) {
      const f = track.lanes[0][i];
      if (f.gap || (f.loop && f.n.y < 0.4)) continue;
      const height = Math.max(0.1, f.p.y - 0.06);
      mesh(
        new T.CylinderGeometry(0.035, 0.045, height, 8),
        support,
        this.content,
        f.p.x,
        height / 2,
        f.p.z,
      );
    }
    for (let lane = 0; lane < 4; lane++) {
      const f = track.lanes[lane][0];
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 4; col++) {
          const o = mesh(
            new T.PlaneGeometry(0.035, 0.035),
            material((row + col) % 2 ? 0x222c2b : 0xf5efdc),
            this.content,
          );
          const p = new T.Vector3(f.p.x, f.p.y + 0.002, f.p.z)
            .addScaledVector(
              new T.Vector3(f.side.x, f.side.y, f.side.z),
              (col - 1.5) * 0.035,
            )
            .addScaledVector(new T.Vector3(f.t.x, f.t.y, f.t.z), row * 0.035);
          o.position.copy(p);
          o.quaternion.setFromUnitVectors(
            new T.Vector3(0, 0, 1),
            new T.Vector3(f.n.x, f.n.y, f.n.z),
          );
        }
    }
  }
  draw(r: Race | null, dt: number, alpha: number) {
    this.exploded = this.reduced
      ? this.explodeTarget
      : T.MathUtils.damp(this.exploded, this.explodeTarget, 8, dt);
    if (this.mode === "garage") {
      this.garage?.explode(this.exploded);
      if (this.spin)
        this.garage?.wheels.forEach((w) => (w.rotation.z -= dt * 14));
      this.controls.update();
    } else if (r) {
      r.cars.forEach((c, i) => {
        const model = this.raceModels[i],
          f = sample(
            r.track,
            c.lane,
            c.previousS + (c.s - c.previousS) * alpha,
          );
        const p =
          c.state === "airborne"
            ? {
                x: c.previousP.x + (c.p.x - c.previousP.x) * alpha,
                y: c.previousP.y + (c.p.y - c.previousP.y) * alpha,
                z: c.previousP.z + (c.p.z - c.previousP.z) * alpha,
              }
            : f.p;
        model.root.position.set(p.x, p.y, p.z);
        const basis = new T.Matrix4().makeBasis(
          new T.Vector3(f.t.x, f.t.y, f.t.z),
          new T.Vector3(f.n.x, f.n.y, f.n.z),
          new T.Vector3(f.side.x, f.side.y, f.side.z),
        );
        model.root.quaternion.setFromRotationMatrix(basis);
        model.wheels.forEach((w) => (w.rotation.z = -c.wheel));
        model.root.visible =
          c.state !== "dnf" &&
          (c.state !== "recovering" || Math.floor(c.recover * 6) % 2 === 0);
      });
      updateCamera(this, r, dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.telemetry.calls = this.renderer.info.render.calls;
    this.telemetry.triangles = this.renderer.info.render.triangles;
    this.telemetry.geometries = this.renderer.info.memory.geometries;
    this.telemetry.textures = this.renderer.info.memory.textures;
    if (dt > 0 && this.telemetry.frames.length < 20000)
      this.telemetry.frames.push(dt * 1000);
  }

  dispose() {
    this.resize.disconnect();
    this.controls.dispose();
    this.clear();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
