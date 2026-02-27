import * as THREE from 'three';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0221);
scene.fog = new THREE.Fog(0x0d0221, 60, 160);

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
  for (let i = 0; i < 10; i++) {
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
  ctx.fillStyle = '#0d0d1a';
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
    const xOff = side * (ROAD_WIDTH / 2 + 12 + Math.random() * 8);

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
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.5),
          new THREE.MeshBasicMaterial({ color: neonColors[Math.floor(Math.random() * 4)] })
        );
        win.position.set((col - 0.5) * 2, -h / 2 + 2 + row * 3.5, d / 2 + 0.08);
        building.add(win);
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
  for (const x of [-0.72, 0.72]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.14, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xff2200 })
    );
    tail.position.set(x, 0.74, 2.22);
    group.add(tail);
  }
  const tailGlow = new THREE.PointLight(0xff2200, 4, 7);
  tailGlow.position.set(0, 0.74, 2.5);
  group.add(tailGlow);

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
  const dashMat  = new THREE.MeshLambertMaterial({ color: 0x0a0010 });
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

  // Steering column
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.30, 8), dashMat);
  col.rotation.x = Math.PI / 5;
  col.position.set(-0.22, 1.05, -0.72);
  group.add(col);

  // Steering wheel (torus)
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), dashMat);
  wheelRing.position.set(-0.22, 1.18, -0.84);
  wheelRing.rotation.x = Math.PI / 5;
  group.add(wheelRing);

  // Spokes
  for (const angle of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), dashMat);
    spoke.rotation.z = angle;
    wheelRing.add(spoke);
  }

  group.userData.steeringWheel = wheelRing;

  return group;
}

const car = createCar();
car.position.set(0, 0, 0);
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

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button === 2) { orbit.active = true; orbit.lastX = e.clientX; orbit.lastY = e.clientY; camState.mode = 'orbit'; updateCamHUD(); }
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

function updateCamHUD() {
  const labels = { chase: '🎥 Chase', interior: '🪟 Interior', side: '↔ Side', orbit: '🔄 Orbit' };
  camHUD.textContent = labels[camState.mode] + '  [C/Y] cycle  [RMB] orbit  [V/R3] look back';
}
const camHUD = document.createElement('div');
camHUD.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#00aaff;font:13px monospace;opacity:0.7;pointer-events:none;';
document.body.appendChild(camHUD);
updateCamHUD();

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === 'ArrowUp'    || e.key === 'w') keys.up    = true;
  if (e.key === 'ArrowDown'  || e.key === 's') keys.down  = true;
  if (e.key === 'v' || e.key === 'V') keys.lookBack = true;
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
  if (e.key === 'ArrowLeft'  || e.key === 'a') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  if (e.key === 'ArrowUp'    || e.key === 'w') keys.up    = false;
  if (e.key === 'ArrowDown'  || e.key === 's') keys.down  = false;
  if (e.key === 'v' || e.key === 'V') keys.lookBack = false;
});

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
  const gp = navigator.getGamepads?.()[0];
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
};

const CAR = {
  maxSpeed:     0.3,
  acceleration: 0.002,  // slower build-up
  brakeForce:   0.004,  // gentler braking
  friction:     0.002,  // softer coast-down
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

  // Progressive speed
  if (throttle > 0) {
    carState.speed = Math.min(carState.speed + CAR.acceleration * throttle, CAR.maxSpeed);
  } else if (brake > 0) {
    carState.speed = Math.max(carState.speed - CAR.brakeForce * brake, 0);
  } else {
    carState.speed = Math.max(carState.speed - CAR.friction, 0); // natural slowdown
  }

  // Smooth steering — turn radius scales with speed so it feels natural
  carState.steer += (steer - carState.steer) * 0.1;
  carState.angle += carState.steer * carState.speed * CAR.turnSpeed;

  // Move car in direction it's facing
  car.position.x += Math.sin(carState.angle) * carState.speed;
  car.position.z -= Math.cos(carState.angle) * carState.speed;

  // Rotate car mesh to match heading + body roll
  car.rotation.y = -carState.angle;
  car.rotation.z =  carState.steer * 0.08; // subtle body roll

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
  const gpCam = navigator.getGamepads?.()[0];
  const gpLookBack = gpCam?.buttons[11]?.pressed ?? false;
  const lookBack = keys.lookBack || gpLookBack;
  if (gpCam) {
    const rx = gpCam.axes[2] ?? 0;
    const ry = gpCam.axes[3] ?? 0;
    if (Math.abs(rx) > 0.1 || Math.abs(ry) > 0.1) {
      if (camState.mode !== 'orbit') { camState.mode = 'orbit'; updateCamHUD(); }
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

  renderer.render(scene, camera);
}
animate();
