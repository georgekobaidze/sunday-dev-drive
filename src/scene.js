import * as THREE from 'three';

// ─── Renderer ────────────────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000015);
scene.fog = new THREE.Fog(0x000015, 60, 160);

// ─── Camera ──────────────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
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

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ff1a00');
  grad.addColorStop(0.5, '#ff6600');
  grad.addColorStop(1, '#ffdd00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 230, Math.PI, 0);
  ctx.fill();

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
export const synthwaveSun = createSynthwaveSun();
scene.add(synthwaveSun);

// ─── Ground ──────────────────────────────────────────────────────────────────
export const ground = new THREE.Mesh(
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

  let x = 0;
  while (x < W) {
    const w = rng(18, 60);
    const h = rng(40, H * 0.88);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, H - h, w, h);

    const nc = neons[Math.floor(Math.random() * neons.length)];
    ctx.fillStyle = nc;
    ctx.fillRect(x, H - h, 2, h);

    const winColor = neons[Math.floor(Math.random() * neons.length)];
    ctx.fillStyle = winColor;
    for (let wy = H - h + 6; wy < H - 6; wy += rng(8, 14)) {
      for (let wx = x + 4; wx < x + w - 4; wx += rng(5, 10)) {
        if (Math.random() > 0.45) ctx.fillRect(wx, wy, 2, 6);
      }
    }

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
export const skylineMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(260, 260, skylineH, 64, 1, true),
  new THREE.MeshBasicMaterial({ map: skylineTex, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false })
);
skylineMesh.position.y = skylineH / 2;
scene.add(skylineMesh);

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
