/* =====================================================================
 * 英雄酒馆 + 道长
 * 酒馆是一种特殊的「塔」：slot.tower = { type:'tavern', lv, spent }
 * 道长守在离酒馆最近的路上，自动劈砍（物理单体）和撒符（法术范围）
 * ===================================================================== */
function tavernSlot() { return G.slots.find(s => s.tower && s.tower.type === 'tavern'); }
function tavernCost(lv) { return Math.round(TAVERN.cost[lv] * costMul()); }

function buildTavern(slot) {
  if (tavernSlot() || slot.tower) return false;
  const c = tavernCost(0); if (G.coins < c) return false;
  G.coins -= c;
  slot.tower = { type: 'tavern', lv: 1, spent: c, build: 1 };
  summonHero(slot);
  return true;
}
function upgradeTavern(slot) {
  const t = slot.tower; if (t.lv >= 3) return false;
  const c = tavernCost(t.lv); if (G.coins < c) return false;
  G.coins -= c; t.spent += c; t.lv++; t.build = 1;
  if (G.hero) { const st = TAVERN.hero[t.lv - 1]; G.hero.max = st.hp; if (!G.hero.dead) G.hero.hp = st.hp; }
  return true;
}
function sellTavern(slot) { G.coins += Math.round(slot.tower.spent * ECONOMY.sellRate); slot.tower = null; if (G.hero) for (const e of G.hero.eng) e.blocked = false; G.hero = null; }

// 守点：离酒馆最近的路线上的点
function rallyPoint(slot) {
  let best = null, bd = 1e9;
  for (const R of LAY.routes) { const L = routeLen(R); for (let d = 0; d < L; d += 8) { const p = routeAt(R, d); const dd = Math.hypot(p[0] - slot.x, p[1] - slot.y); if (dd < bd) { bd = dd; best = p; } } }
  return { x: best[0], y: best[1] };
}

function summonHero(slot) {
  const st = TAVERN.hero[slot.tower.lv - 1], rp = rallyPoint(slot);
  G.hero = { slot, x: slot.x, y: slot.y, rx: rp.x, ry: rp.y, hp: st.hp, max: st.hp, side: 1, cd: 0.5, aoeCd: 3, atk: 0, hit: 0, dead: 0, eng: [], slash: 0, walk: 0 };
}

function tryBlock(e) {
  const h = G.hero; if (!h || h.dead || !e.D.blockable || e.blocked) return;
  if (h.eng.length >= TAVERN.block) return;
  if (Math.hypot(e.x - h.x, (e.y - h.y) * 1.5) < 34) { e.blocked = true; e.acd = 0.6; h.eng.push(e); }
}

function updateHero(dt) {
  const h = G.hero; if (!h) return;
  const st = TAVERN.hero[h.slot.tower.lv - 1];
  h.hit = Math.max(0, h.hit - dt * 4); h.atk = Math.max(0, h.atk - dt); h.slash = Math.max(0, h.slash - dt * 3);
  h.eng = h.eng.filter(e => !e.dead && G.enemies.includes(e));
  if (h.dead) { h.dead -= dt; if (h.dead <= 0) { h.dead = 0; h.hp = h.max; h.x = h.slot.x; h.y = h.slot.y; } return; }
  if (h.hp <= 0) { h.dead = TAVERN.respawn; for (const e of h.eng) e.blocked = false; h.eng = []; return; }
  // 走回守点
  const dx = h.rx - h.x, dy = h.ry - h.y, dd = Math.hypot(dx, dy);
  if (dd > 3 && !h.eng.length) { const v = Math.min(dd, 90 * dt); h.x += dx / dd * v; h.y += dy / dd * v; h.walk += dt * 10; if (Math.abs(dx) > 2) h.side = dx > 0 ? 1 : -1; }
  if (!h.eng.length) h.hp = Math.min(h.max, h.hp + TAVERN.regen * dt);
  const tg = h.eng[0]; if (tg) h.side = tg.x > h.x ? 1 : -1;
  // 劈砍
  h.cd -= dt;
  if (h.cd <= 0 && tg) { h.cd = st.interval; h.atk = 0.34; h.pending = tg; }
  if (h.pending && h.atk < 0.2) {
    const z = h.pending; h.pending = null; h.slash = 1;
    if (!z.dead) { damage(z, st.dmg, 'phys'); sparkFx(z.x, z.y - 16, '255,240,200', 8); }
  }
  // 撒符：朝附近最密集的敌人
  h.aoeCd -= dt;
  if (h.aoeCd <= 0) {
    const near = G.enemies.filter(e => !e.dead && Math.hypot(e.x - h.x, e.y - h.y) < 150);
    if (near.length) {
      h.aoeCd = st.aoeCd;
      let best = near[0], bn = 0;
      for (const a of near) { const n = near.filter(b => Math.hypot(a.x - b.x, a.y - b.y) < st.aoeR).length; if (n > bn) { bn = n; best = a; } }
      for (const e of near) if (Math.hypot(e.x - best.x, e.y - best.y) < st.aoeR) damage(e, st.aoeDmg, 'magic');
      G.fx.push({ kind: 'ring', x: best.x, y: best.y, r: st.aoeR, t: 0, life: 0.5, color: '255,220,110' });
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; G.projs.push({ kind: 'fu', x0: h.x, y0: h.y - 30, x1: best.x + Math.cos(a) * st.aoeR * 0.6, y1: best.y + Math.sin(a) * st.aoeR * 0.35, t: 0, d: 0.35, a: 0, tr: [], z: null, dmg: 0 }); }
    } else h.aoeCd = 0.4;
  }
}

function drawTavern(s, hl) {
  const t = s.tower, img = I.hall, w = 130, hgt = w * img.height / img.width;
  const pop = 1 + (t.build || 0) * 0.12;
  E(s.x, s.y + 4, w * 0.44, w * 0.13); ctx.fillStyle = 'rgba(20,40,0,.3)'; ctx.fill();
  ctx.save(); ctx.translate(s.x, s.y); ctx.scale(pop, 2 - pop);
  if (hl) { ctx.shadowColor = 'rgba(255,230,140,.95)'; ctx.shadowBlur = 14; }
  ctx.filter = 'sepia(.35) hue-rotate(-15deg)';
  ctx.drawImage(img, -w / 2, -hgt * 0.82, w, hgt); ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.restore();
  // 酒旗（占位，正式美术到了可删）
  const fx = s.x + w * 0.38, fy = s.y - hgt * 0.75;
  ctx.strokeStyle = '#3a2212'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, s.y - 6); ctx.lineTo(fx, fy); ctx.stroke();
  const wv = Math.sin(NOW * 3) * 2;
  ctx.fillStyle = '#f4f0e0'; ctx.strokeStyle = '#2a1b12'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 22, fy + 2 + wv); ctx.lineTo(fx + 22, fy + 30 + wv); ctx.lineTo(fx, fy + 28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c0301e'; ctx.font = 'bold 15px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('酒', fx + 11, fy + 15 + wv * 0.5);
  for (let k = 0; k < t.lv; k++) { const bx = s.x - t.lv * 6 + k * 12 + 2, by = s.y + 12; ctx.fillStyle = '#2a1b12'; ctx.fillRect(bx - 1, by - 1, 10, 10); ctx.fillStyle = '#f2d36b'; ctx.fillRect(bx, by, 8, 8); }
}

function drawHero() {
  const h = G.hero; if (!h) return;
  if (h.dead) {
    ctx.save(); ctx.font = 'bold 14px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#2a1b12'; ctx.fillStyle = '#fff';
    const s = '道长复活 ' + Math.ceil(h.dead); ctx.strokeText(s, h.slot.x, h.slot.y - 100); ctx.fillText(s, h.slot.x, h.slot.y - 100); ctx.restore(); return;
  }
  const HH = LAY.sizes.hero, img = I.pt, atk = h.atk > 0;
  const b = h.eng.length ? 0 : Math.abs(Math.sin(h.walk)) * 2;
  const hh = HH, w = HH * img.width / img.height, dx = atk ? h.side * (h.atk < 0.2 ? 6 : -2) : 0;
  E(h.x, h.y, w * 0.42, w * 0.13); ctx.fillStyle = 'rgba(20,40,0,.32)'; ctx.fill();
  ctx.save(); ctx.translate(h.x + dx, h.y - b); if (h.side < 0) ctx.scale(-1, 1); if (atk) ctx.rotate(h.atk < 0.2 ? 0.22 : -0.12);
  ctx.imageSmoothingEnabled = false; const oy = hh * 5 / 37; ctx.drawImage(img, -w / 2, -hh + oy, w, hh);
  if (h.hit > 0) { ctx.globalAlpha = h.hit * 0.6; ctx.filter = 'brightness(2.5) saturate(0)'; ctx.drawImage(img, -w / 2, -hh + oy, w, hh); ctx.filter = 'none'; }
  ctx.imageSmoothingEnabled = true; ctx.restore();
  if (h.slash > 0) {
    const s = h.slash, cx = h.x + h.side * 18, cy = h.y - HH * 0.42;
    ctx.save(); ctx.translate(cx, cy); if (h.side < 0) ctx.scale(-1, 1); ctx.globalAlpha = s;
    ctx.beginPath(); ctx.arc(0, 0, 30, -1.4, 1.1); ctx.arc(-6, 2, 22, 1.1, -1.4, true); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
  }
  const bw = 32, bx = h.x - bw / 2, by = h.y - HH - 8;
  ctx.fillStyle = '#2a1b12'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6); ctx.fillStyle = '#c0392b'; ctx.fillRect(bx, by, bw, 4); ctx.fillStyle = '#7ed957'; ctx.fillRect(bx, by, bw * Math.max(0, h.hp) / h.max, 4);
}
