/* =====================================================================
 * 怪物：出怪、移动、受伤、绘制
 * ===================================================================== */
function updateSpawns(dt) {
  G.spawnT += dt;
  while (G.spawn.length && G.spawn[0].t <= G.spawnT) {
    const s = G.spawn.shift();
    spawnEnemy(s.type, s.route, s.hpScale);
  }
}

function spawnEnemy(type, route, hpScale) {
  const D = ENEMIES[type];
  const hp = Math.round(D.hp * hpScale * G.M.enemyHp);
  const R = LAY.routes[route];
  G.enemies.push({
    type, D, route, d: 0, hp, max: hp, x: R[0][0], y: R[0][1], dx: -1, dy: 0,
    off: (Math.random() - 0.5) * (D.boss ? 4 : 18), ph: Math.random(),
    slow: 0, slowT: 0, stunT: 0, burn: 0, burnT: 0, hit: 0, dead: 0,
    blocked: false, acd: 0, lunge: 0,
  });
}

function resistOf(e, type) {
  if (type === 'phys') return clamp(e.D.armor + (e.type === 'ghost' ? G.M.ghostArmor : 0), 0, 0.9);
  return clamp(e.D.mres + (e.type === 'zombie' ? G.M.zombieMres : 0), 0, 0.9);
}

// 造成伤害（type: phys / magic）
function damage(e, base, type) {
  if (e.dead || e.hp <= 0) return 0;
  const mul = type === 'phys' ? G.M.physMul : G.M.magicMul;
  const amt = base * mul * (1 - resistOf(e, type));
  e.hp -= amt; e.hit = 1;
  if (e.hp <= 0) killEnemy(e);
  return amt;
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = 0.001; G.kills++;
  const c = e.D.bounty + G.M.killCoins;
  G.coins += c;
  floatText(e.x, e.y - e.D.size, '+' + c, '#f2c95a', 0.8, 14);
  if (G.hero) G.hero.eng = G.hero.eng.filter(z => z !== e);
}

function applySlow(e, s, t) { if (s >= e.slow || e.slowT <= 0) { e.slow = s; } e.slowT = Math.max(e.slowT, t); }
function applyStun(e, t) { if (!e.D.boss) e.stunT = Math.max(e.stunT, t); else e.stunT = Math.max(e.stunT, t * 0.3); }

function updateEnemies(dt) {
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { e.dead += dt; if (e.dead > 0.6) G.enemies.splice(i, 1); continue; }
    e.hit = Math.max(0, e.hit - dt * 4); e.lunge = Math.max(0, e.lunge - dt * 4);
    if (e.burnT > 0) { e.burnT -= dt; damage(e, e.burn * dt, 'phys'); if (e.dead) continue; }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.stunT > 0) { e.stunT -= dt; continue; }
    // 被英雄拦住：原地和英雄对打
    if (e.blocked) {
      const h = G.hero;
      if (!h || h.dead || !h.eng.includes(e)) { e.blocked = false; }
      else {
        const k = h.eng.indexOf(e); const tx = h.x + h.side * 26, ty = h.y + (k ? 10 : -3);
        e.x += (tx - e.x) * Math.min(1, dt * 8); e.y += (ty - e.y) * Math.min(1, dt * 8);
        e.acd -= dt;
        if (e.acd <= 0) { e.acd = e.D.boss ? 1.6 : 1.3; e.lunge = 1; h.hp -= e.D.boss ? 40 : 9; h.hit = 1; }
        continue;
      }
    }
    const R = LAY.routes[e.route];
    const sp = e.D.speed * (1 - e.slow) * (1 - G.M.enemySlow);
    // 僵尸跳着走：腾空时快、落地时慢
    const cyc = ((G.time + e.ph * 2) * 1.8) % 1;
    const mv = e.D.hop ? (cyc > 0.1 && cyc < 0.9 ? 1.15 : 0.3) : 1;
    e.d += sp * mv * dt;
    const p = routeAt(R, e.d);
    const L = Math.hypot(p[2], p[3]) || 1;
    e.x = p[0] - p[3] / L * e.off; e.y = p[1] + p[2] / L * e.off * 0.6; e.dx = p[2]; e.dy = p[3];
    if (e.d >= routeLen(R)) { e.dead = 0.6; G.enemies.splice(i, 1); loseLife(e.D.leak); continue; }
    tryBlock(e);
  }
}

function drawEnemy(e) {
  const img = I[e.D.img], S = e.D.size;
  const fight = e.blocked && !e.dead;
  const cyc = ((G.time + e.ph * 2) * 1.8) % 1;
  let hop = e.D.hop && !fight && !e.stunT ? Math.sin(cyc * Math.PI) : 0;
  let sq = e.D.hop && !fight ? (cyc < 0.12 ? 1 - (0.12 - cyc) * 1.6 : 1) : 1;
  if (!e.D.hop) hop = 0.25 + 0.25 * Math.sin(NOW * 3 + e.ph * 6); // 幽魂飘浮
  if (fight) sq = 1 - 0.06 * Math.abs(Math.sin(NOW * 3 + e.ph * 6)) - e.lunge * 0.1;
  const h = S * sq, w = S * img.width / img.height * (2 - sq), lift = hop * S * 0.2;
  const flip = fight && G.hero ? G.hero.x < e.x : e.dx < 0;
  const a = e.dead ? Math.max(0, 1 - e.dead / 0.6) : (e.type === 'ghost' ? 0.85 : 1);
  E(e.x, e.y, w * 0.32, w * 0.1); ctx.fillStyle = `rgba(20,40,0,${0.3 * a})`; ctx.fill();
  ctx.save(); ctx.globalAlpha = a; ctx.translate(e.x + (fight ? (flip ? -1 : 1) * e.lunge * 6 : 0), e.y - lift);
  if (flip) ctx.scale(-1, 1); if (e.dead) ctx.rotate(e.dead * 1.2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, -w / 2, -h + h * 0.08, w, h);
  if (e.hit > 0) { ctx.globalAlpha = e.hit * 0.7; ctx.filter = 'brightness(3)'; ctx.drawImage(img, -w / 2, -h + h * 0.08, w, h); ctx.filter = 'none'; }
  ctx.imageSmoothingEnabled = true; ctx.restore();
  // 状态提示
  if (!e.dead) {
    if (e.slowT > 0) { E(e.x, e.y, w * 0.38, w * 0.13); ctx.strokeStyle = 'rgba(140,220,255,.8)'; ctx.lineWidth = 2; ctx.stroke(); }
    if (e.stunT > 0) { ctx.fillStyle = '#ffe66b'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦', e.x + Math.sin(NOW * 8) * 6, e.y - h - 10); }
    if (e.burnT > 0) { E(e.x, e.y - h * 0.4, 4, 6); ctx.fillStyle = 'rgba(255,120,40,.7)'; ctx.fill(); }
    if (e.hp < e.max || e.D.boss) {
      const bw = e.D.boss ? 60 : 24, bx = e.x - bw / 2, by = e.y - lift - h - 6;
      ctx.fillStyle = '#2a1b12'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = e.D.boss ? '#f2c14e' : '#7ed957'; ctx.fillRect(bx, by, bw * Math.max(0, e.hp) / e.max, 3);
    }
  } else {
    ctx.save(); ctx.globalAlpha = a * 0.6; E(e.x, e.y - 20 - e.dead * 30, 8 + e.dead * 12, 6 + e.dead * 9); ctx.fillStyle = '#d8f0ff'; ctx.fill(); ctx.restore();
  }
}
