import * as THREE from 'three';
import { renderer, scene } from './scene.js';
import { ROAD_WIDTH, pathData, growPath } from './road.js';
import { CAR_START_IDX } from './car.js';
import { addBackPanel, signGroups } from './billboards.js';

// ─── Constants ───────────────────────────────────────────────────────────────
export const BADGE_SPACING   = 160;
const NUM_BADGE_SIGNS = 4;

// ─── State ───────────────────────────────────────────────────────────────────
export const badgeSigns = [];
export let devBadges    = [];

export function setDevBadges(val) { devBadges = val; }

// ─── Stat cards ──────────────────────────────────────────────────────────────
export function buildStatCards(userInfo, articles) {
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

// ─── Stat sign textures ──────────────────────────────────────────────────────
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
  const IMG_AREA_H = 90;
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

// ─── Stat sign meshes ────────────────────────────────────────────────────────
function createStatSignMesh() {
  const group = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0x1a3a5c });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.0, 8), postMat);
  post.position.y = 1.5;
  group.add(post);
  group.userData.postLocalXs = [0];
  group.userData.postRadius  = 0.2;
  const panelGeo = new THREE.PlaneGeometry(4, 2.75);
  const panel = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: 0x002200 }));
  panel.position.y = 4.5;
  group.add(panel);
  group.userData.panel = panel;
  addBackPanel(group, panel, 4, 2.75, 0x002200);
  return group;
}

export function placeStatSign(bs, pd) {
  const rx = Math.cos(pd.angle), rz = Math.sin(pd.angle);
  const xOff = bs.side * (ROAD_WIDTH / 2 + 3);
  bs.mesh.position.set(pd.pos.x + rx * xOff, 0, pd.pos.z + rz * xOff);
  bs.mesh.rotation.y = -pd.angle;
}

let _statRoundRobin = 0;
export function assignStatSign(bs) {
  if (!devBadges.length) return;
  const stat = devBadges[_statRoundRobin % devBadges.length];
  _statRoundRobin++;
  const tex = createStatSignTexture(stat);
  bs.mesh.userData.panel.material = new THREE.MeshBasicMaterial({ map: tex });
  if (bs.mesh.userData.backPanel) {
    bs.mesh.userData.backPanel.material = new THREE.MeshBasicMaterial({ map: tex });
  }
}

export function initStatSigns() {
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

  if (articleCount === -1) {
    ctx.fillStyle = '#ccffcc';
    ctx.font = 'bold 34px Courier New, monospace';
    ctx.fillText('WELCOME TO THE', W / 2, 38);
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 40px Courier New, monospace';
    ctx.fillText('DEV COMMUNITY', W / 2, 88);
    ctx.fillStyle = '#ffe44d';
    ctx.font = 'bold 46px Courier New, monospace';
    ctx.fillText('TEST DRIVE', W / 2, 148);
    ctx.strokeStyle = '#00ff8855'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 222); ctx.lineTo(W - 40, 222); ctx.stroke();
    ctx.fillStyle = '#aaffcc';
    ctx.font = '24px Courier New, monospace';
    ctx.fillText('check the billboards to find out why', W / 2, 238);
    ctx.fillStyle = '#ffffff66';
    ctx.font = '20px Courier New, monospace';
    ctx.fillText('you should join DEV Community', W / 2, 276);
  } else {
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
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function placeWelcomeScene(username, articleCount) {
  const signIdx = CAR_START_IDX + 10;
  const pd      = pathData[signIdx];
  const rx = Math.cos(pd.angle), rz = Math.sin(pd.angle);

  const postMat = new THREE.MeshLambertMaterial({ color: 0x1a4a1a });
  const signGroup = new THREE.Group();
  for (const px of [-2.0, 2.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.5, 8), postMat);
    post.position.set(px, 2.25, 0); signGroup.add(post);
  }
  const welcomeTex = createWelcomeSignTexture(username, articleCount);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 5.35), new THREE.MeshBasicMaterial({ map: welcomeTex }));
  panel.position.y = 7.2; signGroup.add(panel);
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
