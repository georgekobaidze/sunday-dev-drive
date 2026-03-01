// ─── DOM element references ──────────────────────────────────────────────────
export const overlay      = document.getElementById('overlay');
export const usernameInput = document.getElementById('username-input');
export const startBtn     = document.getElementById('start-btn');
export const statusEl     = document.getElementById('overlay-status');
export const errorEl      = document.getElementById('overlay-error');
export const progressWrap = document.getElementById('progress-bar-wrap');
export const progressBar  = document.getElementById('progress-bar');
export const exitBtn      = document.getElementById('exit-btn');
export const shareBtn     = document.getElementById('share-btn');
export const testDriveBtn = document.getElementById('test-drive-btn');

// ─── Progress bar ────────────────────────────────────────────────────────────
export function setProgress(value) {
  if (value <= 0) { progressWrap.style.display = 'none'; progressBar.style.width = '0%'; return; }
  progressWrap.style.display = 'block';
  progressBar.style.width = `${Math.round(value * 100)}%`;
}

// ─── Gear HUD ────────────────────────────────────────────────────────────────
export const gearHUD = document.createElement('div');
gearHUD.style.cssText = 'position:fixed;top:20px;right:24px;display:flex;gap:10px;pointer-events:none;font:bold 22px Courier New,monospace;';
document.body.appendChild(gearHUD);

export function updateGearHUD(gear) {
  gearHUD.innerHTML = ['P','R','D'].map(g => {
    const active = g === gear;
    const colors = { D: '#00aaff', R: '#ff2d78', P: '#ffe44d' };
    const style = active
      ? `color:${colors[g]};text-shadow:0 0 10px ${colors[g]};border:2px solid ${colors[g]};padding:4px 10px;border-radius:4px;`
      : `color:#444;border:2px solid #222;padding:4px 10px;border-radius:4px;`;
    return `<span style="${style}">${g}</span>`;
  }).join('');
}

// ─── Controls panel ──────────────────────────────────────────────────────────
export const controlsPanel = document.createElement('div');
controlsPanel.style.cssText = `
  position:fixed;bottom:48px;left:50%;transform:translateX(-50%);
  background:#000000dd;border:1px solid #00aaff66;border-radius:8px;
  color:#ccc;font:15px 'Courier New',monospace;padding:22px 36px;
  pointer-events:none;
  grid-template-columns:1fr 1fr;gap:10px 56px;
  white-space:nowrap;
`;
const KB = '#00ffe1', GP = '#bf80ff', LBL = '#ffffff88';
controlsPanel.innerHTML = `
  <div style="color:${KB};font-weight:bold;margin-bottom:6px;font-size:16px;">⌨ Keyboard</div>
  <div style="color:${GP};font-weight:bold;margin-bottom:6px;font-size:16px;">🎮 Controller</div>

  <div><span style="color:${LBL};">Accelerate &nbsp;</span>↑</div>
  <div><span style="color:${LBL};">Accelerate &nbsp;</span>RT</div>

  <div><span style="color:${LBL};">Brake &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>↓</div>
  <div><span style="color:${LBL};">Brake &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>LT</div>

  <div><span style="color:${LBL};">Steer &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>← →</div>
  <div><span style="color:${LBL};">Steer &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>Left Stick</div>

  <div><span style="color:${LBL};">Drive &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>D</div>
  <div><span style="color:${LBL};">Drive &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>D-Pad ↑</div>

  <div><span style="color:${LBL};">Reverse &nbsp;&nbsp;&nbsp;&nbsp;</span>R</div>
  <div><span style="color:${LBL};">Reverse &nbsp;&nbsp;&nbsp;&nbsp;</span>D-Pad ↓</div>

  <div><span style="color:${LBL};">Park &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>P</div>
  <div><span style="color:${LBL};">Park &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>D-Pad ←</div>

  <div><span style="color:${LBL};">Cycle Camera</span>  C</div>
  <div><span style="color:${LBL};">Cycle Camera</span>  Y / △</div>

  <div><span style="color:${LBL};">Look Back &nbsp;&nbsp;</span>V (hold)</div>
  <div><span style="color:${LBL};">Look Back &nbsp;&nbsp;</span>R3 (hold)</div>

  <div><span style="color:${LBL};">Orbit Camera</span>  RMB + drag</div>
  <div><span style="color:${LBL};">Orbit Camera</span>  Right Stick</div>

  <div><span style="color:${LBL};">Open Article</span>  Click billboard</div>
  <div style="color:#ffffff33;"><span style="color:${LBL};">Open Article</span>  —</div>
`;
controlsPanel.style.display = 'none';
document.body.appendChild(controlsPanel);

export let controlsVisible = false;
export function toggleControls() {
  controlsVisible = !controlsVisible;
  controlsPanel.style.display = controlsVisible ? 'grid' : 'none';
}
