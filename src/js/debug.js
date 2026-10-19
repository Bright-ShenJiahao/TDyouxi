/* =====================================================================
 * 调试模式（只打包进开发版 /dev/，正式版不包含这个文件）
 * 拖动：主殿 / 空地 / 路线点；导出 / 导入 / 恢复默认布局；测试用作弊按钮
 * ===================================================================== */
const DBG = { on: false, sel: null, drag: null };
const RC = ['#ff5a4e', '#3fa7d6', '#7ee0c3'];
function same(a, b) { return Math.abs(a[0] - b[0]) < 1.5 && Math.abs(a[1] - b[1]) < 1.5; }
function dbgSave() {
  LAY.slots = G.slots.map(s => [Math.round(s.x), Math.round(s.y)]);
  LAY.routes = LAY.routes.map(r => r.map(p => [Math.round(p[0]), Math.round(p[1])]));
  LAY.hall.x = Math.round(LAY.hall.x); LAY.hall.y = Math.round(LAY.hall.y);
  try { localStorage.setItem('td_layout_v2', JSON.stringify(LAY)); } catch (e) {}
}
function dbgPick(m) {
  for (let r = 0; r < LAY.routes.length; r++) for (let i = 0; i < LAY.routes[r].length; i++) { const p = LAY.routes[r][i]; if (Math.hypot(m[0] - p[0], m[1] - p[1]) < 10) return { k: 'pt', r, i }; }
  const s = slotAt(m); if (s) return { k: 'slot', s };
  const H = LAY.hall, w = H.w, h = w * I.hall.height / I.hall.width;
  if (m[0] > H.x - w / 2 && m[0] < H.x + w / 2 && m[1] > H.y - 0.82 * h && m[1] < H.y + 0.18 * h) return { k: 'hall' };
  return null;
}
function dbgPos() { const s = DBG.sel; if (!s) return null; if (s.k === 'pt') return LAY.routes[s.r][s.i]; if (s.k === 'slot') return [s.s.x, s.s.y]; return [LAY.hall.x, LAY.hall.y]; }
function dbgMove(x, y) {
  const s = DBG.sel; if (!s) return;
  if (s.k === 'pt') { const o = LAY.routes[s.r][s.i].slice(); for (const R of LAY.routes) for (const p of R) if (same(p, o)) { p[0] = x; p[1] = y; } }
  else if (s.k === 'slot') { s.s.x = x; s.s.y = y; }
  else { LAY.hall.x = x; LAY.hall.y = y; }
  if (G.hero) { const rp = rallyPoint(G.hero.slot); G.hero.rx = rp.x; G.hero.ry = rp.y; }
}
function dbgInfo() {
  const s = DBG.sel, p = dbgPos();
  const name = !s ? '未选中' : s.k === 'pt' ? '路线' + (s.r + 1) + ' 第' + (s.i + 1) + '点' : s.k === 'slot' ? (G.slots.indexOf(s.s) + 1) + '号空地' : '主殿';
  document.getElementById('info').textContent = name + (p ? '  x=' + Math.round(p[0]) + ' y=' + Math.round(p[1]) : '');
}
cv.addEventListener('pointerdown', e => { if (!DBG.on) return; const m = toMap(e); DBG.sel = dbgPick(m); if (DBG.sel) { const p = dbgPos(); DBG.drag = { dx: p[0] - m[0], dy: p[1] - m[1] }; cv.setPointerCapture(e.pointerId); } dbgInfo(); });
cv.addEventListener('pointermove', e => { if (DBG.on && DBG.drag && DBG.sel) { const m = toMap(e); dbgMove(m[0] + DBG.drag.dx, m[1] + DBG.drag.dy); dbgInfo(); } });
cv.addEventListener('pointerup', () => { if (DBG.drag) { DBG.drag = null; dbgSave(); } });

function drawDebug() {
  ctx.save(); ctx.lineJoin = 'round';
  LAY.routes.forEach((R, ri) => {
    ctx.strokeStyle = RC[ri % RC.length]; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.beginPath(); R.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.setLineDash([]);
    R.forEach(p => { E(p[0], p[1], 6, 6); ctx.fillStyle = RC[ri % RC.length]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); });
  });
  G.slots.forEach((s, i) => { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(i + 1, s.x, s.y - 40); ctx.fillStyle = '#ffe58a'; ctx.fillText(i + 1, s.x, s.y - 40); });
  if (DBG.sel) { const p = dbgPos(); E(p[0], p[1], 14, 10); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.fillStyle = 'rgba(63,167,214,.9)'; ctx.fillRect(MW / 2 - 110, 70, 220, 30); ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('调试中 · 拖动布局', MW / 2, 85);
  ctx.restore();
}

const $ = id => document.getElementById(id);
$('dbgbtn').onclick = e => { DBG.on = !DBG.on; e.target.classList.toggle('on', DBG.on); $('dbgbar').hidden = !DBG.on; DBG.sel = null; G.paused = DBG.on; dbgInfo(); };
$('addSlot').onclick = () => { const s = { i: G.slots.length, x: MW / 2, y: MH / 2, tower: null, seed: Math.random() * 1000 }; G.slots.push(s); DBG.sel = { k: 'slot', s }; dbgSave(); dbgInfo(); };
$('delSel').onclick = () => {
  const s = DBG.sel; if (!s) return;
  if (s.k === 'slot') { if (s.s.tower && s.s.tower.type === 'tavern') sellTavern(s.s); G.slots.splice(G.slots.indexOf(s.s), 1); }
  else if (s.k === 'pt') { const o = LAY.routes[s.r][s.i]; for (const Q of LAY.routes) { const j = Q.findIndex(p => same(p, o)); if (j >= 0 && Q.length > 2) Q.splice(j, 1); } }
  DBG.sel = null; dbgSave(); dbgInfo();
};
$('addPt').onclick = () => { const s = DBG.sel; if (!s || s.k !== 'pt') return; const R = LAY.routes[s.r], a = R[s.i], b = R[s.i + 1] || R[s.i - 1], n = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; R.splice(R[s.i + 1] ? s.i + 1 : s.i, 0, n); DBG.sel = { k: 'pt', r: s.r, i: R.indexOf(n) }; dbgSave(); dbgInfo(); };
$('export').onclick = () => { dbgSave(); const io = $('io'); io.hidden = false; io.value = JSON.stringify({ hall: LAY.hall, slots: LAY.slots, routes: LAY.routes, sizes: LAY.sizes }); io.select(); try { navigator.clipboard.writeText(io.value).catch(() => {}); } catch (e) {} };
$('import').onclick = () => { const io = $('io'); if (io.hidden) { io.hidden = false; io.value = ''; io.focus(); return; } try { Object.assign(LAY, JSON.parse(io.value)); dbgSave(); newGame(); G.state = 'prep'; } catch (e) { $('info').textContent = '布局格式不对，请粘贴「导出布局」得到的完整文字'; } };
$('reset').onclick = () => { try { localStorage.removeItem('td_layout_v2'); } catch (e) {} loadLayout(); newGame(); G.state = 'prep'; DBG.sel = null; dbgInfo(); };
// 测试用
$('cheatCoins').onclick = () => { G.coins += 500; };
$('cheatSkip').onclick = () => { for (const e of G.enemies) if (!e.dead) killEnemy(e); G.spawn = []; };
$('cheatCard').onclick = () => { if (G.state === 'prep' || G.state === 'wave') openCardPick(); };
// 尺寸滑杆
for (const [id, key] of [['zh', 'zombie'], ['hh', 'hero'], ['tw', 'tower'], ['sw', 'slot']]) { $(id).value = LAY.sizes[key]; $(id + 'v').textContent = LAY.sizes[key]; $(id).oninput = e => { LAY.sizes[key] = +e.target.value; $(id + 'v').textContent = e.target.value; if (key === 'zombie') { ENEMIES.zombie.size = ENEMIES.ghost.size = +e.target.value; ENEMIES.king.size = Math.round(+e.target.value * 1.7); } dbgSave(); }; }
$('hw').value = LAY.hall.w; $('hwv').textContent = LAY.hall.w; $('hw').oninput = e => { LAY.hall.w = +e.target.value; $('hwv').textContent = e.target.value; dbgSave(); };
