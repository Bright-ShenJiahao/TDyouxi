/* =====================================================================
 * 塔：建造、升级、出售、突破、攻击、子弹、绘制
 * 塔对象：{ type, lv(1..3), adv(是否已突破), spent, cd, advCd }
 * ===================================================================== */
function costMul() { return Math.max(0.5, 1 - G.M.discount); }
function buildCost(type) { return Math.round(TOWERS[type].cost[0] * costMul()); }
function upCost(t) { return t.lv >= 3 ? null : Math.round(TOWERS[t.type].cost[t.lv] * costMul()); }
function advCost(t) { return Math.round(TOWERS[t.type].advanced.cost * costMul()); }
function canAdvance(t) { return t.lv === 3 && !t.adv && G.M.adv === t.type && !G.M.advUsed; }

function buildTower(slot, type) {
  const c = buildCost(type); if (G.coins < c || slot.tower) return false;
  G.coins -= c;
  slot.tower = { type, lv: 1, adv: false, spent: c, cd: 0.3, advCd: 6, build: 1 };
  return true;
}
function upgradeTower(slot) {
  const t = slot.tower, c = upCost(t); if (c == null || G.coins < c) return false;
  G.coins -= c; t.spent += c; t.lv++; t.build = 1; return true;
}
function advanceTower(slot) {
  const t = slot.tower; if (!canAdvance(t)) return false;
  const c = advCost(t); if (G.coins < c) return false;
  G.coins -= c; t.spent += c; t.adv = true; t.build = 1; G.M.advUsed = true;
  floatText(slot.x, slot.y - 120, TOWERS[t.type].advanced.name + '！', '#ffd76a', 2, 26);
  return true;
}
function sellTower(slot) {
  const t = slot.tower; if (!t) return;
  G.coins += Math.round(t.spent * ECONOMY.sellRate);
  slot.tower = null;
}

// 计算塔的实际数值（叠加卡牌加成）
function towerStats(t) {
  const D = TOWERS[t.type], s = D.lv[t.lv - 1], M = G.M, k = t.type;
  const o = Object.assign({}, s);
  o.dmg = s.dmg * (1 + M.dmg[k]);
  o.interval = s.interval / (1 + M.rate[k]);
  o.range = s.range * (1 + M.range[k]);
  if (k === 'fu') { o.shots = s.shots + M.fuShots; if (t.adv) { o.dmg *= 1.3; o.multi = 3; } }
  if (k === 'lei') { o.chain = s.chain + M.leiChain; }
  if (k === 'pao') { o.splash = s.splash * (1 + M.splash); if (t.adv) { o.dmg *= 1.7; o.range += 30; } }
  if (k === 'wang') { o.slow = Math.min(0.8, s.slow + M.slow); if (t.adv) { o.slow = Math.max(o.slow, 0.6); o.stun = 0.25; } }
  return o;
}

function enemiesInRange(x, y, r) { return G.enemies.filter(e => !e.dead && inRange(x, y, e.x, e.y, r)); }
// 优先攻击走得最远的
function pickTarget(list) { let b = null; for (const e of list) if (!b || e.d > b.d) b = e; return b; }

function updateTowers(dt) {
  for (const s of G.slots) {
    const t = s.tower; if (!t || t.type === 'tavern') continue;
    t.build = Math.max(0, t.build - dt * 3);
    const st = towerStats(t);
    if (t.type === 'lei' && t.adv) {
      t.advCd -= dt;
      if (t.advCd <= 0) { t.advCd = 6; for (const e of enemiesInRange(s.x, s.y, st.range)) { boltFx(s.x, s.y - 110, e.x, e.y - 16); damage(e, st.dmg, 'magic'); } }
    }
    t.cd -= dt; if (t.cd > 0) continue;
    const list = enemiesInRange(s.x, s.y, st.range);
    if (!list.length) { t.cd = 0.1; continue; }
    t.cd = st.interval;
    attack(s, t, st, list);
    if (Math.random() < G.M.combo) setTimeout(() => { if (s.tower === t) { const l2 = enemiesInRange(s.x, s.y, st.range); if (l2.length) attack(s, t, st, l2); } }, 140 / G.speed);
  }
}

function attack(s, t, st, list) {
  const top = { x: s.x + 10, y: s.y - 100 };
  t.fire = 1;
  if (t.type === 'fu') {
    const targets = st.multi ? list.sort((a, b) => b.d - a.d).slice(0, st.multi) : [pickTarget(list)];
    for (const tg of targets) for (let k = 0; k < st.shots; k++) {
      const fl = 0.42 + Math.hypot(tg.x - top.x, tg.y - top.y) / 900;
      const fut = tg.blocked || tg.stunT > 0 ? [tg.x, tg.y] : routeAt(LAY.routes[tg.route], tg.d + tg.D.speed * fl);
      G.projs.push({ kind: 'fu', x0: top.x, y0: top.y, x1: fut[0] + k * 6, y1: fut[1] - 14, t: -k * 0.08, d: fl, a: 0, tr: [], z: tg, dmg: st.dmg });
    }
  } else if (t.type === 'pao') {
    const tg = pickTarget(list); const fl = 0.8;
    const fut = tg.blocked || tg.stunT > 0 ? [tg.x, tg.y] : routeAt(LAY.routes[tg.route], tg.d + tg.D.speed * (1 - tg.slow) * fl);
    G.projs.push({ kind: 'pao', x0: top.x, y0: top.y, x1: fut[0], y1: fut[1], t: 0, d: fl, tr: [], dmg: st.dmg, r: st.splash });
  } else if (t.type === 'lei') {
    let tg = pickTarget(list); const hit = [tg]; let from = top;
    for (let c = 0; c <= st.chain && tg; c++) {
      boltFx(from.x, from.y, tg.x, tg.y - 16);
      damage(tg, st.dmg * (c ? 0.7 : 1), 'magic');
      if (G.M.leiStun && Math.random() < G.M.leiStun) applyStun(tg, 1);
      from = { x: tg.x, y: tg.y - 16 };
      tg = G.enemies.filter(e => !e.dead && !hit.includes(e) && Math.hypot(e.x - from.x, e.y - from.y) < 110).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
      if (tg) hit.push(tg);
    }
  } else if (t.type === 'wang') {
    G.fx.push({ kind: 'ring', x: s.x, y: s.y, r: st.range, t: 0, life: 0.45, color: '140,220,170' });
    for (const e of list) {
      damage(e, st.dmg, 'magic'); applySlow(e, st.slow, 1.3);
      if (st.stun && Math.random() < st.stun) applyStun(e, 1);
    }
  }
}

function boltFx(x0, y0, x1, y1) {
  const pts = [[x0, y0]]; const n = 6;
  for (let i = 1; i < n; i++) { const u = i / n; pts.push([x0 + (x1 - x0) * u + rand(-10, 10), y0 + (y1 - y0) * u + rand(-8, 8)]); }
  pts.push([x1, y1]);
  G.fx.push({ kind: 'bolt', pts, t: 0, life: 0.22 });
  G.fx.push({ kind: 'flash', x: x1, y: y1, t: 0, life: 0.25, r: 26, color: '170,200,255' });
}

function updateProjs(dt) {
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i]; p.t += dt / p.d; if (p.t < 0) continue;
    const u = Math.min(1, p.t);
    const arc = p.kind === 'pao' ? 110 : 55;
    p.x = p.x0 + (p.x1 - p.x0) * u; p.y = p.y0 + (p.y1 - p.y0) * u - Math.sin(u * Math.PI) * arc;
    p.a = (p.a || 0) + dt * 14; p.tr.push([p.x, p.y]); if (p.tr.length > 10) p.tr.shift();
    if (u >= 1) {
      G.projs.splice(i, 1);
      if (p.kind === 'fu') {
        if (p.z && !p.z.dead) damage(p.z, p.dmg, 'phys');
        sparkFx(p.x, p.y, '255,226,120', 10);
      } else {
        for (const e of G.enemies) if (!e.dead && inRange(p.x1, p.y1, e.x, e.y, p.r)) {
          damage(e, p.dmg, 'phys');
          if (G.M.burn) { e.burn = G.M.burn; e.burnT = 3; }
        }
        G.fx.push({ kind: 'boom', x: p.x1, y: p.y1, r: p.r, t: 0, life: 0.45 });
        sparkFx(p.x1, p.y1, '255,150,70', 16);
      }
    }
  }
}

function sparkFx(x, y, color, n) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU, v = 30 + Math.random() * 90; G.fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 30, t: 0, life: 0.4 + Math.random() * 0.3, color }); } }

// ---------- 绘制 ----------
// 雷法/朱砂/符网塔暂用符塔图换色，等美术图到了在 src/ 放 tower_lei.png 等即可自动替换
const TOWER_TINT = { lei: 'hue-rotate(195deg) saturate(1.3)', pao: 'hue-rotate(-25deg) saturate(1.6) brightness(1.05)', wang: 'hue-rotate(85deg) saturate(0.9)' };
const TOWER_MARK = { lei: '雷', pao: '炮', wang: '网' };
function towerImg(type) { return I[TOWERS[type].img] || I.tower; }
function towerRect(s, type) {
  const img = type === 'tavern' ? null : towerImg(type);
  const w = LAY.sizes.tower, h = img ? w * img.height / img.width : w;
  return { x: s.x - w / 2, y: s.y + 0.09 * h - h, w, h };
}

function drawTower(s, hl) {
  const t = s.tower, r = towerRect(s, t.type), img = towerImg(t.type);
  const pop = 1 + t.build * 0.12;
  E(s.x, s.y + 4, r.w * 0.42, r.w * 0.14); ctx.fillStyle = 'rgba(20,40,0,.3)'; ctx.fill();
  ctx.save(); ctx.translate(s.x, s.y); ctx.scale(pop, 2 - pop); ctx.translate(-s.x, -s.y);
  const tint = I[TOWERS[t.type].img] ? '' : (TOWER_TINT[t.type] || '');
  if (hl || t.adv) { ctx.shadowColor = t.adv ? 'rgba(255,210,90,1)' : 'rgba(255,230,140,.95)'; ctx.shadowBlur = t.adv ? 22 : 14; }
  if (tint) ctx.filter = tint;
  ctx.drawImage(img, r.x, r.y, r.w, r.h);
  ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.restore();
  // 占位标记（换上正式美术后可删）
  if (TOWER_MARK[t.type] && !I[TOWERS[t.type].img]) {
    const mx = s.x, my = r.y + r.h * 0.5;
    ctx.fillStyle = '#2a1b12'; ctx.fillRect(mx - 11, my - 11, 22, 22);
    ctx.fillStyle = t.type === 'lei' ? '#9fc4ff' : t.type === 'pao' ? '#ff7a5a' : '#9fe0b0'; ctx.fillRect(mx - 9, my - 9, 18, 18);
    ctx.fillStyle = '#2a1b12'; ctx.font = 'bold 14px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TOWER_MARK[t.type], mx, my + 1);
  }
  // 等级：像素小方块
  for (let k = 0; k < t.lv + (t.adv ? 1 : 0); k++) {
    const bx = s.x - (t.lv + (t.adv ? 1 : 0)) * 6 + k * 12 + 2, by = s.y + 12;
    ctx.fillStyle = '#2a1b12'; ctx.fillRect(bx - 1, by - 1, 10, 10);
    ctx.fillStyle = k >= 3 ? '#ffb02e' : '#f2d36b'; ctx.fillRect(bx, by, 8, 8);
  }
}

function drawProjs() {
  for (const p of G.projs) {
    if (p.t < 0 || p.x == null) continue;
    if (p.kind === 'fu') {
      p.tr.forEach((q, j) => { E(q[0], q[1], 0.8 + j * 0.3, 0.8 + j * 0.3); ctx.fillStyle = `rgba(255,228,120,${j / 20})`; ctx.fill(); });
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = '#f6d35e'; ctx.strokeStyle = '#3a2212'; ctx.lineWidth = 1.4; ctx.fillRect(-4, -6.5, 8, 13); ctx.strokeRect(-4, -6.5, 8, 13); ctx.strokeStyle = '#c62a1d'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke(); ctx.restore();
    } else {
      p.tr.forEach((q, j) => { E(q[0], q[1], 1 + j * 0.4, 1 + j * 0.4); ctx.fillStyle = `rgba(120,90,70,${j / 30})`; ctx.fill(); });
      E(p.x, p.y, 7, 7); ctx.fillStyle = '#c0301e'; ctx.fill(); ctx.strokeStyle = '#2a1b12'; ctx.lineWidth = 2; ctx.stroke();
      E(p.x - 2, p.y - 2, 2, 2); ctx.fillStyle = '#ff9a7a'; ctx.fill();
    }
  }
}

function updateFx(dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i]; f.t += dt; if (f.t > f.life) { G.fx.splice(i, 1); continue; }
    if (f.kind === 'spark') { f.vy += 120 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) { const x = G.texts[i]; x.t += dt || 0.016; if (x.t > x.life) G.texts.splice(i, 1); }
  G.hallHit = Math.max(0, G.hallHit - (dt || 0.016) * 2.5);
}

function drawFx() {
  for (const f of G.fx) {
    const k = f.t / f.life, a = 1 - k;
    if (f.kind === 'spark') { ctx.fillStyle = `rgba(${f.color},${a})`; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); }
    else if (f.kind === 'ring') { E(f.x, f.y, f.r * (0.3 + 0.7 * k), f.r * 0.7 * (0.3 + 0.7 * k)); ctx.strokeStyle = `rgba(${f.color},${a * 0.9})`; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = `rgba(${f.color},${a * 0.12})`; ctx.fill(); }
    else if (f.kind === 'boom') { E(f.x, f.y, f.r * (0.4 + 0.6 * k), f.r * 0.7 * (0.4 + 0.6 * k)); ctx.fillStyle = `rgba(255,${140 + 80 * a | 0},60,${a * 0.5})`; ctx.fill(); }
    else if (f.kind === 'flash') { const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); g.addColorStop(0, `rgba(${f.color},${a})`); g.addColorStop(1, `rgba(${f.color},0)`); ctx.fillStyle = g; ctx.fillRect(f.x - f.r, f.y - f.r, 2 * f.r, 2 * f.r); }
    else if (f.kind === 'bolt') {
      ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(150,190,255,${a})`; ctx.lineWidth = 6; ctx.beginPath(); f.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    else if (f.kind === 'thunder') {
      const x = f.x, y = f.y; ctx.save(); ctx.strokeStyle = `rgba(200,220,255,${a})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + 10, y - 400); ctx.lineTo(x - 15, y - 220); ctx.lineTo(x + 12, y - 120); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
      E(x, y, f.r * (0.5 + 0.5 * k), f.r * 0.7 * (0.5 + 0.5 * k)); ctx.fillStyle = `rgba(170,200,255,${a * 0.4})`; ctx.fill();
    }
  }
}
