import * as T from "three";
import { sample } from "../simulation/track";
import type { Race } from "../simulation/engine";
export type CameraRig = {
  camera: T.PerspectiveCamera;
  cameraMode: number;
  reduced: boolean;
  cameraInit: boolean;
};
export function updateCamera(rig: CameraRig, r: Race, dt: number) {
  const c = r.cars[0],
    f = sample(r.track, c.lane, c.s),
    p = new T.Vector3(c.p.x, c.p.y, c.p.z),
    t = new T.Vector3(f.t.x, f.t.y, f.t.z),
    up = new T.Vector3(0, 1, 0);
  const mode =
    rig.cameraMode === 4
      ? rig.reduced
        ? 3
        : Math.floor(r.time / 7) % 4
      : rig.cameraMode;
  let target = p.clone(),
    eye = p.clone();
  if (mode === 0) {
    eye.addScaledVector(t, -0.9).add(new T.Vector3(0, 0.55, 0));
    target.addScaledVector(t, 0.35);
  }
  if (mode === 1) {
    eye.add(new T.Vector3(f.n.x, f.n.y, f.n.z).multiplyScalar(0.065));
    target.addScaledVector(t, 0.8);
    up.set(f.n.x, f.n.y, f.n.z);
  }
  if (mode === 2) {
    eye.set(Math.round(p.x / 3) * 3 + 1.6, 2.8, Math.round(p.z / 3) * 3 + 2.4);
  }
  if (mode === 3) {
    eye.set(11, 14, 14);
    target.set(0, 0.5, 0);
  }
  const blend = rig.cameraInit || mode === 1 ? 1 : 1 - Math.exp(-dt * 5);
  rig.camera.position.lerp(eye, blend);
  rig.camera.up.lerp(up, blend).normalize();
  rig.camera.lookAt(target);
  rig.cameraInit = false;
}
