import * as THREE from 'three';
import { camera, renderer } from './scene.js';
import { car } from './car.js';

// ─── Camera State ─────────────────────────────────────────────────────────────
export const camState = { mode: 'chase' };
export const orbit = { active: false, phi: Math.PI / 6, theta: Math.PI, radius: 12, lastX: 0, lastY: 0 };

export function initOrbitFromCamera() {
  const dx = camera.position.x - car.position.x;
  const dy = camera.position.y - car.position.y;
  const dz = camera.position.z - car.position.z;
  orbit.radius = Math.max(4, Math.sqrt(dx*dx + dy*dy + dz*dz));
  orbit.phi    = Math.max(0.05, Math.min(Math.PI / 2, Math.acos(dy / orbit.radius)));
  orbit.theta  = Math.atan2(dx, dz);
}

// ─── Camera HUD ──────────────────────────────────────────────────────────────
export const camHUD = document.createElement('div');
camHUD.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);font:16px monospace;opacity:0.9;pointer-events:none;text-align:center;';
camHUD.innerHTML = `
<span id="cam-mode-label" style="color:#00aaff;"></span>
<span style="color:#ffffff33;margin:0 12px;">|</span>
<span style="color:#ffe44d;font-weight:bold;background:#ffe44d22;padding:3px 12px;border-radius:3px;border:1px solid #ffe44d66;">[ H ] Show Controls</span>`;
document.body.appendChild(camHUD);

export function updateCamHUD() {
  const labels = { chase: '🎥 Chase', interior: '🪟 Interior', side: '↔ Side', orbit: '🔄 Orbit' };
  camHUD.querySelector('#cam-mode-label').textContent = labels[camState.mode];
}
updateCamHUD();

// ─── Orbit mouse handlers ────────────────────────────────────────────────────
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
