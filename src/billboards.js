import * as THREE from 'three';
import { renderer, scene, camera } from './scene.js';
import { ROAD_WIDTH, pathData, growPath, SEGMENT_LEN } from './road.js';
import { buildingStrips } from './buildings.js';
import { orbit } from './camera.js';

// ─── Constants ───────────────────────────────────────────────────────────────
export const BILLBOARD_SPACING = 200;
const NUM_BILLBOARDS   = 5;
const ROAD_SIDE_OFFSET = ROAD_WIDTH / 2 + 9;
const OVERHEAD_EVERY   = 4;

// ─── Shared state ────────────────────────────────────────────────────────────
export const billboardPool = [];  // { mesh, postMesh, pathIdx, type }
export const signGroups    = [];  // all sign/billboard groups for post collision

// ─── Snippet extraction ──────────────────────────────────────────────────────
export function extractSnippets(markdown = '') {
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

// ─── Billboard textures ─────────────────────────────────────────────────────
function createBillboardTexture(article, snippet) {
  const W = 512, H = 768;
  const PAD = 16;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const SEC = {
    header:  { y: 0,   h: 78  },
    title:   { y: 78,  h: 100 },
    cover:   { y: 178, h: 210 },
    snippet: { y: 396, h: 270 },
    footer:  { y: 674, h: 94  },
  };

  ctx.fillStyle = '#00060f';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  for (const sec of [SEC.title, SEC.cover, SEC.snippet, SEC.footer]) {
    ctx.fillStyle = '#00aaff22';
    ctx.fillRect(0, sec.y, W, 1);
  }

  // Header: profile pic + username
  const PFP = 52, pfpX = PAD, pfpY = (SEC.header.h - PFP) / 2;
  ctx.fillStyle = '#000c18';
  ctx.beginPath();
  ctx.arc(pfpX + PFP / 2, pfpY + PFP / 2, PFP / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#00aaff';
  ctx.font = 'bold 22px Courier New, monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('@' + (article.user?.username || 'unknown'), pfpX + PFP + 10, pfpY + PFP / 2 - 8);
  const tags = (article.tag_list || []).slice(0, 3).map(t => '#' + t).join('  ');
  ctx.fillStyle = '#ff2d78';
  ctx.font = '18px Courier New, monospace';
  ctx.fillText(tags, pfpX + PFP + 10, pfpY + PFP / 2 + 14);

  // Title
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

  // Cover image
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
    ctx.fillStyle = '#000c18';
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = '#00ff8820'; ctx.lineWidth = 1;
    for (let gx = cx; gx < cx + cw; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx, cy + ch); ctx.stroke(); }
    for (let gy = cy; gy < cy + ch; gy += 24) { ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + cw, gy); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (article._joinMode) {
      ctx.fillStyle = '#00ff88'; ctx.font = 'bold 34px Courier New';
      ctx.fillText('Click here to join', cx + cw / 2, cy + 18);
      ctx.fillText('DEV Community!', cx + cw / 2, cy + 62);
    } else if (article._startWriting) {
      ctx.fillStyle = '#00ff88'; ctx.font = 'bold 34px Courier New';
      ctx.fillText('Click here to', cx + cw / 2, cy + 18);
      ctx.fillText('start writing!', cx + cw / 2, cy + 62);
    } else {
      ctx.fillStyle = '#ff2d78aa'; ctx.font = 'bold 56px Courier New';
      ctx.fillText('404', cx + cw / 2, cy + 36);
      ctx.fillStyle = '#ffffffaa'; ctx.font = '22px Courier New';
      ctx.fillText('cover_image: null', cx + cw / 2, cy + 96);
      ctx.fillText('(the author was too busy)', cx + cw / 2, cy + 130);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // Snippet text
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

  // Footer
  ctx.fillStyle = '#000a14';
  ctx.fillRect(0, SEC.footer.y, W, SEC.footer.h);
  ctx.fillStyle = '#ff2d78';
  ctx.font = 'bold 28px Courier New, monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(`♥ ${article.public_reactions_count ?? 0}`, PAD, SEC.footer.y + 14);
  ctx.fillStyle = '#00ffe1';
  ctx.font = '22px Courier New, monospace';
  ctx.fillText(`⏱ ${article.reading_time_minutes ?? '?'} min read`, PAD + 120, SEC.footer.y + 18);

  // Profile picture (async)
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

function createOverheadBillboardTexture(article, snippet) {
  const W = 1024, H = 512;
  const PAD = 16;
  const FOOTER_H = 72, FOOTER_Y = H - FOOTER_H;
  const COVER_X = 360, COVER_SLOT_H = 272;
  const COVER_W = W - COVER_X;
  const BELOW_Y = COVER_SLOT_H + PAD;
  const BELOW_H = FOOTER_Y - BELOW_Y;
  const LEFT_W = COVER_X - PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#00060f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Cover image (top-right)
  ctx.fillStyle = '#000a14';
  ctx.fillRect(COVER_X, 0, COVER_W, COVER_SLOT_H);
  if (article.cover_image) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ar = img.width / img.height;
      let dw = COVER_W, dh = COVER_W / ar;
      if (dh > COVER_SLOT_H) { dh = COVER_SLOT_H; dw = COVER_SLOT_H * ar; }
      ctx.drawImage(img, COVER_X + COVER_W - dw, 0, dw, dh);
      tex.needsUpdate = true;
    };
    img.onerror = () => {};
    img.src = article.cover_image;
  } else {
    ctx.fillStyle = '#000c18';
    ctx.fillRect(COVER_X, 0, COVER_W, COVER_SLOT_H);
    ctx.strokeStyle = '#00ff8820'; ctx.lineWidth = 1;
    for (let gx = COVER_X; gx < COVER_X + COVER_W; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, COVER_SLOT_H); ctx.stroke(); }
    for (let gy = 0; gy < COVER_SLOT_H; gy += 20) { ctx.beginPath(); ctx.moveTo(COVER_X, gy); ctx.lineTo(COVER_X + COVER_W, gy); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (article._joinMode) {
      ctx.fillStyle = '#00ff88'; ctx.font = 'bold 28px Courier New';
      ctx.fillText('Click here to join', COVER_X + COVER_W / 2, 12);
      ctx.fillText('DEV Community!', COVER_X + COVER_W / 2, 50);
    } else if (article._startWriting) {
      ctx.fillStyle = '#00ff88'; ctx.font = 'bold 28px Courier New';
      ctx.fillText('Click here to', COVER_X + COVER_W / 2, 12);
      ctx.fillText('start writing!', COVER_X + COVER_W / 2, 50);
    } else {
      ctx.fillStyle = '#ff2d78aa'; ctx.font = 'bold 44px Courier New';
      ctx.fillText('404', COVER_X + COVER_W / 2, 44);
      ctx.fillStyle = '#ffffffaa'; ctx.font = '18px Courier New';
      ctx.fillText('cover_image: null', COVER_X + COVER_W / 2, 100);
      ctx.fillText('(the author was too busy)', COVER_X + COVER_W / 2, 128);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // Title (top-left)
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

  // Snippet (full width below cover)
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

  // Footer
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
  const ftags = (article.tag_list || []).slice(0, 3).map(t => '#' + t).join('  ');
  ctx.fillText(ftags, PAD + PFP + 10, pfpMid + 14);

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

// ─── Mesh utilities ──────────────────────────────────────────────────────────
export function addBackPanel(group, frontPanel, w, h, baseColor) {
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

function createRoadsideBillboard() {
  const group = new THREE.Group();
  const postMat  = new THREE.MeshLambertMaterial({ color: 0x1a3a5c });

  for (const x of [-2.5, 2.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 5.8, 8), postMat);
    post.position.set(x, 2.9, 0);
    group.add(post);
  }
  group.userData.postLocalXs = [-2.5, 2.5];
  group.userData.postRadius  = 0.4;

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

  for (const x of [-(ROAD_WIDTH / 2 + 1), (ROAD_WIDTH / 2 + 1)]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 7.3, 8), postMat);
    post.position.set(x, 3.65, 0);
    group.add(post);
  }
  group.userData.postLocalXs = [-(ROAD_WIDTH / 2 + 1), (ROAD_WIDTH / 2 + 1)];
  group.userData.postRadius  = 0.4;

  const panelGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 4, 6);
  const panel = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: 0x001a33 }));
  panel.position.y = 10.5;
  group.add(panel);
  group.userData.panel = panel;
  addBackPanel(group, panel, ROAD_WIDTH + 4, 6, 0x001a33);

  return group;
}

// ─── Placement + assignment ──────────────────────────────────────────────────
export function placeBillboard(bb, pd, side) {
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

export function assignBillboardArticle(bb, articles) {
  if (!articles.length) return;
  const art = articles[Math.floor(Math.random() * articles.length)];
  const snippets = art._snippets || [''];
  const snippet  = snippets[Math.floor(Math.random() * snippets.length)] || art.description || '';
  const tex = bb.type === 'overhead'
    ? createOverheadBillboardTexture(art, snippet)
    : createBillboardTexture(art, snippet);
  bb.mesh.userData.panel.material = new THREE.MeshBasicMaterial({ map: tex });
  bb.mesh.userData.panel.userData.articleUrl = art.url;
  if (bb.mesh.userData.backPanel) {
    bb.mesh.userData.backPanel.material = new THREE.MeshBasicMaterial({ map: tex });
    bb.mesh.userData.backPanel.userData.articleUrl = art.url;
  }
}

function clashesWithBuilding(idx) {
  return buildingStrips.some(b => Math.abs(b.pathIdx - idx) <= 2);
}

export function safePathIdx(idx) {
  while (clashesWithBuilding(idx)) idx++;
  return idx;
}

// ─── Initialize billboard pool ───────────────────────────────────────────────
export function initBillboards() {
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

export function activateBillboards(articles) {
  for (const bb of billboardPool) {
    assignBillboardArticle(bb, articles);
    bb.mesh.visible = true;
  }
}

// ─── Billboard click handler ─────────────────────────────────────────────────
const _bbRaycaster = new THREE.Raycaster();
renderer.domElement.addEventListener('click', e => {
  if (orbit.active) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width)  *  2 - 1,
    ((e.clientY - rect.top)  / rect.height) * -2 + 1
  );
  _bbRaycaster.setFromCamera(mouse, camera);
  const panels = [
    ...billboardPool.map(bb => bb.mesh.userData.panel),
    ...billboardPool.map(bb => bb.mesh.userData.backPanel),
  ].filter(Boolean);
  const hits = _bbRaycaster.intersectObjects(panels);
  if (hits.length > 0) {
    const url = hits[0].object.userData.articleUrl;
    if (url) window.open(url, '_blank', 'noopener');
  }
});
