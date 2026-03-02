import * as THREE from 'three';
import { scene } from './scene.js';
import { pathData, lastRebuildCarPos } from './road.js';

// ─── Car model ───────────────────────────────────────────────────────────────
function createCar() {
  const group = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x0044ff });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x0a0015 });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const rimMat   = new THREE.MeshBasicMaterial({ color: 0x00ffe1 });

  // Lower body
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 4.4), bodyMat);
  base.position.y = 0.51;
  base.castShadow = true;
  group.add(base);

  // Mid body
  const mid = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 4.0), bodyMat);
  mid.position.y = 0.80;
  group.add(mid);

  // Front hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 1.2), bodyMat);
  hood.position.set(0, 1.02, -1.4);
  group.add(hood);

  // Rear trunk
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.8), bodyMat);
  trunk.position.set(0, 1.02, 1.5);
  group.add(trunk);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.46, 1.8), bodyMat);
  cabin.position.set(0, 1.30, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 1.85), bodyMat);
  sill.position.set(0, 1.005, -0.05);
  group.add(sill);

  const rearFill = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.35), bodyMat);
  rearFill.position.set(0, 1.005, 0.95);
  group.add(rearFill);

  // Windows
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x050510, transparent: true, opacity: 0.85 });

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.38), glassMat);
  windshield.position.set(0, 1.30, -0.1 - 0.91);
  windshield.rotation.y = Math.PI;
  group.add(windshield);

  const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.38), glassMat);
  rearWindow.position.set(0, 1.30, -0.1 + 0.91);
  group.add(rearWindow);

  for (const [x, ry] of [[-0.81, -Math.PI / 2], [0.81, Math.PI / 2]]) {
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.36), glassMat);
    sideWin.position.set(x, 1.30, -0.1);
    sideWin.rotation.y = ry;
    group.add(sideWin);
  }

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16);
  const rimGeo   = new THREE.CylinderGeometry(0.21, 0.21, 0.08, 16);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.36, z);
    group.add(wheel);
  }

  // Tail lights
  const tailLights = [];
  for (const x of [-0.72, 0.72]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.14, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xff2200 })
    );
    tail.position.set(x, 0.74, 2.22);
    group.add(tail);
    tailLights.push(tail);
  }
  const tailGlow = new THREE.PointLight(0xff2200, 4, 7);
  tailGlow.position.set(0, 0.74, 2.5);
  group.add(tailGlow);
  group.userData.tailLights = tailLights;
  group.userData.tailGlow   = tailGlow;

  // Reverse lights
  const reverseLights = [];
  for (const x of [-0.28, 0.28]) {
    const rev = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.07),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    rev.position.set(x, 0.74, 2.23);
    group.add(rev);
    reverseLights.push(rev);
  }
  const reverseGlow = new THREE.PointLight(0xffffff, 0, 10);
  reverseGlow.position.set(0, 0.74, 2.7);
  group.add(reverseGlow);
  group.userData.reverseLights = reverseLights;
  group.userData.reverseGlow   = reverseGlow;

  // Headlight meshes
  for (const x of [-0.68, 0.68]) {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.12, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    hl.position.set(x, 0.74, -2.22);
    group.add(hl);
  }

  // Interior
  const dashMat  = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const neonMat  = new THREE.MeshBasicMaterial({ color: 0x00aaff });
  const neonRedM = new THREE.MeshBasicMaterial({ color: 0xff2d78 });

  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.32), dashMat);
  dash.position.set(0, 1.12, -0.82);
  group.add(dash);

  const dashTrim = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.02, 0.02), neonMat);
  dashTrim.position.set(0, 1.22, -0.97);
  group.add(dashTrim);

  for (const [xo, mat] of [[-0.3, neonMat], [0.3, neonRedM]]) {
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.10), mat);
    display.position.set(xo, 1.16, -0.97);
    display.rotation.y = Math.PI;
    group.add(display);
  }

  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), dashMat);
  col.rotation.x = Math.PI / 18;
  col.position.set(-0.22, 1.00, -0.62);
  group.add(col);

  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), dashMat);
  wheelRing.position.set(-0.22, 1.13, -0.66);
  wheelRing.rotation.x = Math.PI / 18;
  group.add(wheelRing);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), dashMat);
  hub.rotation.x = Math.PI / 2;
  wheelRing.add(hub);
  for (const angle of [Math.PI / 2, -Math.PI / 2 + 0.6, -Math.PI / 2 - 0.6]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.15, 0.018), dashMat);
    spoke.position.set(Math.cos(angle) * 0.085, Math.sin(angle) * 0.085, 0);
    spoke.rotation.z = angle + Math.PI / 2;
    wheelRing.add(spoke);
  }

  group.userData.steeringWheel = wheelRing;

  return group;
}

export const car = createCar();
scene.add(car);

// ─── Headlights ──────────────────────────────────────────────────────────────
export const headlights = [];
for (const x of [-0.6, 0.6]) {
  const light = new THREE.PointLight(0xffffff, 40, 50);
  scene.add(light);
  headlights.push(light);
}

// ─── Car state + physics ─────────────────────────────────────────────────────
export const carState = {
  speed:   0,
  angle:   0,
  steer:   0,
  gear:    'D',
};

export const CAR_START_IDX = 30;
car.position.copy(pathData[CAR_START_IDX].pos);
carState.angle = pathData[CAR_START_IDX].angle;
car.rotation.y = -carState.angle;
lastRebuildCarPos.copy(pathData[CAR_START_IDX].pos);

export const CAR = {
  maxSpeed:     1.155,
  acceleration: 0.004538,
  brakeForce:   0.011344,
  friction:     0.000378,
  turnSpeed:    0.018,
};
