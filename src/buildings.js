import * as THREE from 'three';
import { scene } from './scene.js';
import { ROAD_WIDTH, pathData, growPath } from './road.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const darkColors = [0x1a0030, 0x0d001a, 0x100020];
const neonColors = [0xff2d78, 0x00ffe1, 0xbf00ff, 0xffe600];
export const BUILDING_SPACING = 6;
const NUM_BSTRIPS = 10;

// ─── Building strip creation ─────────────────────────────────────────────────
function createBuildingStrip() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const w = 4 + Math.random() * 6;
    const h = 10 + Math.random() * 28;
    const d = 4 + Math.random() * 6;
    const xOff = side * (ROAD_WIDTH / 2 + 20 + Math.random() * 6);

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: darkColors[Math.floor(Math.random() * 3)] })
    );
    building.position.set(xOff, h / 2, 0);
    group.add(building);

    const neonCol = neonColors[Math.floor(Math.random() * 4)];
    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, h, 0.15),
      new THREE.MeshBasicMaterial({ color: neonCol })
    );
    neonStrip.position.set(side < 0 ? w / 2 : -w / 2, 0, d / 2);
    building.add(neonStrip);

    for (let row = 0; row < Math.floor(h / 4); row++) {
      for (let col = 0; col < 2; col++) {
        const winColor = neonColors[Math.floor(Math.random() * 4)];
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.5),
          new THREE.MeshBasicMaterial({ color: winColor })
        );
        win.position.set((col - 0.5) * 2, -h / 2 + 2 + row * 3.5, d / 2 + 0.08);
        building.add(win);
        const winB = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.5),
          new THREE.MeshBasicMaterial({ color: neonColors[Math.floor(Math.random() * 4)] })
        );
        winB.position.set((col - 0.5) * 2, -h / 2 + 2 + row * 3.5, -(d / 2 + 0.08));
        winB.rotation.y = Math.PI;
        building.add(winB);
      }
    }
  }
  return group;
}

export function placeBuildingStrip(mesh, pd) {
  mesh.position.set(pd.pos.x, 0, pd.pos.z);
  mesh.rotation.y = -pd.angle;
}

// ─── Initialize building strips ──────────────────────────────────────────────
export const buildingStrips = [];
for (let i = 0; i < NUM_BSTRIPS; i++) {
  const pathIdx = i * BUILDING_SPACING + 1;
  if (pathIdx >= pathData.length) growPath(pathIdx + 2 - pathData.length);
  const mesh = createBuildingStrip();
  placeBuildingStrip(mesh, pathData[pathIdx]);
  scene.add(mesh);
  buildingStrips.push({ mesh, pathIdx });
}
