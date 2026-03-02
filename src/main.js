import * as THREE from 'three';

// ─── Module imports ──────────────────────────────────────────────────────────
import { renderer, scene, camera, ground, synthwaveSun, skylineMesh } from './scene.js';
import {
  SEGMENT_LEN, ROAD_WIDTH, pathData, growPath,
  RIBBON_WINDOW, ribbonStartIdx, lastRebuildCarPos,
  setRibbonStartIdx, rebuildRibbon, isOnRoad,
} from './road.js';
import { buildingStrips, BUILDING_SPACING, placeBuildingStrip } from './buildings.js';
import { car, carState, CAR, headlights } from './car.js';
import { camState, orbit, initOrbitFromCamera, updateCamHUD } from './camera.js';
import { updateGearHUD, overlay, usernameInput, startBtn, exitBtn, shareBtn, testDriveBtn } from './ui.js';
import { keys, getInputs, getGamepad } from './input.js';
import {
  billboardPool, signGroups, BILLBOARD_SPACING,
  placeBillboard, assignBillboardArticle, safePathIdx,
} from './billboards.js';
import { badgeSigns, devBadges, assignStatSign, placeStatSign, BADGE_SPACING } from './stats.js';
import { fetchArticles, startDemoMode, devArticles, currentUsername } from './api.js';

// ─── Initial gear HUD ───────────────────────────────────────────────────────
updateGearHUD(carState.gear);

// ─── Event wiring ────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) { document.getElementById('overlay-error').textContent = 'Please enter a username.'; return; }
  fetchArticles(username);
});
usernameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') startBtn.click();
});
testDriveBtn.addEventListener('click', startDemoMode);
exitBtn.addEventListener('click', () => {
  location.href = location.origin + location.pathname;
});
shareBtn.addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?user=${encodeURIComponent(currentUsername)}`;
  navigator.clipboard.writeText(url).then(() => {
    shareBtn.textContent = 'COPIED!';
    shareBtn.classList.add('copied');
    setTimeout(() => { shareBtn.textContent = 'SHARE JOURNEY'; shareBtn.classList.remove('copied'); }, 2000);
  });
});

// Auto-fill from URL (?user=username)
const urlUser = new URLSearchParams(location.search).get('user');
if (urlUser) usernameInput.value = urlUser;

// ─── Animate loop ────────────────────────────────────────────────────────────
let _prevDUp = false, _prevDDown = false, _prevDLeft = false;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const dt = delta * 60;

  const { steer, throttle, brake } = getInputs();

  // Gear-based movement
  if (carState.gear === 'P') {
    carState.speed = 0;
  } else if (carState.gear === 'D') {
    if (throttle > 0 && brake > 0) {
      const struggle = CAR.maxSpeed * 0.08;
      carState.speed += (struggle - carState.speed) * (1 - Math.pow(0.96, dt));
    } else if (throttle > 0) {
      const speedRatio = carState.speed / CAR.maxSpeed;
      const effectiveAccel = CAR.acceleration * throttle * (1 - speedRatio * 0.85);
      carState.speed = Math.min(carState.speed + effectiveAccel * dt, CAR.maxSpeed);
    } else if (brake > 0) {
      carState.speed = Math.max(carState.speed - CAR.brakeForce * brake * dt, 0);
    } else {
      carState.speed = Math.max(carState.speed - CAR.friction * dt, 0);
    }
  } else if (carState.gear === 'R') {
    if (throttle > 0) {
      carState.speed = Math.max(carState.speed - CAR.acceleration * throttle * dt, -CAR.maxSpeed * 0.5);
    } else if (brake > 0) {
      carState.speed = Math.min(carState.speed + CAR.brakeForce * brake * dt, 0);
    } else {
      carState.speed = Math.min(carState.speed + CAR.friction * dt, 0);
    }
  }

  // Gamepad DPad gear shifting (edge-triggered)
  const gpGear = getGamepad();
  if (gpGear) {
    const dUp   = gpGear.buttons[12]?.pressed ?? false;
    const dDown = gpGear.buttons[13]?.pressed ?? false;
    const dLeft = gpGear.buttons[14]?.pressed ?? false;
    if (dUp   && !_prevDUp)   { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'D'; updateGearHUD(carState.gear); } }
    if (dDown && !_prevDDown) { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'R'; updateGearHUD(carState.gear); } }
    if (dLeft && !_prevDLeft) { if (Math.abs(carState.speed) < 0.01) { carState.gear = 'P'; carState.speed = 0; updateGearHUD(carState.gear); } }
    _prevDUp   = dUp;
    _prevDDown = dDown;
    _prevDLeft = dLeft;
  }

  // Smooth steering
  const steerDir = carState.gear === 'R' ? -steer : steer;
  carState.steer += (steerDir - carState.steer) * (1 - Math.pow(0.9, dt));
  carState.angle += carState.steer * Math.abs(carState.speed) * CAR.turnSpeed * dt;

  // Move car
  car.position.x += Math.sin(carState.angle) * carState.speed * dt;
  car.position.z -= Math.cos(carState.angle) * carState.speed * dt;
  car.rotation.y = -carState.angle;
  car.rotation.z =  carState.steer * 0.08;

  // Brake / reverse lights
  const isBraking = brake > 0;
  const isInterior = camState.mode === 'interior';
  for (const m of car.userData.tailLights) m.material.color.setHex(isBraking ? 0xff2200 : 0x550800);
  car.userData.tailGlow.intensity = isInterior ? 0 : (isBraking ? 40 : 3);
  car.userData.tailGlow.distance  = isBraking ? 14 : 7;

  const isReversing = carState.gear === 'R';
  for (const m of car.userData.reverseLights) m.material.color.setHex(isReversing ? 0xffffff : 0x111111);
  car.userData.reverseGlow.intensity = (isReversing && !isInterior) ? 6 : 0;

  // Headlights
  const hlOffset = 8;
  for (let i = 0; i < headlights.length; i++) {
    const side = i === 0 ? -0.6 : 0.6;
    headlights[i].position.set(
      car.position.x + Math.sin(carState.angle) * hlOffset + Math.cos(carState.angle) * side,
      0.4,
      car.position.z - Math.cos(carState.angle) * hlOffset + Math.sin(carState.angle) * side
    );
  }

  // Ribbon rebuild
  if (car.position.distanceTo(lastRebuildCarPos) > SEGMENT_LEN * 30) {
    let nearestIdx = ribbonStartIdx;
    let nearestDist = Infinity;
    const searchEnd = Math.min(pathData.length - 1, ribbonStartIdx + RIBBON_WINDOW);
    for (let i = ribbonStartIdx; i < searchEnd; i++) {
      const d = car.position.distanceTo(pathData[i].pos);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    setRibbonStartIdx(Math.max(0, nearestIdx - 100));
    rebuildRibbon(car.position);
  }

  // Off-road effects
  if (!isOnRoad(car.position)) {
    carState.speed *= Math.pow(0.97, dt);
    camera.position.x += (Math.random() - 0.5) * 0.06;
    camera.position.y += (Math.random() - 0.5) * 0.04;
  }

  // Hard lateral boundary
  {
    const MAX_LATERAL = ROAD_WIDTH / 2 + 12;
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
      carState.speed *= 0.5;
    }
  }

  // Post collision
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

  // Sun / skyline / ground follow camera/car
  synthwaveSun.position.set(camera.position.x, 14, camera.position.z - 140);
  skylineMesh.position.x = camera.position.x;
  skylineMesh.position.z = camera.position.z;
  ground.position.x = car.position.x;
  ground.position.z = car.position.z;

  // Gamepad look-back + right-stick orbit
  const gpCam = getGamepad();
  const gpLookBack = gpCam?.buttons[11]?.pressed ?? false;
  const lookBack = keys.lookBack || gpLookBack;
  if (gpCam) {
    const rx = gpCam.axes[2] ?? 0;
    const ry = gpCam.axes[3] ?? 0;
    if (Math.abs(rx) > 0.1 || Math.abs(ry) > 0.1) {
      if (camState.mode !== 'orbit') { initOrbitFromCamera(); camState.mode = 'orbit'; updateCamHUD(); }
      orbit.theta -= rx * 0.03 * dt;
      orbit.phi = Math.max(0.05, Math.min(Math.PI / 2, orbit.phi - ry * 0.03 * dt));
    }
  }

  // Camera modes
  const fwdX = Math.sin(carState.angle);
  const fwdZ = -Math.cos(carState.angle);

  if (camState.mode === 'orbit') {
    const ox = car.position.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    const oy = car.position.y + orbit.radius * Math.cos(orbit.phi);
    const oz = car.position.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    camera.position.set(ox, oy, oz);
    camera.lookAt(car.position.x, car.position.y + 0.8, car.position.z);

  } else if (camState.mode === 'interior') {
    const tx = car.position.x - fwdX * 0.1 - Math.cos(carState.angle) * 0.22;
    const ty = car.position.y + 1.48;
    const tz = car.position.z + fwdZ * 0.1 - Math.sin(carState.angle) * 0.22;
    camera.position.set(tx, ty, tz);
    const lookMult = lookBack ? -1 : 1;
    camera.lookAt(car.position.x + fwdX * 20 * lookMult, car.position.y + 1.3, car.position.z + fwdZ * 20 * lookMult);
    const sw = car.userData.steeringWheel;
    if (sw) sw.rotation.z = -carState.steer * 0.5;

  } else if (camState.mode === 'side') {
    const rightX = Math.cos(carState.angle);
    const rightZ = Math.sin(carState.angle);
    const tx = car.position.x + rightX * 10;
    const ty = car.position.y + 3;
    const tz = car.position.z + rightZ * 10;
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 1 - Math.pow(1 - 0.2, dt));
    camera.lookAt(car.position.x, car.position.y + 0.8, car.position.z);

  } else {
    // Chase cam
    const lookBackMult = lookBack ? -1 : 1;
    const camDist   = 9;
    const camHeight = 4;
    const targetCamPos = new THREE.Vector3(
      car.position.x - fwdX * camDist * lookBackMult,
      car.position.y + camHeight,
      car.position.z - fwdZ * camDist * lookBackMult
    );
    camera.position.lerp(targetCamPos, 1 - Math.pow(1 - 0.2, dt));
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
        assignBillboardArticle(bb, devArticles);
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

animate();
