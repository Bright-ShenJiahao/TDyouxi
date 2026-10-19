/* =====================================================================
 * 选卡（肉鸽）：抽 3 选 1、重抽、流派引导、法术栏
 * 卡牌数据在 src/config/cards.js
 * ===================================================================== */
// 全局加成（卡牌效果都改这里）
function newMods() {
  const per = v => ({ fu: v, lei: v, pao: v, wang: v });
  return {
    dmg: per(0), rate: per(0), range: per(0),
    fuShots: 0, leiChain: 0, leiStun: 0, splash: 0, burn: 0, slow: 0,
    combo: 0, physMul: 1, magicMul: 1,
    adv: null, advUsed: false,
    spells: [],
    waveCoins: 0, discount: 0, killCoins: 0,
    enemySlow: 0, enemyHp: 1, ghostArmor: 0, zombieMres: 0,
  };
}

function cardAvailable(c, opening) {
  if ((G.picks[c.id] || 0) >= c.max) return false;
  if (c.kind === 'adv') { if (opening || G.M.adv || G.wave < 3) return false; }
  if (opening && c.kind === 'spell') return false;
  return true;
}

function drawCards(opening) {
  const W = rarityWeights(G.wave), RI = { g: 0, b: 1, o: 2 };
  const pool = CARDS.filter(c => cardAvailable(c, opening));
  const out = [];
  for (let n = 0; n < 3 && pool.length; n++) {
    const ws = pool.map(c => W[RI[c.rarity]] * (c.tower ? 1 + STREAK_BONUS * G.streak[c.tower] : 1) / (c.rarity === 'o' ? 4 : 1));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0), k = 0;
    while (r > ws[k]) { r -= ws[k]; k++; }
    out.push(pool[k]); pool.splice(k, 1);
  }
  return out;
}

function openCardPick() {
  G.state = 'pick'; G.rerolled = false; G.menu = null; G.armed = null;
  G.choice = drawCards(G.wave === 0);
  G.pickAnim = 0;
}

function pickCard(c) {
  sfx('card');
  G.picks[c.id] = (G.picks[c.id] || 0) + 1;
  if (c.tower) G.streak[c.tower]++;
  c.apply(G.M, G);
  floatText(MW / 2, 150, '获得「' + c.name + '」', '#ffdf8a', 1.8, 30);
  G.choice = null;
  G.state = 'prep';
  G.prepT = G.wave === 0 ? ECONOMY.firstPrepTime : ECONOMY.prepTime;
}

function rerollCards() {
  if (G.rerolled || G.coins < ECONOMY.rerollCost) return;
  G.coins -= ECONOMY.rerollCost; G.rerolled = true;
  G.choice = drawCards(G.wave === 0); G.pickAnim = 0;
}

// ---------- 法术 ----------
function useSpell(i, m) {
  const sp = G.M.spells[i]; if (!sp) return;
  if (sp === 'freeze') {
    for (const e of G.enemies) if (!e.dead) applyStun(e, 3);
    G.fx.push({ kind: 'ring', x: MW / 2, y: MH / 2, r: 900, t: 0, life: 0.7, color: '160,220,255' });
    G.M.spells.splice(i, 1); G.armed = null;
  } else if (sp === 'thunder') {
    if (!m) { G.armed = G.armed === i ? null : i; return; }
    const R = 95;
    for (const e of G.enemies) if (!e.dead && inRange(m[0], m[1], e.x, e.y, R)) damage(e, 220, 'magic');
    G.fx.push({ kind: 'thunder', x: m[0], y: m[1], r: R, t: 0, life: 0.5 });
    G.fx.push({ kind: 'flash', x: m[0], y: m[1], r: 120, t: 0, life: 0.4, color: '200,220,255' });
    G.M.spells.splice(i, 1); G.armed = null;
  }
}
const SPELL_INFO = { thunder: { name: '天雷符', color: '#7fa8ff', ch: '雷' }, freeze: { name: '定身符', color: '#8ee0ff', ch: '定' } };

// ---------- 像素风卡牌绘制 ----------
// 卡框画在低分辨率画布上再放大（关闭平滑），得到像素感；文字另外清晰绘制
const CARD_W = 220, CARD_H = 300, PIX = 4;
const RARITY = {
  g: { name: '普通', edge: '#2f6b2a', mid: '#58a83c', hi: '#a6e07a' },
  b: { name: '稀有', edge: '#1f3f78', mid: '#3f78d0', hi: '#9cc4ff' },
  o: { name: '传说', edge: '#7a4a10', mid: '#d69a2a', hi: '#ffe08a' },
};
const KIND_NAME = { tower: '塔', general: '通用', adv: '进阶', spell: '法术', eco: '经济', debuff: '减益' };
const cardCache = {};
function cardFrame(rar) {
  if (cardCache[rar]) return cardCache[rar];
  const w = CARD_W / PIX, h = CARD_H / PIX, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), R = RARITY[rar];
  g.fillStyle = '#1a1410'; g.fillRect(1, 0, w - 2, h); g.fillRect(0, 1, w, h - 2);
  g.fillStyle = R.edge; g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = R.mid; g.fillRect(2, 2, w - 4, h - 4);
  g.fillStyle = R.hi; g.fillRect(2, 2, w - 4, 1); g.fillRect(2, 2, 1, h - 4);
  g.fillStyle = '#20263a'; g.fillRect(4, 4, w - 8, 30);                 // 图标区
  for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(5 + ((i * 37) % (w - 10)), 5 + ((i * 17) % 28), 1, 1); }
  g.fillStyle = '#e9dcb8'; g.fillRect(4, 36, w - 8, h - 40);             // 文字区（羊皮纸）
  g.fillStyle = '#d6c69a'; g.fillRect(4, 36, w - 8, 1);
  g.fillStyle = R.mid; g.fillRect(6, 33, w - 12, 6);                     // 名字条
  g.fillStyle = R.hi; g.fillRect(6, 33, w - 12, 1);
  for (const [x, y] of [[1, 1], [w - 3, 1], [1, h - 3], [w - 3, h - 3]]) { g.fillStyle = R.hi; g.fillRect(x, y, 2, 2); }
  return (cardCache[rar] = c);
}
function cardRects() {
  const n = G.choice.length, gap = 40, total = n * CARD_W + (n - 1) * gap, x0 = (MW - total) / 2, y = MH / 2 - CARD_H / 2 + 10;
  return G.choice.map((c, i) => ({ c, x: x0 + i * (CARD_W + gap), y, w: CARD_W, h: CARD_H }));
}
function rerollRect() { return { x: MW / 2 - 100, y: MH / 2 + CARD_H / 2 + 26, w: 200, h: 44 }; }

function drawPixelIcon(c, cx, cy) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (c.tower) {
    const img = towerImg(c.tower), small = document.createElement('canvas'); small.width = 26; small.height = Math.round(26 * img.height / img.width);
    const sg = small.getContext('2d'); if (!I[TOWERS[c.tower].img] && TOWER_TINT[c.tower]) sg.filter = TOWER_TINT[c.tower]; sg.drawImage(img, 0, 0, small.width, small.height);
    const s = 3.2; ctx.drawImage(small, cx - small.width * s / 2, cy - small.height * s / 2 + 4, small.width * s, small.height * s);
  } else {
    const ch = { general: '令', spell: '符', eco: '钱', debuff: '煞' }[c.kind] || '符';
    const col = { general: '#f2c94a', spell: '#7fa8ff', eco: '#f2c94a', debuff: '#c58cf2' }[c.kind];
    const P = 6; ctx.fillStyle = '#2a1b12'; ctx.fillRect(cx - 5 * P, cy - 7 * P, 10 * P, 14 * P);
    ctx.fillStyle = col; ctx.fillRect(cx - 4 * P, cy - 6 * P, 8 * P, 12 * P);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - 4 * P, cy - 6 * P, P, 12 * P);
    ctx.fillStyle = '#b3261b'; ctx.font = 'bold 34px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, cx, cy + 2);
  }
  ctx.restore();
}

function wrapText(s, x, y, maxW, lh) {
  let line = '', yy = y;
  for (const ch of s) { if (ctx.measureText(line + ch).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh; } else line += ch; }
  if (line) ctx.fillText(line, x, yy);
}

function drawCardPick() {
  G.pickAnim = Math.min(1, (G.pickAnim || 0) + 0.06);
  ctx.fillStyle = 'rgba(10,8,4,.62)'; ctx.fillRect(0, 0, MW, MH);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffdf8a'; ctx.font = '40px "ZCOOL QingKe HuangYou","Noto Serif SC",sans-serif';
  ctx.fillText(G.wave === 0 ? '选择开局祝福' : '击退第 ' + G.wave + ' 波 · 选择一张', MW / 2, MH / 2 - CARD_H / 2 - 52);
  for (const r of cardRects()) {
    const c = r.c, hov = mouse && mouse[0] > r.x && mouse[0] < r.x + r.w && mouse[1] > r.y && mouse[1] < r.y + r.h;
    const lift = (1 - G.pickAnim) * 60 + (hov ? -10 : 0);
    const x = r.x, y = r.y + lift;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (c.rarity === 'o') { ctx.shadowColor = 'rgba(255,200,80,.9)'; ctx.shadowBlur = 24 + 8 * Math.sin(NOW * 4); }
    else if (hov) { ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 16; }
    ctx.drawImage(cardFrame(c.rarity), x, y, r.w, r.h); ctx.restore();
    drawPixelIcon(c, x + r.w / 2, y + 16 + 60);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '22px "ZCOOL QingKe HuangYou","Noto Serif SC",sans-serif'; ctx.fillStyle = '#fff8e0'; ctx.lineWidth = 4; ctx.strokeStyle = '#2a1b12';
    ctx.strokeText(c.name, x + r.w / 2, y + 144); ctx.fillText(c.name, x + r.w / 2, y + 144);
    ctx.font = '13px "Noto Serif SC",serif'; ctx.fillStyle = RARITY[c.rarity].edge;
    ctx.fillText(RARITY[c.rarity].name + ' · ' + (c.tower ? TOWERS[c.tower].name : KIND_NAME[c.kind]), x + r.w / 2, y + 174);
    ctx.font = '16px "Noto Serif SC",serif'; ctx.fillStyle = '#3a2a14'; ctx.textBaseline = 'top';
    wrapText(c.desc, x + r.w / 2, y + 194, r.w - 36, 22);
    const n = G.picks[c.id] || 0;
    if (n) { ctx.font = '12px sans-serif'; ctx.fillStyle = '#7a6a4a'; ctx.textBaseline = 'alphabetic'; ctx.fillText('已拥有 ' + n + '/' + c.max, x + r.w / 2, y + r.h - 14); }
  }
  const rr = rerollRect(), can = !G.rerolled && G.coins >= ECONOMY.rerollCost;
  pixelButton(rr, G.rerolled ? '已重抽' : '重抽（' + ECONOMY.rerollCost + ' 铜钱）', can ? '#8a5a2a' : '#4a4038', can);
}
