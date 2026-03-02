import { carState } from './car.js';
import { camState, updateCamHUD } from './camera.js';
import { updateGearHUD, toggleControls } from './ui.js';

// ─── Keyboard state ──────────────────────────────────────────────────────────
export const keys = { left: false, right: false, up: false, down: false, lookBack: false };

// ─── Gamepad ─────────────────────────────────────────────────────────────────
export function getGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < pads.length; i++) { if (pads[i]) return pads[i]; }
  return null;
}

let _prevCamBtn = false;

export function getInputs() {
  let steer    = 0;
  let throttle = 0;
  let brake    = 0;

  if (keys.left)  steer    -= 1;
  if (keys.right) steer    += 1;
  if (keys.up)    throttle  = 1;
  if (keys.down)  brake     = 1;

  const gp = getGamepad();
  if (gp) {
    const axis = gp.axes[0];
    if (Math.abs(axis) > 0.1) steer = axis;
    const gpThrottle = gp.buttons[7]?.value ?? 0;
    const gpBrake    = gp.buttons[6]?.value ?? 0;
    if (gpThrottle > 0) throttle = gpThrottle;
    if (gpBrake    > 0) brake    = gpBrake;

    // Y / Triangle — cycle camera (edge-triggered)
    const camBtn = gp.buttons[3]?.pressed ?? false;
    if (camBtn && !_prevCamBtn) {
      const modes = ['chase', 'interior', 'side'];
      const idx = modes.indexOf(camState.mode);
      camState.mode = modes[(idx + 1) % modes.length];
      updateCamHUD();
    }
    _prevCamBtn = camBtn;
  }

  return { steer, throttle, brake };
}

// ─── Keyboard handlers ───────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  keys.left  = true;
  if (e.key === 'ArrowRight') keys.right = true;
  if (e.key === 'ArrowUp')    keys.up    = true;
  if (e.key === 'ArrowDown')  keys.down  = true;
  if (e.key === 'v' || e.key === 'V') keys.lookBack = true;
  if (e.key === 'p' || e.key === 'P') { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'P'; carState.speed = 0; updateGearHUD(carState.gear); } }
  if (e.key === 'd' || e.key === 'D') { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'D'; updateGearHUD(carState.gear); } }
  if (e.key === 'r' || e.key === 'R') { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'R'; updateGearHUD(carState.gear); } }
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
  if (e.key === 'h' || e.key === 'H') toggleControls();
});

window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft')  keys.left  = false;
  if (e.key === 'ArrowRight') keys.right = false;
  if (e.key === 'ArrowUp')    keys.up    = false;
  if (e.key === 'ArrowDown')  keys.down  = false;
  if (e.key === 'v' || e.key === 'V') keys.lookBack = false;
});
