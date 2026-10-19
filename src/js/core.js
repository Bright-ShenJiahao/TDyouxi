/* =====================================================================
 * 核心：画布、素材、工具函数、游戏状态、主循环
 * ===================================================================== */
const TAU = Math.PI * 2;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const I = {};

// ---------- 工具 ----------
function E(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function rand(a, b) { return a + Math.random() * (b - a); }
// 椭圆射程判定（俯视斜角，纵向压扁）
function inRange(cx, cy, x, y, r) { return Math.hypot(x - cx, (y - cy) / 0.7) <= r; }

// ---------- 布局 ----------
let LAY;
function loadLayout() {
  LAY = JSON.parse(JSON.stringify(LAYOUT_DEFAULT));
  /*DEV*/try { const s = localStorage.getItem('td_layout_v2'); if (s) LAY = Object.assign(LAY, JSON.parse(s)); } catch (e) {}/*/DEV*/
  ENEMIES.zombie.size = ENEMIES.ghost.size = LAY.sizes.zombie;
  ENEMIES.king.size = Math.round(LAY.sizes.zombie * 1.7);
}
loadLayout();

// ---------- 路线工具 ----------
function routeLen(r) { let L = 0; for (let i = 1; i < r.length; i++) L += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return L; }
function routeAt(r, d) {
  for (let i = 1; i < r.length; i++) {
    const l = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
    if (d <= l) { const u = d / l; return [r[i - 1][0] + (r[i][0] - r[i - 1][0]) * u, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * u, r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]]; }
    d -= l;
  }
  const n = r.length - 1; return [r[n][0], r[n][1], 0, -1];
}

// ---------- 游戏状态 ----------
let G;
function newGame() {
  G = {
    state: 'title',          // title | pick | prep | wave | win | lose
    coins: ECONOMY.startCoins, lives: ECONOMY.lives,
    wave: 0,                 // 已开始的波数（1..10）
    prepT: ECONOMY.firstPrepTime,
    speed: 1, paused: false,
    spawn: [],               // 待出怪队列 {t, type, route}
    spawnT: 0,
    enemies: [], projs: [], fx: [], texts: [],
    slots: LAY.slots.map((p, i) => ({ i, x: p[0], y: p[1], tower: null, seed: Math.random() * 1000 })),
    hero: null,
    M: newMods(),
    picks: {},               // 每张卡已选次数
    streak: { fu: 0, lei: 0, pao: 0, wang: 0 },
    choice: null,            // 当前候选卡
    rerolled: false,
    menu: null,              // 打开的建造/塔菜单
    armed: null,             // 已选中待释放的法术
    kills: 0, leaked: 0, hallHit: 0, routeIx: 0,
    time: 0,                 // 游戏内时间（受暂停和倍速影响）
  };
}

// ---------- 主循环 ----------
let K = 1, OX = 0, OY = 0, lt = 0, NOW = 0, mouse = null;
function resize() {
  const d = Math.min(window.devicePixelRatio || 1, 2);
  const box = document.getElementById('stage').getBoundingClientRect();
  const s = Math.min(box.width / MW, box.height / MH);
  const w = MW * s, h = MH * s;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  cv.width = Math.round(w * d); cv.height = Math.round(h * d);
  K = cv.width / MW;
}
function toMap(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * MW, (e.clientY - r.top) / r.height * MH]; }

function frame(now) {
  const t = now / 1000; const raw = Math.min(0.05, lt ? t - lt : 0); lt = t; NOW = t;
  const running = !G.paused && (G.state === 'prep' || G.state === 'wave');
  const dt = running ? raw * G.speed : 0;
  if (running) update(dt);
  updateFx(raw * (G.paused ? 0 : G.speed));
  render(t);
  requestAnimationFrame(frame);
}

function update(dt) {
  G.time += dt;
  if (G.state === 'prep') {
    G.prepT -= dt;
    if (G.prepT <= 0) startWave(false);
  }
  if (G.state === 'wave') updateSpawns(dt);
  updateEnemies(dt);
  updateHero(dt);
  updateTowers(dt);
  updateProjs(dt);
  if (G.state === 'wave' && !G.spawn.length && !G.enemies.some(e => !e.dead)) endWave();
}

function startWave(early) {
  if (early && G.prepT > 0) {
    const bonus = Math.round(Math.min(G.prepT, ECONOMY.prepTime) * ECONOMY.earlyCallPerSec);
    if (bonus > 0) { G.coins += bonus; floatText(MW / 2, MH - 90, '提前召唤 +' + bonus + ' 铜钱', '#f2c95a', 1.6); }
  }
  G.wave++;
  G.state = 'wave';
  sfx('wave');
  const W = WAVES[G.wave - 1];
  let t = 0;
  for (const [type, n, gap, route] of W.groups) {
    for (let k = 0; k < n; k++) {
      const r = route != null ? route : (type === 'king' ? 0 : (G.routeIx++ % LAY.routes.length));
      G.spawn.push({ t, type, route: r, hpScale: W.hpScale });
      t += gap;
    }
    t += 2;
  }
  G.spawnT = 0;
  floatText(MW / 2, 150, '第 ' + G.wave + ' 波', '#ffdf8a', 2.2, 44);
}

function endWave() {
  if (G.wave >= WAVES.length) { G.state = 'win'; sfx('win'); return; }
  const bonus = ECONOMY.waveBonusBase + ECONOMY.waveBonusPerWave * G.wave + G.M.waveCoins;
  G.coins += bonus;
  floatText(MW / 2, 150, '击退第 ' + G.wave + ' 波  +' + bonus + ' 铜钱', '#9fe08a', 2.2, 34);
  openCardPick();
}

function loseLife(n) {
  sfx('leak');
  G.lives -= n; G.leaked += n; G.hallHit = 1;
  if (G.lives <= 0) { G.lives = 0; G.state = 'lose'; sfx('lose'); }
}

function floatText(x, y, s, color, life, size) { G.texts.push({ x, y, s, color: color || '#fff', life: life || 1, t: 0, size: size || 18 }); }

function stars() { return G.lives >= 18 ? 3 : G.lives >= 10 ? 2 : 1; }
