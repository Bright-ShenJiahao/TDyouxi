/* =====================================================================
 * 画面与操作：场景绘制、HUD、建造/塔菜单、法术栏、开始与结算画面、点击处理
 * ===================================================================== */
const FONT_T = '"ZCOOL QingKe HuangYou","Noto Serif SC",sans-serif';

function pixelButton(r, text, color, enabled, size) {
  ctx.save();
  ctx.fillStyle = '#1a1410'; ctx.fillRect(r.x, r.y + 3, r.w, r.h);
  ctx.fillStyle = color; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(r.x, r.y, r.w, 3);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(r.x, r.y + r.h - 3, r.w, 3);
  ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 3; ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = enabled === false ? '#9a8f80' : '#fff8e0'; ctx.font = (size || 20) + 'px ' + FONT_T; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.restore();
}
function hitR(m, r) { return m && m[0] >= r.x && m[0] <= r.x + r.w && m[1] >= r.y && m[1] <= r.y + r.h; }

// ---------- 场景 ----------
function slotAt(m) {
  let best = null, bd = 1e9;
  for (const s of G.slots) {
    let hit;
    if (s.tower) { const r = s.tower.type === 'tavern' ? { x: s.x - 60, y: s.y - 110, w: 120, h: 120 } : towerRect(s, s.tower.type); hit = hitR(m, { x: r.x + r.w * 0.15, y: r.y, w: r.w * 0.7, h: r.h + 10 }); }
    else hit = Math.hypot(m[0] - s.x, (m[1] - s.y) * 1.6) < Math.max(LAY.sizes.slot * 0.6, 40);
    if (hit) { const d = Math.hypot(m[0] - s.x, m[1] - s.y); if (d < bd) { bd = d; best = s; } }
  }
  return best;
}

function drawSlot(s, hl) {
  const w = LAY.sizes.slot, hh = w * 0.46, x = s.x, y = s.y;
  const R = k => { const v = Math.sin(s.seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  const blob = (sc, jit) => { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = 1 + (R(i % 24) - 0.5) * jit; const px = x + Math.cos(a) * w * 0.5 * sc * r, py = y + Math.sin(a) * hh * 0.5 * sc * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); };
  if (hl) { ctx.save(); ctx.shadowColor = 'rgba(255,225,120,1)'; ctx.shadowBlur = 18; blob(1.06, 0.16); ctx.fillStyle = 'rgba(255,230,140,.6)'; ctx.fill(); ctx.restore(); }
  blob(1.04, 0.16); ctx.fillStyle = '#6e8a3a'; ctx.fill();
  blob(1, 0.16); ctx.fillStyle = '#c99a52'; ctx.fill();
  blob(0.9, 0.12); ctx.fillStyle = '#dcb36a'; ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.55; E(x - w * 0.06, y - hh * 0.08, w * 0.28, hh * 0.22); ctx.fillStyle = '#ecd194'; ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#4f7a2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + R(50 + i) * 0.3, r = 1 + (R(i * 2 % 24) - 0.5) * 0.16, bx = x + Math.cos(a) * w * 0.5 * r, by = y + Math.sin(a) * hh * 0.5 * r; if (Math.sin(a) < -0.2 && R(60 + i) < 0.5) continue; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 2, by - 5 - R(70 + i) * 3); ctx.moveTo(bx, by); ctx.lineTo(bx + 2.5, by - 4 - R(80 + i) * 3); ctx.stroke(); }
  const fx = x + w * 0.16, fy = y - hh * 0.05, ph = hl ? 6 : 2.6, amp = hl ? 1.6 : 1;
  ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 30); ctx.stroke();
  ctx.strokeStyle = '#8a6a32'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 30); ctx.stroke();
  const wv = k => Math.sin(NOW * ph + k * 1.8 + s.seed) * amp * k * 2.2;
  ctx.beginPath(); ctx.moveTo(fx, fy - 29); ctx.quadraticCurveTo(fx + 8, fy - 27 + wv(0.5), fx + 17, fy - 23 + wv(1)); ctx.quadraticCurveTo(fx + 8, fy - 19 + wv(0.5), fx, fy - 17); ctx.closePath();
  ctx.fillStyle = '#f2c33e'; ctx.fill(); ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke();
}

function drawHall() {
  const H = LAY.hall, img = I.hall, w = H.w, h = w * img.height / img.width, x = H.x - w / 2, y = H.y - 0.82 * h;
  E(H.x + 10, H.y + 14, w * 0.46, w * 0.13); ctx.fillStyle = 'rgba(20,40,0,.28)'; ctx.fill();
  if (G.hallHit > 0) { ctx.save(); ctx.shadowColor = `rgba(255,40,30,${G.hallHit})`; ctx.shadowBlur = 30; }
  ctx.drawImage(img, x, y, w, h); if (G.hallHit > 0) ctx.restore();
  const px = x + w * (580 / 943), py = y + h * (419 / 880), k = w / 943;
  ctx.save(); ctx.translate(px, py); ctx.transform(1, -0.18, 0, 1, 0, 0);
  ctx.font = Math.round(36 * k) + 'px "Ma Shan Zheng","KaiTi",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText('茅 山', 1, 1.5); ctx.fillStyle = '#f4c955'; ctx.fillText('茅 山', 0, 0); ctx.restore();
  const cx = x + w * (485 / 943), cy = y + h * (735 / 880);
  if (Math.random() < 0.1) G.fx.push({ kind: 'smoke', x: cx + rand(-3, 3), y: cy, t: 0, life: 2.4 });
}
function drawSmoke() { for (const f of G.fx) if (f.kind === 'smoke') { const k = f.t / f.life; E(f.x + Math.sin(f.t * 2) * 4, f.y - f.t * 14, 2 + f.t * 2.6, 2 + f.t * 2.6); ctx.fillStyle = `rgba(225,235,245,${0.4 * (1 - k) * Math.min(1, f.t * 3)})`; ctx.fill(); } }

function rangeRing(x, y, r, a) { E(x, y, r, r * 0.7); ctx.fillStyle = `rgba(255,226,130,${0.12 * a})`; ctx.fill(); ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255,236,170,${0.85 * a})`; ctx.stroke(); ctx.setLineDash([]); }

function render(t) {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.drawImage(I.map, 0, 0, MW, MH);
  const hov = G.state === 'prep' || G.state === 'wave' ? (mouse ? slotAt(mouse) : null) : null;
  const list = G.slots.map(s => ({ y: s.y, f: () => { if (!s.tower) drawSlot(s, hov === s || (G.menu && G.menu.slot === s)); else if (s.tower.type === 'tavern') drawTavern(s, hov === s); else drawTower(s, hov === s); } }));
  list.push({ y: LAY.hall.y, f: drawHall });
  for (const e of G.enemies) list.push({ y: e.y, f: () => drawEnemy(e) });
  if (G.hero) list.push({ y: G.hero.y, f: drawHero });
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  drawSmoke(); drawProjs(); drawFx();
  // 射程预览
  const ms = G.menu && G.menu.slot;
  if (ms && ms.tower && ms.tower.type !== 'tavern') rangeRing(ms.x, ms.y, towerStats(ms.tower).range, 1);
  if (G.menu && G.menu.preview) rangeRing(ms.x, ms.y, TOWERS[G.menu.preview].lv[0].range * (1 + G.M.range[G.menu.preview]), 0.7);
  if (G.armed != null && mouse) { E(mouse[0], mouse[1], 95, 95 * 0.7); ctx.fillStyle = 'rgba(150,180,255,.18)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,210,255,.9)'; ctx.lineWidth = 2; ctx.stroke(); }
  // 飘字
  for (const x of G.texts) { const k = x.t / x.life; ctx.globalAlpha = Math.min(1, (1 - k) * 2); ctx.font = x.size + 'px ' + FONT_T; ctx.textAlign = 'center'; ctx.lineWidth = Math.max(3, x.size / 6); ctx.strokeStyle = '#1a1410'; ctx.strokeText(x.s, x.x, x.y - k * 26); ctx.fillStyle = x.color; ctx.fillText(x.s, x.x, x.y - k * 26); }
  ctx.globalAlpha = 1;
  if (G.hallHit > 0) { ctx.fillStyle = `rgba(200,30,20,${G.hallHit * 0.16})`; ctx.fillRect(0, 0, MW, MH); }
  if (G.menu) drawMenu();
  if (G.state !== 'title') drawHUD();
  if (G.state === 'pick') drawCardPick();
  if (G.state === 'title') drawTitle();
  if (G.state === 'win' || G.state === 'lose') drawEnd();
  /*DEV*/if (typeof drawDebug === 'function' && DBG.on) drawDebug();/*/DEV*/
}

// ---------- HUD ----------
const HUD = {
  speed: { x: MW - 148, y: 14, w: 62, h: 42 }, pause: { x: MW - 78, y: 14, w: 62, h: 42 },
  call: { x: MW / 2 - 140, y: MH - 70, w: 280, h: 52 },
};
function spellRect(i) { return { x: 20 + i * 70, y: MH - 82, w: 60, h: 64 }; }

function drawHUD() {
  ctx.save();
  ctx.fillStyle = 'rgba(26,20,16,.82)'; ctx.fillRect(14, 14, 380, 46); ctx.strokeStyle = '#6b5232'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, 380, 46);
  ctx.font = '22px ' + FONT_T; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = '#ff6b5a'; ctx.fillText('魂', 26, 38); ctx.fillStyle = '#fff'; ctx.fillText(G.lives + '/' + ECONOMY.lives, 52, 38);
  ctx.fillStyle = '#f2c94a'; ctx.fillText('钱', 132, 38); ctx.fillStyle = '#fff'; ctx.fillText(Math.floor(G.coins), 158, 38);
  ctx.fillStyle = '#9fd8ff'; ctx.fillText('波', 252, 38); ctx.fillStyle = '#fff'; ctx.fillText(Math.max(G.wave, 0) + '/' + WAVES.length, 278, 38);
  ctx.restore();
  pixelButton(HUD.speed, G.speed === 2 ? '2×' : '1×', G.speed === 2 ? '#b8862e' : '#5a4630', true, 20);
  pixelButton(HUD.pause, G.paused ? '▶' : 'Ⅱ', '#5a4630', true, 20);
  if (G.state === 'prep') {
    const bonus = Math.round(Math.min(G.prepT, ECONOMY.prepTime) * ECONOMY.earlyCallPerSec);
    pixelButton(HUD.call, (G.wave === 0 ? '开战' : '召唤下一波') + '  ' + Math.ceil(G.prepT) + 's' + (bonus > 0 ? '  +' + bonus + '钱' : ''), '#8a2a1e', true, 21);
  }
  G.M.spells.forEach((sp, i) => {
    const r = spellRect(i), S = SPELL_INFO[sp], on = G.armed === i;
    ctx.fillStyle = '#1a1410'; ctx.fillRect(r.x, r.y + 3, r.w, r.h); ctx.fillStyle = on ? '#fff2b0' : '#f2d36b'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 3; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#b3261b'; ctx.font = '28px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(S.ch, r.x + r.w / 2, r.y + 26);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#3a2a14'; ctx.fillText(S.name, r.x + r.w / 2, r.y + 52);
  });
  if (G.armed != null) { ctx.font = '18px ' + FONT_T; ctx.textAlign = 'left'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a1410'; ctx.fillStyle = '#cfe0ff'; ctx.strokeText('点击地图释放天雷符', 20, MH - 96); ctx.fillText('点击地图释放天雷符', 20, MH - 96); }
  if (G.paused) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, MW, MH); ctx.font = '48px ' + FONT_T; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('暂停', MW / 2, MH / 2); }
}

// ---------- 建造 / 塔菜单 ----------
function menuItems() {
  const m = G.menu, s = m.slot, items = [];
  if (!s.tower) {
    for (const k of ['fu', 'lei', 'pao', 'wang']) items.push({ id: k, label: TOWERS[k].name, cost: buildCost(k), kind: 'build' });
    if (!tavernSlot()) items.push({ id: 'tavern', label: '英雄酒馆', cost: tavernCost(0), kind: 'build' });
  } else if (s.tower.type === 'tavern') {
    const t = s.tower; if (t.lv < 3) items.push({ id: 'up', label: '升级酒馆', cost: tavernCost(t.lv), kind: 'up' }); else items.push({ id: 'max', label: '已满级', cost: null, kind: 'none' });
    items.push({ id: 'sell', label: '出售', cost: -Math.round(t.spent * ECONOMY.sellRate), kind: 'sell' });
  } else {
    const t = s.tower;
    if (t.lv < 3) items.push({ id: 'up', label: '升级', cost: upCost(t), kind: 'up' });
    else if (canAdvance(t)) items.push({ id: 'adv', label: TOWERS[t.type].advanced.name, cost: advCost(t), kind: 'up' });
    else items.push({ id: 'max', label: t.adv ? '已突破' : '已满级', cost: null, kind: 'none' });
    items.push({ id: 'sell', label: '出售', cost: -Math.round(t.spent * ECONOMY.sellRate), kind: 'sell' });
  }
  // 围绕空地排成一圈；靠近画面边缘时整体往里收
  const n = items.length, R = n > 3 ? 112 : 92;
  const cx = clamp(s.x, R + 40, MW - R - 40), cy = clamp(s.y - 40, R + 70, MH - R - 40);
  items.forEach((it, i) => {
    const a = n > 3 ? -Math.PI / 2 + i * TAU / n : -Math.PI / 2 + (i - (n - 1) / 2) * 1.0;
    it.x = cx + Math.cos(a) * R; it.y = cy + Math.sin(a) * R * 0.8; it.r = 32;
  });
  return items;
}
function itemIcon(it, x, y) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (TOWERS[it.id]) {
    const img = towerImg(it.id), w = 40, h = w * img.height / img.width;
    if (!I[TOWERS[it.id].img] && TOWER_TINT[it.id]) ctx.filter = TOWER_TINT[it.id];
    ctx.drawImage(img, x - w / 2, y - h * 0.62, w, h); ctx.filter = 'none';
    if (TOWER_MARK[it.id] && !I[TOWERS[it.id].img]) { ctx.font = 'bold 13px "Noto Serif SC",serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.strokeText(TOWER_MARK[it.id], x + 14, y + 10); ctx.fillText(TOWER_MARK[it.id], x + 14, y + 10); }
  } else {
    const ch = { tavern: '酒', up: '升', adv: '破', sell: '卖', max: '满' }[it.id];
    ctx.font = '26px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = it.id === 'sell' ? '#e8d7b0' : '#ffe08a'; ctx.fillText(ch, x, y);
  }
  ctx.restore();
}
function drawMenu() {
  const items = menuItems();
  for (const it of items) {
    const afford = it.cost == null || it.cost <= 0 || G.coins >= it.cost, hov = mouse && Math.hypot(mouse[0] - it.x, mouse[1] - it.y) < it.r;
    ctx.save();
    ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(it.x, it.y + 3, it.r, 0, TAU); ctx.fill();
    ctx.fillStyle = it.kind === 'sell' ? '#6b3a2a' : afford ? (hov ? '#7a5a34' : '#4a3a28') : '#3a3430';
    ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, TAU); ctx.fill(); ctx.strokeStyle = afford ? '#f2c94a' : '#6a5a4a'; ctx.lineWidth = 3; ctx.stroke();
    if (!afford) ctx.globalAlpha = 0.5;
    itemIcon(it, it.x, it.y - 4);
    ctx.globalAlpha = 1; ctx.restore();
    ctx.font = '13px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#1a1410';
    const label = it.cost == null ? it.label : it.cost < 0 ? it.label + ' +' + (-it.cost) : it.label + ' ' + it.cost;
    ctx.fillStyle = afford ? '#fff' : '#b0a090'; ctx.strokeText(label, it.x, it.y + it.r + 12); ctx.fillText(label, it.x, it.y + it.r + 12);
  }
  // 塔信息
  const s = G.menu.slot;
  if (s.tower) {
    const t = s.tower, name = t.type === 'tavern' ? TAVERN.name : (t.adv ? TOWERS[t.type].advanced.name : TOWERS[t.type].name);
    const info = name + '  Lv' + t.lv + (t.type !== 'tavern' ? '  ' + TOWERS[t.type].desc : '');
    ctx.font = '15px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a1410'; ctx.fillStyle = '#ffe9b0';
    ctx.strokeText(info, s.x, s.y + 40); ctx.fillText(info, s.x, s.y + 40);
  }
}

// ---------- 开始 / 结算 ----------
const TITLE_BTN = { x: MW / 2 - 130, y: MH / 2 + 60, w: 260, h: 60 };
function drawTitle() {
  ctx.fillStyle = 'rgba(12,10,6,.55)'; ctx.fillRect(0, 0, MW, MH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '86px "Ma Shan Zheng","KaiTi",serif'; ctx.lineWidth = 8; ctx.strokeStyle = '#1a1410'; ctx.fillStyle = '#f2c94a';
  ctx.strokeText('任家镇外', MW / 2, MH / 2 - 90); ctx.fillText('任家镇外', MW / 2, MH / 2 - 90);
  ctx.font = '22px ' + FONT_T; ctx.fillStyle = '#e9dcb8'; ctx.fillText('僵尸夜袭茅山 · 建塔守住主殿 · 每波选一张卡', MW / 2, MH / 2 - 10);
  pixelButton(TITLE_BTN, '开始守护', '#8a2a1e', true, 28);
}
function drawEnd() {
  ctx.fillStyle = 'rgba(12,10,6,.7)'; ctx.fillRect(0, 0, MW, MH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const win = G.state === 'win';
  ctx.font = '72px "Ma Shan Zheng","KaiTi",serif'; ctx.lineWidth = 8; ctx.strokeStyle = '#1a1410'; ctx.fillStyle = win ? '#f2c94a' : '#e0553f';
  const title = win ? '守住了！' : '主殿失守';
  ctx.strokeText(title, MW / 2, MH / 2 - 120); ctx.fillText(title, MW / 2, MH / 2 - 120);
  if (win) { const n = stars(); for (let i = 0; i < 3; i++) { ctx.font = '60px sans-serif'; ctx.fillStyle = i < n ? '#ffd23f' : '#4a4038'; ctx.fillText('★', MW / 2 + (i - 1) * 76, MH / 2 - 30); } }
  ctx.font = '22px ' + FONT_T; ctx.fillStyle = '#e9dcb8';
  ctx.fillText((win ? '剩余阴气 ' + G.lives + '/' + ECONOMY.lives : '撑到第 ' + G.wave + ' 波') + '   ·   消灭 ' + G.kills + ' 只', MW / 2, MH / 2 + 30);
  pixelButton(TITLE_BTN, '再来一局', '#8a2a1e', true, 28);
}

// ---------- 点击 ----------
function onClick(m) {
  /*DEV*/if (DBG.on) return;/*/DEV*/
  if (G.state === 'title') { if (hitR(m, TITLE_BTN)) { openCardPick(); } return; }
  if (G.state === 'win' || G.state === 'lose') { if (hitR(m, TITLE_BTN)) { newGame(); G.state = 'title'; openCardPick(); } return; }
  if (G.state === 'pick') {
    for (const r of cardRects()) if (hitR(m, r)) { pickCard(r.c); return; }
    if (hitR(m, rerollRect())) rerollCards();
    return;
  }
  if (hitR(m, HUD.speed)) { G.speed = G.speed === 1 ? 2 : 1; return; }
  if (hitR(m, HUD.pause)) { G.paused = !G.paused; return; }
  if (G.paused) return;
  for (let i = 0; i < G.M.spells.length; i++) if (hitR(m, spellRect(i))) { useSpell(i); return; }
  if (G.armed != null) { useSpell(G.armed, m); return; }
  if (G.state === 'prep' && hitR(m, HUD.call)) { startWave(true); return; }
  if (G.menu) {
    const items = menuItems();
    for (const it of items) if (Math.hypot(m[0] - it.x, m[1] - it.y) < it.r) { menuAction(it); return; }
  }
  const s = slotAt(m);
  G.menu = s ? { slot: s } : null;
}
function menuAction(it) {
  const s = G.menu.slot; let ok = false;
  if (it.kind === 'build') ok = it.id === 'tavern' ? buildTavern(s) : buildTower(s, it.id);
  else if (it.id === 'up') ok = s.tower.type === 'tavern' ? upgradeTavern(s) : upgradeTower(s);
  else if (it.id === 'adv') ok = advanceTower(s);
  else if (it.id === 'sell') { s.tower.type === 'tavern' ? sellTavern(s) : sellTower(s); ok = true; }
  if (ok) G.menu = null; else if (it.cost > 0) floatText(it.x, it.y - 40, '铜钱不够', '#ff8a7a', 0.8, 16);
}
function onMove(m) {
  mouse = m;
  if (G.menu && G.menu.slot && !G.menu.slot.tower) {
    const it = menuItems().find(it => Math.hypot(m[0] - it.x, m[1] - it.y) < it.r && TOWERS[it.id]);
    G.menu.preview = it ? it.id : null;
  }
}

// ---------- 启动 ----------
function boot() {
  newGame();
  cv.addEventListener('pointerdown', e => { const m = toMap(e); onMove(m); onClick(m); });
  cv.addEventListener('pointermove', e => onMove(toMap(e)));
  cv.addEventListener('pointerleave', () => { mouse = null; });
  addEventListener('keydown', e => { if (e.code === 'Space' && (G.state === 'prep' || G.state === 'wave')) { G.paused = !G.paused; e.preventDefault(); } });
  addEventListener('resize', resize); resize();
  requestAnimationFrame(frame);
}
let loaded = 0; const names = Object.keys(IMG);
for (const k of names) { I[k] = new Image(); I[k].onload = I[k].onerror = () => { if (++loaded === names.length) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot(); } }; I[k].src = IMG[k]; }
