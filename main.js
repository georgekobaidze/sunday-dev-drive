import * as THREE from 'three';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000015);
scene.fog = new THREE.Fog(0x000015, 60, 160);

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 4, 12);
camera.lookAt(0, 1, 0);

// ─── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x2d1b69, 2.0));

const pinkLight = new THREE.DirectionalLight(0xff2d78, 1.2);
pinkLight.position.set(-15, 12, 0);
scene.add(pinkLight);

const cyanLight = new THREE.DirectionalLight(0x00ffe1, 0.8);
cyanLight.position.set(15, 8, 0);
scene.add(cyanLight);

// ─── Synthwave Sun ───────────────────────────────────────────────────────────
function createSynthwaveSun() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Sun gradient: red top → yellow bottom
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ff1a00');
  grad.addColorStop(0.5, '#ff6600');
  grad.addColorStop(1, '#ffdd00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 230, Math.PI, 0);
  ctx.fill();

  // Horizontal stripe cutouts (classic synthwave look)
  ctx.fillStyle = '#08001a';
  for (let i = 0; i < 7; i++) {
    const t = i / 10;
    const y = 256 + t * 230;
    const thickness = 4 + t * 14;
    ctx.fillRect(26, y, 460, thickness);
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 40),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  mesh.position.set(0, 14, -140);
  return mesh;
}
const synthwaveSun = createSynthwaveSun();
scene.add(synthwaveSun);

// ─── Ground ──────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshLambertMaterial({ color: 0x110022 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ─── City Skyline Ring ────────────────────────────────────────────────────────
function createCitySkylineTexture() {
  const W = 2048, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const neons = ['#ff2d78', '#00ffe1', '#bf00ff', '#ffe600', '#00aaff', '#ff6600'];
  const rng = (a, b) => a + Math.random() * (b - a);

  // Draw buildings tiling across the full width
  let x = 0;
  while (x < W) {
    const w = rng(18, 60);
    const h = rng(40, H * 0.88);
    const col = `#000000`;
    ctx.fillStyle = col;
    ctx.fillRect(x, H - h, w, h);

    // Neon edge strip
    const nc = neons[Math.floor(Math.random() * neons.length)];
    ctx.fillStyle = nc;
    ctx.fillRect(x, H - h, 2, h);

    // Windows
    const winColor = neons[Math.floor(Math.random() * neons.length)];
    ctx.fillStyle = winColor;
    for (let wy = H - h + 6; wy < H - 6; wy += rng(8, 14)) {
      for (let wx = x + 4; wx < x + w - 4; wx += rng(5, 10)) {
        if (Math.random() > 0.45) ctx.fillRect(wx, wy, 2, 6);
      }
    }

    // Antenna on tall buildings
    if (h > H * 0.6) {
      ctx.fillStyle = nc;
      ctx.fillRect(x + w / 2 - 1, H - h - rng(8, 20), 2, rng(8, 20));
    }

    x += w + rng(0, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

const skylineTex = createCitySkylineTexture();
const skylineH = 28;
const skylineMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(260, 260, skylineH, 64, 1, true),
  new THREE.MeshBasicMaterial({ map: skylineTex, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false })
);
skylineMesh.position.y = skylineH / 2;
scene.add(skylineMesh);


// ─── Road path (infinite curved) ─────────────────────────────────────────────
const SEGMENT_LEN = 6;
const NUM_SEGMENTS = 35;
const ROAD_WIDTH   = 8;

// Bake road surface + markings into a canvas texture (smooth, no separate meshes)
function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 256, 512);
  // Neon blue edge lines
  ctx.fillStyle = '#00aaff';
  ctx.fillRect(0, 0, 5, 512);
  ctx.fillRect(251, 0, 5, 512);
  // Cyan centre dashes — shorter, more spaced
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

// Path generator — grows forward as needed
const pathData = []; // { pos: Vector3, angle: number }
const pathHead  = { pos: new THREE.Vector3(0, 0, 0), angle: 0 };
let   pathTurnRate      = 0;
let   pathTurnCountdown = 5;

function growPath(count) {
  for (let i = 0; i < count; i++) {
    if (--pathTurnCountdown <= 0) {
      pathTurnRate      = (Math.random() - 0.5) * 0.042; // scaled for shorter segments
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

growPath(300); // pre-generate plenty

// ─── Road ribbon (one seamless mesh along the curve) ─────────────────────────
const RIBBON_WINDOW = 200; // path points visible at once
let   ribbonStartIdx = 0;
let   lastRebuildCarPos = new THREE.Vector3();

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

const ribbonMesh = new THREE.Mesh(new THREE.BufferGeometry(), roadMat);
ribbonMesh.receiveShadow = true;
ribbonMesh.geometry = buildRibbonGeometry(0);
scene.add(ribbonMesh);

function rebuildRibbon() {
  if (ribbonStartIdx + RIBBON_WINDOW + 10 >= pathData.length) {
    growPath(RIBBON_WINDOW + 20);
  }
  ribbonMesh.geometry.dispose();
  ribbonMesh.geometry = buildRibbonGeometry(ribbonStartIdx);
  lastRebuildCarPos.copy(car.position);
}

// Off-road detection using pathData
function isOnRoad() {
  const checkFrom = Math.max(0, ribbonStartIdx);
  const checkTo   = Math.min(pathData.length - 1, ribbonStartIdx + RIBBON_WINDOW);
  for (let i = checkFrom; i < checkTo; i++) {
    const pd    = pathData[i];
    const dx    = car.position.x - pd.pos.x;
    const dz    = car.position.z - pd.pos.z;
    const fwd   =  Math.sin(pd.angle) * dx - Math.cos(pd.angle) * dz;
    const right =  Math.cos(pd.angle) * dx + Math.sin(pd.angle) * dz;
    if (Math.abs(right) < ROAD_WIDTH / 2 + 1 && Math.abs(fwd) < SEGMENT_LEN / 2) return true;
  }
  return false;
}


// ─── City Buildings (recycling strips along path) ────────────────────────────
const darkColors = [0x1a0030, 0x0d001a, 0x100020];
const neonColors = [0xff2d78, 0x00ffe1, 0xbf00ff, 0xffe600];
const BUILDING_SPACING = 6; // every 6 path segments (= 36 units)
const NUM_BSTRIPS = 10;

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
        // Front windows
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.5),
          new THREE.MeshBasicMaterial({ color: winColor })
        );
        win.position.set((col - 0.5) * 2, -h / 2 + 2 + row * 3.5, d / 2 + 0.08);
        building.add(win);
        // Back windows
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

function placeBuildingStrip(mesh, pd) {
  mesh.position.set(pd.pos.x, 0, pd.pos.z);
  mesh.rotation.y = -pd.angle;
}

const buildingStrips = [];
for (let i = 0; i < NUM_BSTRIPS; i++) {
  const pathIdx = i * BUILDING_SPACING + 1;
  if (pathIdx >= pathData.length) growPath(pathIdx + 2 - pathData.length);
  const mesh = createBuildingStrip();
  placeBuildingStrip(mesh, pathData[pathIdx]);
  scene.add(mesh);
  buildingStrips.push({ mesh, pathIdx });
}


// ─── Car (visual reference) ───────────────────────────────────────────────────
function createCar() {
  const group = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x0044ff });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x0a0015 });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const rimMat   = new THREE.MeshBasicMaterial({ color: 0x00ffe1 }); // unused

  // ── Lower body (wide, flat base) ─────────────────────────────────────────
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 4.4), bodyMat);
  base.position.y = 0.51;
  base.castShadow = true;
  group.add(base);

  // ── Mid body (slightly narrower, gives a sculpted side profile) ───────────
  const mid = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 4.0), bodyMat);
  mid.position.y = 0.80;
  group.add(mid);

  // ── Front hood (low, slopes toward front) ────────────────────────────────
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 1.2), bodyMat);
  hood.position.set(0, 1.02, -1.4);
  group.add(hood);

  // ── Rear trunk (slightly lower than cabin section) ────────────────────────
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.8), bodyMat);
  trunk.position.set(0, 1.02, 1.5);
  group.add(trunk);

  // ── Cabin ─────────────────────────────────────────────────────────────────
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.46, 1.8), bodyMat);
  cabin.position.set(0, 1.30, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 1.85), bodyMat);
  sill.position.set(0, 1.005, -0.05);
  group.add(sill);

  // ── Rear gap filler (cabin rear z=0.8 → trunk front z=1.1) ───────────────
  const rearFill = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.35), bodyMat);
  rearFill.position.set(0, 1.005, 0.95);
  group.add(rearFill);

  // ── Windows (dark glass on cabin faces) ──────────────────────────────────
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x050510, transparent: true, opacity: 0.85 });

  // Windshield (front, facing -Z)
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.38), glassMat);
  windshield.position.set(0, 1.30, -0.1 - 0.91);
  windshield.rotation.y = Math.PI;
  group.add(windshield);

  // Rear window (facing +Z)
  const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.38), glassMat);
  rearWindow.position.set(0, 1.30, -0.1 + 0.91);
  group.add(rearWindow);

  // Side windows
  for (const [x, ry] of [[-0.81, -Math.PI / 2], [0.81, Math.PI / 2]]) {
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.36), glassMat);
    sideWin.position.set(x, 1.30, -0.1);
    sideWin.rotation.y = ry;
    group.add(sideWin);
  }
  // ── Wheels (narrow tyres) ─────────────────────────────────────────────────
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16);
  const rimGeo   = new THREE.CylinderGeometry(0.21, 0.21, 0.08, 16);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.36, z);
    group.add(wheel);
  }

  // ── Tail lights (red/orange, facing camera at +Z) ─────────────────────────
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

  // ── Reverse lights (white, inner pair, hidden by default) ────────────────
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

  // ── Headlight meshes (white, at -Z) ──────────────────────────────────────
  for (const x of [-0.68, 0.68]) {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.12, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    hl.position.set(x, 0.74, -2.22);
    group.add(hl);
  }

  // ── Interior ──────────────────────────────────────────────────────────────
  const dashMat  = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const neonMat  = new THREE.MeshBasicMaterial({ color: 0x00aaff });
  const neonRedM = new THREE.MeshBasicMaterial({ color: 0xff2d78 });

  // Dashboard panel (wide, low, just behind windshield)
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.32), dashMat);
  dash.position.set(0, 1.12, -0.82);
  group.add(dash);

  // Dashboard neon trim strip
  const dashTrim = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.02, 0.02), neonMat);
  dashTrim.position.set(0, 1.22, -0.97);
  group.add(dashTrim);

  // Speedo/display glow (two rectangles on dash face)
  for (const [xo, mat] of [[-0.3, neonMat], [0.3, neonRedM]]) {
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.10), mat);
    display.position.set(xo, 1.16, -0.97);
    display.rotation.y = Math.PI;
    group.add(display);
  }

  // Steering column — angled up from under dash toward driver
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), dashMat);
  col.rotation.x = Math.PI / 18;
  col.position.set(-0.22, 1.00, -0.62);
  group.add(col);

  // Steering wheel (torus) — in front of dash, tilted toward driver
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), dashMat);
  wheelRing.position.set(-0.22, 1.13, -0.66);
  wheelRing.rotation.x = Math.PI / 18;
  group.add(wheelRing);

  // Car-style steering wheel: center hub + 3 spokes (top + two lower)
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

const car = createCar();
scene.add(car);

// Headlights — PointLights on the road ahead of the car
const headlights = [];
for (const x of [-0.6, 0.6]) {
  const light = new THREE.PointLight(0xffffff, 40, 50);
  scene.add(light);
  headlights.push(light);
}

// ─── Input ───────────────────────────────────────────────────────────────────
const keys = { left: false, right: false, up: false, down: false };
// ─── Camera State ─────────────────────────────────────────────────────────────
const camState = { mode: 'chase' }; // chase | hood | side | orbit
const orbit = { active: false, phi: Math.PI / 6, theta: Math.PI, radius: 12, lastX: 0, lastY: 0 };

function initOrbitFromCamera() {
  const dx = camera.position.x - car.position.x;
  const dy = camera.position.y - car.position.y;
  const dz = camera.position.z - car.position.z;
  orbit.radius = Math.max(4, Math.sqrt(dx*dx + dy*dy + dz*dz));
  orbit.phi    = Math.max(0.05, Math.min(Math.PI / 2, Math.acos(dy / orbit.radius)));
  orbit.theta  = Math.atan2(dx, dz);
}

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button === 2) { initOrbitFromCamera(); orbit.active = true; orbit.lastX = e.clientX; orbit.lastY = e.clientY; camState.mode = 'orbit'; updateCamHUD(); }
});
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mouseup',   e => { if (e.button === 2) orbit.active = false; });
window.addEventListener('mousemove', e => {
  if (!orbit.active) return;
  const dx = e.clientX - orbit.lastX;
  const dy = e.clientY - orbit.lastY;
  orbit.lastX = e.clientX; orbit.lastY = e.clientY;
  orbit.theta -= dx * 0.005;
  orbit.phi    = Math.max(0.05, Math.min(Math.PI / 2, orbit.phi - dy * 0.005));
});
renderer.domElement.addEventListener('wheel', e => {
  if (camState.mode !== 'orbit') return;
  orbit.radius = Math.max(4, Math.min(30, orbit.radius + e.deltaY * 0.02));
});

// Billboard click — raycast against panels, open article URL
const _bbRaycaster = new THREE.Raycaster();
renderer.domElement.addEventListener('click', e => {
  if (orbit.active) return; // ignore if was dragging
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width)  *  2 - 1,
    ((e.clientY - rect.top)  / rect.height) * -2 + 1
  );
  _bbRaycaster.setFromCamera(mouse, camera);
  const panels = billboardPool.map(bb => bb.mesh.userData.panel).filter(Boolean);
  const hits = _bbRaycaster.intersectObjects(panels);
  if (hits.length > 0) {
    const url = hits[0].object.userData.articleUrl;
    if (url) window.open(url, '_blank');
  }
});

function updateCamHUD() {
  const labels = { chase: '🎥 Chase', interior: '🪟 Interior', side: '↔ Side', orbit: '🔄 Orbit' };
  camHUD.textContent = labels[camState.mode] + '  [C/Y] cycle  [RMB] orbit  [V/R3] look back';
}
const camHUD = document.createElement('div');
camHUD.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#00aaff;font:13px monospace;opacity:0.7;pointer-events:none;';
document.body.appendChild(camHUD);
updateCamHUD();

// ─── Gear HUD ─────────────────────────────────────────────────────────────────
const gearHUD = document.createElement('div');
gearHUD.style.cssText = 'position:fixed;top:20px;right:24px;display:flex;gap:10px;pointer-events:none;font:bold 22px Courier New,monospace;';
document.body.appendChild(gearHUD);
function updateGearHUD() {
  gearHUD.innerHTML = ['P','R','D'].map(g => {
    const active = g === carState.gear;
    const colors = { D: '#00aaff', R: '#ff2d78', P: '#ffe44d' };
    const style = active
      ? `color:${colors[g]};text-shadow:0 0 10px ${colors[g]};border:2px solid ${colors[g]};padding:4px 10px;border-radius:4px;`
      : `color:#444;border:2px solid #222;padding:4px 10px;border-radius:4px;`;
    return `<span style="${style}">${g}</span>`;
  }).join('');
}

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  keys.left  = true;
  if (e.key === 'ArrowRight') keys.right = true;
  if (e.key === 'ArrowUp')    keys.up    = true;
  if (e.key === 'ArrowDown')  keys.down  = true;
  if (e.key === 'v' || e.key === 'V') keys.lookBack = true;
  if (e.key === 'p' || e.key === 'P') { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'P'; carState.speed = 0; updateGearHUD(); } }
  if (e.key === 'd' || e.key === 'D') { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'D'; updateGearHUD(); } }
  if (e.key === 'r' || e.key === 'R') { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'R'; updateGearHUD(); } }
  if (e.key === 'c' || e.key === 'C') {
    if (camState.mode === 'orbit') {
      camState.mode = 'chase';
    } else {
      const modes = ['chase', 'interior', 'side'];
      const idx = modes.indexOf(camState.mode);
      camState.mode = modes[(idx + 1) % modes.length];
    }
    updateCamHUD();
  }
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft')  keys.left  = false;
  if (e.key === 'ArrowRight') keys.right = false;
  if (e.key === 'ArrowUp')    keys.up    = false;
  if (e.key === 'ArrowDown')  keys.down  = false;
  if (e.key === 'v' || e.key === 'V') keys.lookBack = false;
});

// ─── Gamepad polling(pure scan every frame — event listeners trigger Chrome's
//     GameInput haptic init which causes Xbox wireless to power off) ──────────
function getGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < pads.length; i++) { if (pads[i]) return pads[i]; }
  return null;
}

function getInputs() {
  let steer    = 0;
  let throttle = 0;
  let brake    = 0;

  // Keyboard
  if (keys.left)  steer    -= 1;
  if (keys.right) steer    += 1;
  if (keys.up)    throttle  = 1;
  if (keys.down)  brake     = 1;

  // Gamepad (analog, layered on top of keyboard — takes max of both)
  const gp = getGamepad();
  if (gp) {
    const axis = gp.axes[0];
    if (Math.abs(axis) > 0.1) steer = axis;
    const gpThrottle = gp.buttons[7]?.value ?? 0;
    const gpBrake    = gp.buttons[6]?.value ?? 0;
    if (gpThrottle > 0) throttle = gpThrottle;
    if (gpBrake    > 0) brake    = gpBrake;

    // Y / Triangle (button 3) — cycle camera (edge-triggered)
    const camBtn = gp.buttons[3]?.pressed ?? false;
    if (camBtn && !getInputs._prevCamBtn) {
      const modes = ['chase', 'interior', 'side'];
      const idx = modes.indexOf(camState.mode);
      camState.mode = modes[(idx + 1) % modes.length];
      updateCamHUD();
    }
    getInputs._prevCamBtn = camBtn;
  }

  return { steer, throttle, brake };
}

// ─── Car state ───────────────────────────────────────────────────────────────
const carState = {
  speed:   0,
  angle:   0,
  steer:   0,
  gear:    'D', // D = drive, R = reverse, P = park
};

// Start 30 segments in so the road looks established behind the car
const CAR_START_IDX = 30;
car.position.copy(pathData[CAR_START_IDX].pos);
carState.angle = pathData[CAR_START_IDX].angle;
car.rotation.y = -carState.angle;
lastRebuildCarPos.copy(pathData[CAR_START_IDX].pos);
updateGearHUD();

const CAR = {
  maxSpeed:     0.42,
  acceleration: 0.0006, // slow build-up, tapers at high speed
  brakeForce:   0.0015, // gentle, realistic deceleration
  friction:     0.00005, // barely any coast-down
  turnSpeed:    0.018,
};

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Loop ────────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const { steer, throttle, brake } = getInputs();

  // Gear-based movement
  if (carState.gear === 'P') {
    // Park: no movement regardless of input
    carState.speed = 0;
  } else if (carState.gear === 'D') {
    if (throttle > 0 && brake > 0) {
      // Throttle + brake together: crawl slowly, fighting both forces
      const struggle = CAR.maxSpeed * 0.08;
      carState.speed += (struggle - carState.speed) * 0.04;
    } else if (throttle > 0) {
      // Acceleration tapers off as speed increases (realistic torque curve)
      const speedRatio = carState.speed / CAR.maxSpeed;
      const effectiveAccel = CAR.acceleration * throttle * (1 - speedRatio * 0.85);
      carState.speed = Math.min(carState.speed + effectiveAccel, CAR.maxSpeed);
    } else if (brake > 0) {
      carState.speed = Math.max(carState.speed - CAR.brakeForce * brake, 0);
    } else {
      carState.speed = Math.max(carState.speed - CAR.friction, 0);
    }
  } else if (carState.gear === 'R') {
    if (throttle > 0) {
      carState.speed = Math.max(carState.speed - CAR.acceleration * throttle, -CAR.maxSpeed * 0.5);
    } else if (brake > 0) {
      carState.speed = Math.min(carState.speed + CAR.brakeForce * brake, 0);
    } else {
      carState.speed = Math.min(carState.speed + CAR.friction, 0);
    }
  }

  // Gamepad DPad gear shifting (edge-triggered)
  const gpGear = getGamepad();
  if (gpGear) {
    const dUp   = gpGear.buttons[12]?.pressed ?? false;
    const dDown = gpGear.buttons[13]?.pressed ?? false;
    const dLeft = gpGear.buttons[14]?.pressed ?? false;
    if (dUp   && !animate._prevDUp)   { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'D'; updateGearHUD(); } }
    if (dDown && !animate._prevDDown) { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'R'; updateGearHUD(); } }
    if (dLeft && !animate._prevDLeft) { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'P'; carState.speed = 0; updateGearHUD(); } }
    animate._prevDUp   = dUp;
    animate._prevDDown = dDown;
    animate._prevDLeft = dLeft;
  }

  // Smooth steering — steer is inverted in reverse for natural feel
  const steerDir = carState.gear === 'R' ? -steer : steer;
  carState.steer += (steerDir - carState.steer) * 0.1;
  carState.angle += carState.steer * Math.abs(carState.speed) * CAR.turnSpeed;

  // Move car in direction it's facing (speed is signed: positive=forward, negative=reverse)
  car.position.x += Math.sin(carState.angle) * carState.speed;
  car.position.z -= Math.cos(carState.angle) * carState.speed;

  // Rotate car mesh to match heading + body roll
  car.rotation.y = -carState.angle;
  car.rotation.z =  carState.steer * 0.08; // subtle body roll

  // Brake lights — dim red normally, vivid bright red with strong glow when braking
  const isBraking = brake > 0;
  const isInterior = camState.mode === 'interior';
  for (const m of car.userData.tailLights) m.material.color.setHex(isBraking ? 0xff2200 : 0x550800);
  car.userData.tailGlow.intensity = isInterior ? 0 : (isBraking ? 40 : 3);
  car.userData.tailGlow.distance  = isBraking ? 14 : 7;

  // Reverse lights — white flash when in R gear
  const isReversing = carState.gear === 'R';
  for (const m of car.userData.reverseLights) m.material.color.setHex(isReversing ? 0xffffff : 0x111111);
  car.userData.reverseGlow.intensity = (isReversing && !isInterior) ? 6 : 0;

  // Keep headlights ahead of car in world space
  const hlOffset = 8;
  for (let i = 0; i < headlights.length; i++) {
    const side = i === 0 ? -0.6 : 0.6;
    headlights[i].position.set(
      car.position.x + Math.sin(carState.angle) * hlOffset + Math.cos(carState.angle) * side,
      0.4,
      car.position.z - Math.cos(carState.angle) * hlOffset + Math.sin(carState.angle) * side
    );
  }

  // Advance ribbon when car moves far enough forward
  if (car.position.distanceTo(lastRebuildCarPos) > SEGMENT_LEN * 30) {
    // Find nearest path point to car
    let nearestIdx = ribbonStartIdx;
    let nearestDist = Infinity;
    const searchEnd = Math.min(pathData.length - 1, ribbonStartIdx + RIBBON_WINDOW);
    for (let i = ribbonStartIdx; i < searchEnd; i++) {
      const d = car.position.distanceTo(pathData[i].pos);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    ribbonStartIdx = Math.max(0, nearestIdx - 10);
    rebuildRibbon();
  }

  // Off-road: slow down + camera shake
  if (!isOnRoad()) {
    carState.speed *= 0.97;
    camera.position.x += (Math.random() - 0.5) * 0.06;
    camera.position.y += (Math.random() - 0.5) * 0.04;
  }

  // Hard lateral boundary — stop car before reaching buildings
  {
    const MAX_LATERAL = ROAD_WIDTH / 2 + 12; // buildings start at ~24 units, cap at 16
    let nearestIdx = ribbonStartIdx, nearestDist = Infinity;
    const searchEnd = Math.min(pathData.length - 1, ribbonStartIdx + RIBBON_WINDOW);
    for (let i = ribbonStartIdx; i < searchEnd; i++) {
      const d = car.position.distanceTo(pathData[i].pos);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    const pd    = pathData[nearestIdx];
    const dx    = car.position.x - pd.pos.x;
    const dz    = car.position.z - pd.pos.z;
    const right = Math.cos(pd.angle) * dx + Math.sin(pd.angle) * dz;
    if (Math.abs(right) > MAX_LATERAL) {
      const clamp = Math.sign(right) * MAX_LATERAL;
      const excess = right - clamp;
      car.position.x -= Math.cos(pd.angle) * excess;
      car.position.z -= Math.sin(pd.angle) * excess;
      carState.speed *= 0.5; // kill speed on impact
    }
  }

  // Post collision — stop the car when it hits a sign/billboard support
  {
    const CAR_RADIUS = 1.2;
    for (const grp of signGroups) {
      if (!grp.userData.postLocalXs) continue;
      const ry = grp.rotation.y;
      for (const lx of grp.userData.postLocalXs) {
        const wx = grp.position.x + lx * Math.cos(ry);
        const wz = grp.position.z - lx * Math.sin(ry);
        const dist = Math.sqrt((car.position.x - wx) ** 2 + (car.position.z - wz) ** 2);
        const minDist = CAR_RADIUS + grp.userData.postRadius;
        if (dist < minDist && dist > 0.01) {
          // Push car out and kill speed
          const nx = (car.position.x - wx) / dist;
          const nz = (car.position.z - wz) / dist;
          car.position.x = wx + nx * minDist;
          car.position.z = wz + nz * minDist;
          carState.speed = 0;
        }
      }
    }
  }

  // Recycle building strips
  for (const bs of buildingStrips) {
    const pd  = pathData[bs.pathIdx];
    const dx  = car.position.x - pd.pos.x;
    const dz  = car.position.z - pd.pos.z;
    const fwd = Math.sin(pd.angle) * dx - Math.cos(pd.angle) * dz;
    if (fwd > SEGMENT_LEN * 20) {
      const maxIdx = Math.max(...buildingStrips.map(b => b.pathIdx));
      const newIdx = maxIdx + BUILDING_SPACING;
      if (newIdx >= pathData.length) growPath(newIdx + 4 - pathData.length);
      placeBuildingStrip(bs.mesh, pathData[newIdx]);
      bs.pathIdx = newIdx;
    }
  }

  // Sun always on horizon ahead of camera
  synthwaveSun.position.set(camera.position.x, 14, camera.position.z - 140);
  skylineMesh.position.x = camera.position.x;
  skylineMesh.position.z = camera.position.z;

  // ── Gamepad: look-back (hold R3) + right-stick orbit ─────────────────────
  const gpCam = getGamepad();
  const gpLookBack = gpCam?.buttons[11]?.pressed ?? false;
  const lookBack = keys.lookBack || gpLookBack;
  if (gpCam) {
    const rx = gpCam.axes[2] ?? 0;
    const ry = gpCam.axes[3] ?? 0;
    if (Math.abs(rx) > 0.1 || Math.abs(ry) > 0.1) {
      if (camState.mode !== 'orbit') { initOrbitFromCamera(); camState.mode = 'orbit'; updateCamHUD(); }
      orbit.theta -= rx * 0.03;
      orbit.phi = Math.max(0.05, Math.min(Math.PI / 2, orbit.phi - ry * 0.03));
    }
  }

  // ── Camera modes ──────────────────────────────────────────────────────────
  const fwdX = Math.sin(carState.angle);
  const fwdZ = -Math.cos(carState.angle);

  if (camState.mode === 'orbit') {
    const ox = car.position.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    const oy = car.position.y + orbit.radius * Math.cos(orbit.phi);
    const oz = car.position.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    camera.position.set(ox, oy, oz);
    camera.lookAt(car.position.x, car.position.y + 0.8, car.position.z);

  } else if (camState.mode === 'interior') {
    // Driver's eye position inside cabin
    const tx = car.position.x - fwdX * 0.1 - Math.cos(carState.angle) * 0.22;
    const ty = car.position.y + 1.48;
    const tz = car.position.z + fwdZ * 0.1 - Math.sin(carState.angle) * 0.22;
    camera.position.set(tx, ty, tz);
    const lookMult = lookBack ? -1 : 1;
    camera.lookAt(car.position.x + fwdX * 20 * lookMult, car.position.y + 1.3, car.position.z + fwdZ * 20 * lookMult);
    // Animate steering wheel
    const sw = car.userData.steeringWheel;
    if (sw) sw.rotation.z = -carState.steer * 0.5;

  } else if (camState.mode === 'side') {
    const rightX = Math.cos(carState.angle);
    const rightZ = Math.sin(carState.angle);
    const tx = car.position.x + rightX * 10;
    const ty = car.position.y + 3;
    const tz = car.position.z + rightZ * 10;
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.08);
    camera.lookAt(car.position.x, car.position.y + 0.8, car.position.z);

  } else {
    // Chase cam (default)
    const lookBackMult = lookBack ? -1 : 1;
    const camDist   = 9;
    const camHeight = 4;
    const targetCamPos = new THREE.Vector3(
      car.position.x - fwdX * camDist * lookBackMult,
      car.position.y + camHeight,
      car.position.z - fwdZ * camDist * lookBackMult
    );
    camera.position.lerp(targetCamPos, 0.08);
    const lookTarget = new THREE.Vector3(
      car.position.x + fwdX * 4 * lookBackMult,
      car.position.y + 0.5,
      car.position.z + fwdZ * 4 * lookBackMult
    );
    camera.lookAt(lookTarget);
  }

  // Recycle billboard pool
  if (devArticles.length) {
    for (const bb of billboardPool) {
      const pd  = pathData[bb.pathIdx];
      const dx  = car.position.x - pd.pos.x;
      const dz  = car.position.z - pd.pos.z;
      const fwd = Math.sin(pd.angle) * dx - Math.cos(pd.angle) * dz;
      if (fwd > SEGMENT_LEN * 20) {
        const maxIdx = Math.max(...billboardPool.map(b => b.pathIdx));
        bb.pathIdx = safePathIdx(maxIdx + BILLBOARD_SPACING);
        if (bb.pathIdx >= pathData.length) growPath(bb.pathIdx + 4 - pathData.length);
        placeBillboard(bb, pathData[bb.pathIdx], bb.side);
        assignBillboardArticle(bb);
      }
    }
  }

  // Recycle badge signs
  if (devBadges.length) {
    for (const bs of badgeSigns) {
      const pd  = pathData[bs.pathIdx];
      const dx  = car.position.x - pd.pos.x;
      const dz  = car.position.z - pd.pos.z;
      const fwd = Math.sin(pd.angle) * dx - Math.cos(pd.angle) * dz;
      if (fwd > SEGMENT_LEN * 20) {
        const maxIdx = Math.max(...badgeSigns.map(b => b.pathIdx));
        bs.pathIdx = maxIdx + BADGE_SPACING;
        if (bs.pathIdx >= pathData.length) growPath(bs.pathIdx + 4 - pathData.length);
        placeStatSign(bs, pathData[bs.pathIdx]);
        assignStatSign(bs);
      }
    }
  }

  renderer.render(scene, camera);
}
// ─── DEV.to API + Billboard System ───────────────────────────────────────────

let devArticles = [];       // fetched articles with snippets
let currentUsername = '';

// ─── Motivational messages for users with no articles ─────────────────────────
const MOTIVATIONAL_MESSAGES = [
  { title: "Your ideas deserve to exist.", description: "You've thought things no one else has thought. Write them down before the world misses them." },
  { title: "The best time to start was yesterday.", description: "The second best time is right now. Open a draft. Write one sentence. That's all it takes." },
  { title: "You already know something others don't.", description: "Every developer has hard-won knowledge. Someone out there is stuck on exactly what you figured out last week." },
  { title: "Your first article doesn't have to be perfect.", description: "It just has to exist. Perfection is the enemy of published." },
  { title: "Writing makes you a better engineer.", description: "Explaining a concept forces you to truly understand it. Write to learn, not just to teach." },
  { title: "Someone is googling your answer right now.", description: "The solution you found at 2am? Write it up. You'll save someone else's night." },
  { title: "Code fades. Words last.", description: "Repos get archived. Articles get read for years. Your words have a longer half-life than your pull requests." },
  { title: "You don't need to be an expert.", description: "Write as a beginner for beginners. That perspective is rarer and more valuable than you think." },
  { title: "Your journey IS the content.", description: "The struggle, the confusion, the breakthrough — that's the story. Document it as you go." },
  { title: "Every expert was once a beginner who wrote about it.", description: "The developers you admire started by sharing what little they knew. So can you." },
  { title: "DEV.to is waiting for your voice.", description: "This community is built by people who decided to show up and share. It's your turn." },
  { title: "What took you hours to learn takes minutes to share.", description: "Compress your suffering into a post so others don't have to suffer the same way." },
  { title: "Writing builds your reputation.", description: "Every article is a permanent signal of your thinking. Employers, collaborators, and fans are reading." },
  { title: "You have more to say than you think.", description: "Start with one problem you solved this month. That's a post right there." },
  { title: "The developer community runs on shared knowledge.", description: "Stack Overflow, GitHub, DEV — it all exists because someone decided to give. Be a giver." },
  { title: "Writer's block is just a blank file.", description: "Open a new post. Write a bad first draft. The blank page is the only real obstacle." },
  { title: "Your tutorial would have helped past-you.", description: "Think about the thing you wish existed when you were learning it. Write that thing." },
  { title: "One article can change someone's career.", description: "The right post at the right moment can unlock a door for a stranger. You have that power." },
  { title: "Writing is thinking made visible.", description: "The process of writing clarifies ideas you didn't even know were fuzzy. Try it once." },
  { title: "You're already doing the hard part.", description: "You're coding, building, learning. Writing about it is just narrating what you're already doing." },
  { title: "The dev world needs more diverse voices.", description: "Your background, your perspective, your way of solving things — that's not replaceable by AI." },
  { title: "No audience on day one? That's normal.", description: "Every writer with 10,000 readers once had zero. The first post always feels like shouting into a void." },
  { title: "Ship it like you ship code.", description: "You don't wait for perfect code to deploy. Don't wait for a perfect article to publish either." },
  { title: "A short article beats no article.", description: "200 words of genuine insight beats 2,000 words of procrastination every single time." },
  { title: "Teaching is the fastest way to master anything.", description: "The moment you try to explain something, you discover every gap in your understanding." },
  { title: "Your side project deserves a write-up.", description: "You built something. Now tell the world why, how, and what you learned. That's a post." },
  { title: "The internet never forgets good content.", description: "A useful article you write today can bring value to readers ten years from now." },
  { title: "Writing creates serendipity.", description: "The job offer, the collaborator, the opportunity — they often come from someone who read your work." },
  { title: "You're not competing. You're contributing.", description: "DEV isn't a contest. It's a conversation. You don't need to win. Just join in." },
  { title: "Your debugging story is worth telling.", description: "That bug that took you three days? Write the post-mortem. It's gold for anyone who hits the same wall." },
  { title: "Start with a question, not an answer.", description: "\"Why does X work this way?\" is a perfect title. Investigate it out loud in an article." },
  { title: "The niche you think is too small? It isn't.", description: "There are thousands of developers interested in exactly what you care about. Write for them." },
  { title: "You've already written it in Slack.", description: "That long explanation you typed in a channel? Clean it up. That's 80% of an article." },
  { title: "Consistency beats brilliance.", description: "One decent article a month for a year outperforms one brilliant article you're still editing." },
  { title: "Your README could be an article.", description: "The documentation you wrote for yourself? Someone else needs it too. Publish it." },
  { title: "Every language, framework, and tool needs more beginner content.", description: "The expert tutorials are everywhere. Beginner-friendly guides are always scarce. Write one." },
  { title: "Writing forces you to care about clarity.", description: "The clearer your writing, the clearer your thinking. That clarity shows up in your code too." },
  { title: "You've been meaning to write for months.", description: "That's not a draft problem — it's a decision problem. Decide now." },
  { title: "Start ugly. Edit later.", description: "A rough draft published beats a perfect draft that stays in your head forever." },
  { title: "Your mistakes are more valuable than your successes.", description: "Everyone shares wins. The developers who share failures and lessons are the ones we trust." },
  { title: "What problem are you solving today?", description: "Write it down as you go. You'll have an article by the time you solve it." },
  { title: "Open source isn't just code.", description: "Knowledge can be open source too. Your articles are pull requests to the collective brain of the internet." },
  { title: "The developer who writes gets remembered.", description: "Ten developers might build the same thing. The one who writes about it is the one we know." },
  { title: "You have imposter syndrome? Write about it.", description: "That feeling is universal. An honest post about it will resonate with thousands." },
  { title: "Writing is a superpower most developers skip.", description: "Communication is the bottleneck in almost every engineering career. Writing trains that muscle." },
  { title: "Your 'obvious' tip isn't obvious to everyone.", description: "The shortcut you think everyone knows? Someone out there has never heard of it. Tell them." },
  { title: "A single article is enough to start.", description: "You don't need a series, a brand, or a strategy. You need one post. Just one." },
  { title: "The road is long. Might as well document it.", description: "You're driving through your learning journey every day. Leave some signs for those who follow." },
  { title: "This billboard was supposed to be your article.", description: "But you haven't written one yet. You should fix that. Like, today." },
  { title: "Still here? Go write something.", description: "You've been driving long enough. Time to park, open a draft, and share what's in your head." },
];

let billboardPool = [];     // { mesh, postMesh, pathIdx, type }
let badgeSigns = [];        // { mesh, pathIdx, side }
let devBadges  = [];        // fetched badge objects
const signGroups = [];      // all sign/billboard groups for post collision
const BILLBOARD_SPACING = 200; // ~1200 units apart
const NUM_BILLBOARDS   = 5;
const ROAD_SIDE_OFFSET = ROAD_WIDTH / 2 + 9; // close to road edge
const OVERHEAD_EVERY   = 4;
const BADGE_SPACING    = 160; // ~960 units apart
const NUM_BADGE_SIGNS  = 4;

// Extract text snippets from markdown body — strip markdown, split to paragraphs
function extractSnippets(markdown = '') {
  const clean = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_`~>]/g, '')
    .trim();
  return clean.split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 60 && p.length < 400);
}

// Draw billboard texture onto a 512×768 canvas
function createBillboardTexture(article, snippet) {
  const W = 512, H = 768;
  const PAD = 16;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fixed section positions
  const SEC = {
    header:  { y: 0,   h: 78  },  // profile pic + username
    title:   { y: 78,  h: 100 },  // article title
    cover:   { y: 178, h: 210 },  // cover image (letterboxed)
    snippet: { y: 396, h: 270 },  // article text
    footer:  { y: 674, h: 94  },  // reactions + reading time
  };

  // ── Background ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#00060f';
  ctx.fillRect(0, 0, W, H);

  // ── Neon border ───────────────────────────────────────────────────────────
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // ── Section dividers ─────────────────────────────────────────────────────
  for (const sec of [SEC.title, SEC.cover, SEC.snippet, SEC.footer]) {
    ctx.fillStyle = '#00aaff22';
    ctx.fillRect(0, sec.y, W, 1);
  }

  // ── HEADER: profile pic + username ───────────────────────────────────────
  const PFP = 52, pfpX = PAD, pfpY = (SEC.header.h - PFP) / 2;
  // Placeholder circle
  ctx.fillStyle = '#000c18';
  ctx.beginPath();
  ctx.arc(pfpX + PFP / 2, pfpY + PFP / 2, PFP / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Username
  ctx.fillStyle = '#00aaff';
  ctx.font = 'bold 22px Courier New, monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('@' + (article.user?.username || 'unknown'), pfpX + PFP + 10, pfpY + PFP / 2 - 8);
  // Tags
  const tags = (article.tag_list || []).slice(0, 3).map(t => '#' + t).join('  ');
  ctx.fillStyle = '#ff2d78';
  ctx.font = '18px Courier New, monospace';
  ctx.fillText(tags, pfpX + PFP + 10, pfpY + PFP / 2 + 14);

  // ── TITLE ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Courier New, monospace';
  ctx.textBaseline = 'top';
  const titleWords = (article.title || '').split(' ');
  let tLine = '', tLines = [];
  for (const w of titleWords) {
    const test = tLine ? tLine + ' ' + w : w;
    if (ctx.measureText(test).width > W - PAD * 2) { tLines.push(tLine); tLine = w; }
    else tLine = test;
  }
  if (tLine) tLines.push(tLine);
  tLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, PAD, SEC.title.y + 10 + i * 30));

  // ── COVER IMAGE (letterboxed) ─────────────────────────────────────────────
  const cx = PAD, cy = SEC.cover.y + 4, cw = W - PAD * 2, ch = SEC.cover.h - 8;
  ctx.fillStyle = '#000a14';
  ctx.fillRect(cx, cy, cw, ch);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const drawImageLetterbox = (img, x, y, maxW, maxH) => {
    const ar = img.width / img.height;
    let dw = maxW, dh = maxW / ar;
    if (dh > maxH) { dh = maxH; dw = maxH * ar; }
    const ox = x + (maxW - dw) / 2;
    const oy = y + (maxH - dh) / 2;
    ctx.drawImage(img, ox, oy, dw, dh);
  };

  if (article.cover_image) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { drawImageLetterbox(img, cx, cy, cw, ch); tex.needsUpdate = true; };
    img.onerror = () => {};
    img.src = article.cover_image;
  } else {
    // No cover: draw a synthwave "start writing" placeholder
    ctx.fillStyle = '#000c18';
    ctx.fillRect(cx, cy, cw, ch);
    // Grid lines
    ctx.strokeStyle = '#00ff8820'; ctx.lineWidth = 1;
    for (let gx = cx; gx < cx + cw; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx, cy + ch); ctx.stroke(); }
    for (let gy = cy; gy < cy + ch; gy += 24) { ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + cw, gy); ctx.stroke(); }
    // Label
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 52px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Click here to', cx + cw / 2, cy + 18);
    ctx.fillText('start writing!', cx + cw / 2, cy + 82);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ── SNIPPET TEXT ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#bf80ff';
  ctx.font = '21px Courier New, monospace';
  ctx.textBaseline = 'top';
  const quotedSnippet = '\u201C' + (snippet || '') + '\u201D';
  const snipWords = quotedSnippet.split(' ');
  let sLine = '', sLines = [];
  for (const w of snipWords) {
    const test = sLine ? sLine + ' ' + w : w;
    if (ctx.measureText(test).width > W - PAD * 2) { sLines.push(sLine); sLine = w; }
    else sLine = test;
  }
  if (sLine) sLines.push(sLine);
  sLines.slice(0, 9).forEach((l, i) => ctx.fillText(l, PAD, SEC.snippet.y + 10 + i * 26));

  // ── FOOTER ────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#000a14';
  ctx.fillRect(0, SEC.footer.y, W, SEC.footer.h);
  ctx.fillStyle = '#ff2d78';
  ctx.font = 'bold 28px Courier New, monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(`♥ ${article.public_reactions_count ?? 0}`, PAD, SEC.footer.y + 14);
  ctx.fillStyle = '#00ffe1';
  ctx.font = '22px Courier New, monospace';
  ctx.fillText(`⏱ ${article.reading_time_minutes ?? '?'} min read`, PAD + 120, SEC.footer.y + 18);

  // ── PROFILE PICTURE (async, drawn over placeholder) ───────────────────────
  const pfpSrc = article.user?.profile_image_90 || article.user?.profile_image;
  if (pfpSrc) {
    const pfp = new window.Image();
    pfp.crossOrigin = 'anonymous';
    pfp.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pfpX + PFP / 2, pfpY + PFP / 2, PFP / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(pfp, pfpX, pfpY, PFP, PFP);
      ctx.restore();
      tex.needsUpdate = true;
    };
    pfp.onerror = () => {};
    pfp.src = pfpSrc;
  }

  return tex;
}

// Landscape texture for overhead (1024×512, 2:1) ─────────────────────────────
function createOverheadBillboardTexture(article, snippet) {
  const W = 1024, H = 512;
  const PAD = 16;
  const FOOTER_H = 72, FOOTER_Y = H - FOOTER_H; // 440
  // Cover: top-right corner, takes 65% width, fixed slot height ~62% of content
  const COVER_X = 360, COVER_SLOT_H = 272;
  const COVER_W = W - COVER_X; // 664px
  // Below-cover strip: full width, from COVER_SLOT_H to FOOTER_Y
  const BELOW_Y = COVER_SLOT_H + PAD;
  const BELOW_H = FOOTER_Y - BELOW_Y; // ~152px
  // Left column text: full height
  const LEFT_W = COVER_X - PAD * 2; // ~328px

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#00060f';
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // ── COVER IMAGE (top-right corner, aspect-correct) ────────────────────────
  ctx.fillStyle = '#000a14';
  ctx.fillRect(COVER_X, 0, COVER_W, COVER_SLOT_H);
  if (article.cover_image) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ar = img.width / img.height;
      let dw = COVER_W, dh = COVER_W / ar;
      if (dh > COVER_SLOT_H) { dh = COVER_SLOT_H; dw = COVER_SLOT_H * ar; }
      // pin to top-right corner
      ctx.drawImage(img, COVER_X + COVER_W - dw, 0, dw, dh);
      tex.needsUpdate = true;
    };
    img.onerror = () => {};
    img.src = article.cover_image;
  } else {
    // No cover: synthwave pencil placeholder
    ctx.fillStyle = '#000c18';
    ctx.fillRect(COVER_X, 0, COVER_W, COVER_SLOT_H);
    ctx.strokeStyle = '#00ff8820'; ctx.lineWidth = 1;
    for (let gx = COVER_X; gx < COVER_X + COVER_W; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, COVER_SLOT_H); ctx.stroke(); }
    for (let gy = 0; gy < COVER_SLOT_H; gy += 20) { ctx.beginPath(); ctx.moveTo(COVER_X, gy); ctx.lineTo(COVER_X + COVER_W, gy); ctx.stroke(); }
    const px2 = COVER_X + COVER_W / 2, py2 = COVER_SLOT_H / 2 - 8;
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Click here to', COVER_X + COVER_W / 2, 12);
    ctx.fillText('start writing!', COVER_X + COVER_W / 2, 66);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ── TITLE (top-left, next to cover) ──────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Courier New, monospace';
  ctx.textBaseline = 'top';
  const tWords = (article.title || '').split(' ');
  let tLine = '', tLines = [];
  for (const w of tWords) {
    const test = tLine ? tLine + ' ' + w : w;
    if (ctx.measureText(test).width > LEFT_W) { tLines.push(tLine); tLine = w; }
    else tLine = test;
  }
  if (tLine) tLines.push(tLine);
  tLines.slice(0, 5).forEach((l, i) => ctx.fillText(l, PAD, PAD + i * 42));

  // ── SNIPPET — full width below cover image ────────────────────────────────
  ctx.fillStyle = '#bf80ff';
  ctx.font = '21px Courier New, monospace';
  const quotedSnip = '\u201C' + (snippet || '') + '\u201D';
  const sWords = quotedSnip.split(' ');
  let sLine = '', sLines = [];
  const fullW = W - PAD * 2;
  for (const w of sWords) {
    const test = sLine ? sLine + ' ' + w : w;
    if (ctx.measureText(test).width > fullW) { sLines.push(sLine); sLine = w; }
    else sLine = test;
  }
  if (sLine) sLines.push(sLine);
  const maxBelow = Math.floor(BELOW_H / 28);
  sLines.slice(0, maxBelow).forEach((l, i) => ctx.fillText(l, PAD, BELOW_Y + i * 28));

  // ── FOOTER (full width) ───────────────────────────────────────────────────
  ctx.fillStyle = '#000a14';
  ctx.fillRect(0, FOOTER_Y, W, FOOTER_H);
  ctx.fillStyle = '#00aaff33';
  ctx.fillRect(0, FOOTER_Y, W, 1);

  const PFP = 48, pfpMid = FOOTER_Y + FOOTER_H / 2;
  ctx.fillStyle = '#000c18';
  ctx.beginPath();
  ctx.arc(PAD + PFP / 2, pfpMid, PFP / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2; ctx.stroke();

  ctx.fillStyle = '#00aaff';
  ctx.font = 'bold 22px Courier New, monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('@' + (article.user?.username || 'unknown'), PAD + PFP + 10, pfpMid - 12);
  ctx.fillStyle = '#ff2d78';
  ctx.font = '18px Courier New, monospace';
  const tags = (article.tag_list || []).slice(0, 3).map(t => '#' + t).join('  ');
  ctx.fillText(tags, PAD + PFP + 10, pfpMid + 14);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff2d78';
  ctx.font = 'bold 28px Courier New, monospace';
  ctx.fillText(`♥ ${article.public_reactions_count ?? 0}`, W - PAD - 220, pfpMid);
  ctx.fillStyle = '#00ffe1';
  ctx.font = '22px Courier New, monospace';
  ctx.fillText(`⏱ ${article.reading_time_minutes ?? '?'} min`, W - PAD, pfpMid);
  ctx.textAlign = 'left';

  const pfpSrc = article.user?.profile_image_90 || article.user?.profile_image;
  if (pfpSrc) {
    const pfp = new window.Image();
    pfp.crossOrigin = 'anonymous';
    pfp.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(PAD + PFP / 2, pfpMid, PFP / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(pfp, PAD, FOOTER_Y + (FOOTER_H - PFP) / 2, PFP, PFP);
      ctx.restore();
      tex.needsUpdate = true;
    };
    pfp.onerror = () => {};
    pfp.src = pfpSrc;
  }

  return tex;
}

// Create a PlaneGeometry with horizontally-flipped UVs for back-facing panels
function createFlippedPlaneGeometry(w, h) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  uv.needsUpdate = true;
  return geo;
}

// Add a back panel sharing the same texture, reads correctly from behind (rotation.y=π already corrects UVs)
function addBackPanel(group, frontPanel, w, h, baseColor) {
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: baseColor })
  );
  back.position.copy(frontPanel.position);
  back.rotation.copy(frontPanel.rotation);
  back.rotation.y += Math.PI;
  group.add(back);
  group.userData.backPanel = back;
  return back;
}

// Build a roadside billboard mesh (post + panel)
function createRoadsideBillboard() {
  const group = new THREE.Group();
  const postMat  = new THREE.MeshLambertMaterial({ color: 0x1a3a5c });
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });

  // Two posts — stop at panel bottom (y=6), spaced apart
  for (const x of [-2.5, 2.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 5.8, 8), postMat);
    post.position.set(x, 2.9, 0);
    group.add(post);
  }
  group.userData.postLocalXs = [-2.5, 2.5];
  group.userData.postRadius  = 0.4;

  // Panel
  const panelGeo = new THREE.PlaneGeometry(11, 16.5);
  const panel = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: 0x001a33 }));
  panel.position.y = 14.25;
  group.add(panel);
  group.userData.panel = panel;
  addBackPanel(group, panel, 11, 16.5, 0x001a33);

  return group;
}

function createOverheadBillboard() {
  const group = new THREE.Group();
  const postMat  = new THREE.MeshLambertMaterial({ color: 0x1a3a5c });

  // Two posts — stop exactly at panel bottom, no intrusion into billboard
  for (const x of [-(ROAD_WIDTH / 2 + 1), (ROAD_WIDTH / 2 + 1)]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 7.3, 8), postMat);
    post.position.set(x, 3.65, 0);
    group.add(post);
  }
  group.userData.postLocalXs = [-(ROAD_WIDTH / 2 + 1), (ROAD_WIDTH / 2 + 1)];
  group.userData.postRadius  = 0.4;

  // Overhead panel — 2:1 landscape ratio to match texture
  const panelGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 4, 6);
  const panel = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: 0x001a33 }));
  panel.position.y = 10.5;
  group.add(panel);
  group.userData.panel = panel;
  addBackPanel(group, panel, ROAD_WIDTH + 4, 6, 0x001a33);

  return group;
}

function placeBillboard(bb, pd, side) {
  const rx =  Math.cos(pd.angle);
  const rz =  Math.sin(pd.angle);
  if (bb.type === 'side') {
    const xOff = side * ROAD_SIDE_OFFSET;
    bb.mesh.position.set(pd.pos.x + rx * xOff, 0, pd.pos.z + rz * xOff);
    bb.mesh.rotation.y = -pd.angle;
  } else {
    bb.mesh.position.set(pd.pos.x, 0, pd.pos.z);
    bb.mesh.rotation.y = -pd.angle;
  }
}

function assignBillboardArticle(bb) {
  if (!devArticles.length) return;
  const art = devArticles[Math.floor(Math.random() * devArticles.length)];
  const snippets = art._snippets || [''];
  const snippet  = snippets[Math.floor(Math.random() * snippets.length)] || art.description || '';
  const tex = bb.type === 'overhead'
    ? createOverheadBillboardTexture(art, snippet)
    : createBillboardTexture(art, snippet);
  bb.mesh.userData.panel.material = new THREE.MeshBasicMaterial({ map: tex });
  bb.mesh.userData.panel.userData.articleUrl = art.url;
  if (bb.mesh.userData.backPanel) {
    bb.mesh.userData.backPanel.material = new THREE.MeshBasicMaterial({ map: tex });
  }
}

// Returns true if pathIdx is too close to any building strip
function clashesWithBuilding(idx) {
  return buildingStrips.some(b => Math.abs(b.pathIdx - idx) <= 2);
}

// Advance idx until it doesn't clash with a building
function safePathIdx(idx) {
  while (clashesWithBuilding(idx)) idx++;
  return idx;
}

// Initialise billboard pool (hidden until articles load)
function initBillboards() {
  for (let i = 0; i < NUM_BILLBOARDS; i++) {
    const isOverhead = (i % OVERHEAD_EVERY === 0);
    const type  = isOverhead ? 'overhead' : 'side';
    const mesh  = isOverhead ? createOverheadBillboard() : createRoadsideBillboard();
    const side  = (i % 2 === 0) ? 1 : -1;
    const pathIdx = safePathIdx((i + 2) * BILLBOARD_SPACING);
    if (pathIdx >= pathData.length) growPath(pathIdx + 4 - pathData.length);
    placeBillboard({ mesh, type }, pathData[pathIdx], side);
    mesh.visible = false;
    scene.add(mesh);
    billboardPool.push({ mesh, type, pathIdx, side });
    signGroups.push(mesh);
  }
}
initBillboards();

// Called after articles load — assign textures + show
function activateBillboards() {
  for (const bb of billboardPool) {
    assignBillboardArticle(bb);
    bb.mesh.visible = true;
  }
}

// ─── Username UI ──────────────────────────────────────────────────────────────
const overlay     = document.getElementById('overlay');
const usernameInput = document.getElementById('username-input');
const startBtn    = document.getElementById('start-btn');
const statusEl    = document.getElementById('overlay-status');
const errorEl     = document.getElementById('overlay-error');

// ─── Stat Traffic Signs ───────────────────────────────────────────────────────
function buildStatCards(userInfo, articles) {
  const totalReactions = articles.reduce((s, a) => s + (a.public_reactions_count || 0), 0);
  const totalReadTime  = articles.reduce((s, a) => s + (a.reading_time_minutes || 0), 0);
  const topArticle     = [...articles].sort((a, b) => (b.public_reactions_count || 0) - (a.public_reactions_count || 0))[0];
  const tagCount = {};
  articles.forEach(a => (a.tag_list || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => '#' + t);

  return [
    { icon: '📝', label: 'Articles', value: String(articles.length) },
    { icon: '♥', label: 'Total Reactions', value: String(totalReactions) },
    { icon: '⏱', label: 'Total Read Time', value: totalReadTime + ' min' },
    { icon: '🏆', label: 'Top Article', value: topArticle?.title || '', coverImage: topArticle?.cover_image || null },
    { icon: '🏷', label: 'Top Tags', value: topTags.join(' ') },
    { icon: '📅', label: 'Member Since', value: userInfo.joined_at || '' },
  ];
}

function createStatSignTexture(stat) {
  const W = 320, H = 220;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#002200';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const HEADER_H = 46;
  const IMG_AREA_Y = HEADER_H + 6;
  const IMG_AREA_W = W - 24;
  const IMG_AREA_H = 90; // smaller image slot
  const TEXT_Y = IMG_AREA_Y + IMG_AREA_H + 6;

  function drawContent() {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 20px Courier New, monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(stat.icon + '  ' + stat.label, W / 2, 14);
    ctx.fillStyle = '#00ff8866';
    ctx.fillRect(16, HEADER_H, W - 32, 2);

    if (stat.coverImage) {
      ctx.fillStyle = '#001100';
      ctx.fillRect(12, IMG_AREA_Y, IMG_AREA_W, IMG_AREA_H);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Courier New, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const words = stat.value.split(' ');
      let line = '', lines = [];
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > W - 24) { lines.push(line); line = w; }
        else line = test;
      }
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 12, TEXT_Y + i * 19));
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Courier New, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const words = stat.value.split(' ');
      let line = '', lines = [];
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > W - 28) { lines.push(line); line = w; }
        else line = test;
      }
      if (line) lines.push(line);
      const totalH = lines.length * 36;
      const startY = (H + HEADER_H) / 2 - totalH / 2 + 18;
      lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * 36));
    }
  }

  if (stat.coverImage) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawContent();
      const ar = img.width / img.height;
      let dw = IMG_AREA_W, dh = IMG_AREA_W / ar;
      if (dh > IMG_AREA_H) { dh = IMG_AREA_H; dw = IMG_AREA_H * ar; }
      ctx.drawImage(img, 12 + (IMG_AREA_W - dw) / 2, IMG_AREA_Y + (IMG_AREA_H - dh) / 2, dw, dh);
      tex.needsUpdate = true;
    };
    img.onerror = () => { stat.coverImage = null; drawContent(); tex.needsUpdate = true; };
    img.src = stat.coverImage;
  } else {
    drawContent();
  }

  return tex;
}

function createStatSignMesh() {
  const group = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0x1a3a5c });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.0, 8), postMat);
  post.position.y = 1.5;
  group.add(post);
  group.userData.postLocalXs = [0];
  group.userData.postRadius  = 0.2;
  // Panel aspect: 320:220 = 16:11
  const panelGeo = new THREE.PlaneGeometry(4, 2.75);
  const panel = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: 0x002200 }));
  panel.position.y = 4.5;
  group.add(panel);
  group.userData.panel = panel;
  addBackPanel(group, panel, 4, 2.75, 0x002200);
  return group;
}

function placeStatSign(bs, pd) {
  const rx = Math.cos(pd.angle), rz = Math.sin(pd.angle);
  const xOff = bs.side * (ROAD_WIDTH / 2 + 3);
  bs.mesh.position.set(pd.pos.x + rx * xOff, 0, pd.pos.z + rz * xOff);
  bs.mesh.rotation.y = -pd.angle;
}

let _statRoundRobin = 0;
function assignStatSign(bs) {
  if (!devBadges.length) return;
  const stat = devBadges[_statRoundRobin % devBadges.length];
  _statRoundRobin++;
  const tex = createStatSignTexture(stat);
  bs.mesh.userData.panel.material = new THREE.MeshBasicMaterial({ map: tex });
  if (bs.mesh.userData.backPanel) {
    bs.mesh.userData.backPanel.material = new THREE.MeshBasicMaterial({ map: tex });
  }
}

function initStatSigns() {
  const startIdx = CAR_START_IDX + BADGE_SPACING;
  for (let i = 0; i < NUM_BADGE_SIGNS; i++) {
    const pathIdx = startIdx + i * BADGE_SPACING;
    if (pathIdx >= pathData.length) growPath(pathIdx + 2 - pathData.length);
    const mesh = createStatSignMesh();
    const side = (i % 2 === 0) ? 1 : -1;
    const bs = { mesh, pathIdx, side };
    placeStatSign(bs, pathData[pathIdx]);
    assignStatSign(bs);
    scene.add(mesh);
    badgeSigns.push(bs);
    signGroups.push(mesh);
  }
}


// ─── Welcome Sign ────────────────────────────────────────────────────────────
function createWelcomeSignTexture(username, articleCount) {
  const W = 640, H = 380;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#001a00';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#ccffcc';
  ctx.font = 'bold 34px Courier New, monospace';
  ctx.fillText('WELCOME TO THE', W / 2, 38);

  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 40px Courier New, monospace';
  ctx.fillText('DEV DRIVE OF', W / 2, 88);

  ctx.fillStyle = '#ffe44d';
  ctx.font = 'bold 54px Courier New, monospace';
  ctx.fillText('@' + username, W / 2, 148);

  ctx.strokeStyle = '#00ff8855'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, 222); ctx.lineTo(W - 40, 222); ctx.stroke();

  ctx.fillStyle = '#aaffcc';
  ctx.font = '26px Courier New, monospace';
  if (articleCount === 0) {
    ctx.fillText('★  no articles yet  ★', W / 2, 238);
  } else {
    ctx.fillText('★  ' + articleCount + ' articles on DEV.to  ★', W / 2, 238);
  }

  ctx.fillStyle = '#ffffff66';
  ctx.font = '20px Courier New, monospace';
  if (articleCount === 0) {
    ctx.fillText("let's change that — check the billboards", W / 2, 294);
  } else {
    ctx.fillText('buckle up and enjoy the ride', W / 2, 294);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function placeWelcomeScene(username, articleCount) {
  // Place sign + fox just ahead of the car's start position
  const signIdx = CAR_START_IDX + 10;
  const pd      = pathData[signIdx];
  const rx = Math.cos(pd.angle), rz = Math.sin(pd.angle);

  // ── Sign (right side of road) ──
  const postMat = new THREE.MeshLambertMaterial({ color: 0x1a4a1a });
  const signGroup = new THREE.Group();
  // Posts stop exactly at panel bottom (panel center y=7.2, half-height=2.675 → bottom=4.525)
  for (const px of [-2.0, 2.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.5, 8), postMat);
    post.position.set(px, 2.25, 0); signGroup.add(post);
  }
  const welcomeTex = createWelcomeSignTexture(username, articleCount);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 5.35), new THREE.MeshBasicMaterial({ map: welcomeTex }));
  panel.position.y = 7.2; signGroup.add(panel);
  // Back panel with flipped UVs — same texture, reads correctly from behind
  const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 5.35), new THREE.MeshBasicMaterial({ map: welcomeTex }));
  backPanel.position.y = 7.2;
  backPanel.rotation.y = Math.PI;
  signGroup.add(backPanel);
  const sideOff = ROAD_WIDTH / 2 + 5.5;
  signGroup.userData.postLocalXs = [-2.0, 2.0];
  signGroup.userData.postRadius  = 0.2;
  signGroup.position.set(pd.pos.x + rx * sideOff, 0, pd.pos.z + rz * sideOff);
  signGroup.rotation.y = -pd.angle;
  scene.add(signGroup);
  signGroups.push(signGroup);
}

async function fetchArticles(username) {
  currentUsername = username;
  statusEl.textContent = 'Fetching articles…';
  errorEl.textContent  = '';
  startBtn.disabled    = true;

  try {
    const res  = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=1000`);
    if (!res.ok) throw new Error(`DEV.to API error: ${res.status}`);
    const list = await res.json();
    if (!list.length) {
      // No articles — motivational mode: use MOTIVATIONAL_MESSAGES as fake articles
      statusEl.textContent = `No articles yet for @${username}. Showing some inspiration…`;
      const fakeArticles = MOTIVATIONAL_MESSAGES.map((msg, i) => ({
        id: i,
        title: msg.title,
        description: msg.description,
        _snippets: [msg.description],
        url: 'https://dev.to/new',
        cover_image: null,
        tag_list: ['writing', 'beginners', 'motivation'],
        public_reactions_count: 0,
        reading_time_minutes: 1,
      }));
      devArticles = fakeArticles;
      activateBillboards();
      placeWelcomeScene(username, 0);
      // No stat signs for motivational mode
      overlay.style.transition = 'opacity 0.6s';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; exitBtn.style.display = 'block'; }, 650);
      return;
    }

    statusEl.textContent = `Found ${list.length} articles. Loading content…`;

    // Fetch full body for snippets — sequential with delay to avoid 429
    const toFetch = list.slice(0, 10);
    for (const art of toFetch) {
      try {
        const r = await fetch(`https://dev.to/api/articles/${art.id}`);
        if (r.status === 429) { art._snippets = [art.description || '']; continue; }
        const full = await r.json();
        art._snippets = extractSnippets(full.body_markdown || '');
      } catch { art._snippets = []; }
      await new Promise(res => setTimeout(res, 350));
    }
    // Remaining articles get description as fallback snippet
    list.slice(10).forEach(art => { art._snippets = art.description ? [art.description] : ['']; });

    devArticles = list;
    activateBillboards();
    placeWelcomeScene(username, list.length);

    // Fetch badges and place as traffic signs
    try {
      const userRes = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`);
      if (userRes.ok) {
        const userInfo = await userRes.json();
        devBadges = userInfo.badge_achievements || [];
        console.log(`[badges] full user object:`, JSON.stringify(userInfo, null, 2));
        console.log(`[badges] found ${devBadges.length}`, devBadges);
        // Build stat cards from user info + articles
        devBadges = buildStatCards(userInfo, devArticles);
        initStatSigns();
      }
    } catch { /* badges optional */ }

    // Hide overlay
    overlay.style.transition = 'opacity 0.6s';
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; exitBtn.style.display = 'block'; shareBtn.style.display = 'block'; }, 650);

  } catch (err) {
    errorEl.textContent  = err.message;
    statusEl.textContent = '';
    startBtn.disabled    = false;
  }
}

startBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) { errorEl.textContent = 'Please enter a username.'; return; }
  fetchArticles(username);
});
usernameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') startBtn.click();
});

const exitBtn = document.getElementById('exit-btn');
exitBtn.addEventListener('click', () => {
  location.href = location.origin + location.pathname;
});

const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?user=${encodeURIComponent(currentUsername)}`;
  navigator.clipboard.writeText(url).then(() => {
    shareBtn.textContent = 'COPIED!';
    shareBtn.classList.add('copied');
    setTimeout(() => { shareBtn.textContent = 'SHARE JOURNEY'; shareBtn.classList.remove('copied'); }, 2000);
  });
});

// ─── Auto-fill from URL (?user=username) — user still clicks Start ───────────
const urlUser = new URLSearchParams(location.search).get('user');
if (urlUser) usernameInput.value = urlUser;

animate();
