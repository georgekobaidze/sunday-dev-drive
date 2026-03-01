import * as THREE from 'three';
import { renderer, scene } from './scene.js';

// ─── Constants ───────────────────────────────────────────────────────────────
export const SEGMENT_LEN = 6;
export const ROAD_WIDTH  = 8;

// ─── Road texture ────────────────────────────────────────────────────────────
function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = '#00aaff';
  ctx.fillRect(0, 0, 5, 512);
  ctx.fillRect(251, 0, 5, 512);
  ctx.fillStyle = '#00ffe1';
  const dh = 40, gap = 100;
  for (let y = 0; y < 512; y += dh + gap) {
    ctx.fillRect(124, y + gap / 2, 8, dh);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const roadTex = createRoadTexture();
const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });

// ─── Path generator ──────────────────────────────────────────────────────────
export const pathData = []; // { pos: Vector3, angle: number }
const pathHead  = { pos: new THREE.Vector3(0, 0, 0), angle: 0 };
let   pathTurnRate      = 0;
let   pathTurnCountdown = 5;

export function growPath(count) {
  for (let i = 0; i < count; i++) {
    if (--pathTurnCountdown <= 0) {
      pathTurnRate      = (Math.random() - 0.5) * 0.042;
      pathTurnCountdown = 4 + Math.floor(Math.random() * 6);
    }
    pathHead.angle += pathTurnRate;
    pathData.push({ pos: pathHead.pos.clone(), angle: pathHead.angle });
    pathHead.pos = new THREE.Vector3(
      pathHead.pos.x + Math.sin(pathHead.angle) * SEGMENT_LEN,
      0,
      pathHead.pos.z - Math.cos(pathHead.angle) * SEGMENT_LEN
    );
  }
}

growPath(300);

// ─── Road ribbon ─────────────────────────────────────────────────────────────
export const RIBBON_WINDOW = 200;
export let ribbonStartIdx = 0;
export const lastRebuildCarPos = new THREE.Vector3();

export function setRibbonStartIdx(val) { ribbonStartIdx = val; }

function buildRibbonGeometry(startIdx) {
  const count = RIBBON_WINDOW;
  const positions = new Float32Array(count * 2 * 3);
  const uvs       = new Float32Array(count * 2 * 2);
  const indices   = [];

  for (let i = 0; i < count; i++) {
    const pd = pathData[startIdx + i];
    const rx =  Math.cos(pd.angle);
    const rz =  Math.sin(pd.angle);
    const lx = pd.pos.x - rx * ROAD_WIDTH / 2;
    const lz = pd.pos.z - rz * ROAD_WIDTH / 2;
    const hx = pd.pos.x + rx * ROAD_WIDTH / 2;
    const hz = pd.pos.z + rz * ROAD_WIDTH / 2;

    const v = i * 6;
    positions[v]   = lx; positions[v+1] = 0.01; positions[v+2] = lz;
    positions[v+3] = hx; positions[v+4] = 0.01; positions[v+5] = hz;

    const u = i * 4;
    uvs[u]   = 0; uvs[u+1] = i * 0.25;
    uvs[u+2] = 1; uvs[u+3] = i * 0.25;

    if (i < count - 1) {
      const a = i*2, b = i*2+1, c = i*2+2, d = i*2+3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export const ribbonMesh = new THREE.Mesh(new THREE.BufferGeometry(), roadMat);
ribbonMesh.receiveShadow = true;
ribbonMesh.geometry = buildRibbonGeometry(0);
scene.add(ribbonMesh);

export function rebuildRibbon(carPosition) {
  if (ribbonStartIdx + RIBBON_WINDOW + 10 >= pathData.length) {
    growPath(RIBBON_WINDOW + 20);
  }
  ribbonMesh.geometry.dispose();
  ribbonMesh.geometry = buildRibbonGeometry(ribbonStartIdx);
  lastRebuildCarPos.copy(carPosition);
}

// ─── Off-road detection ──────────────────────────────────────────────────────
export function isOnRoad(carPosition) {
  const checkFrom = Math.max(0, ribbonStartIdx);
  const checkTo   = Math.min(pathData.length - 1, ribbonStartIdx + RIBBON_WINDOW);
  for (let i = checkFrom; i < checkTo; i++) {
    const pd    = pathData[i];
    const dx    = carPosition.x - pd.pos.x;
    const dz    = carPosition.z - pd.pos.z;
    const fwd   =  Math.sin(pd.angle) * dx - Math.cos(pd.angle) * dz;
    const right =  Math.cos(pd.angle) * dx + Math.sin(pd.angle) * dz;
    if (Math.abs(right) < ROAD_WIDTH / 2 + 1 && Math.abs(fwd) < SEGMENT_LEN / 2) return true;
  }
  return false;
}
