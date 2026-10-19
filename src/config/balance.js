/* =====================================================================
 * 数值配置（调平衡只改这个文件）
 * 说明见 docs/第一关设计.md
 * ===================================================================== */

const ECONOMY = {
  startCoins: 250,        // 开局铜钱
  lives: 20,              // 主殿阴气
  sellRate: 0.7,          // 出售返还比例
  rerollCost: 20,         // 重抽价格（每次选卡最多 1 次）
  waveBonusBase: 30,      // 每波结束固定奖励
  waveBonusPerWave: 6,    // 每波奖励随波次增加
  earlyCallPerSec: 2,     // 提前召唤：每剩 1 秒奖励的铜钱
  prepTime: 12,           // 两波之间的准备时间（秒）
  firstPrepTime: 25,      // 第一波前的准备时间
};

// 伤害类型：phys 物理，magic 法术
// lv: 每级数值；cost[0] 为建造价，cost[1]/cost[2] 为升到 2/3 级的价格
const TOWERS = {
  fu: {
    name: '符塔', type: 'phys', img: 'tower', desc: '物理单体 · 攻速快',
    cost: [70, 60, 90],
    lv: [
      { dmg: 14, interval: 0.80, range: 175, shots: 1 },
      { dmg: 20, interval: 0.68, range: 185, shots: 1 },
      { dmg: 27, interval: 0.58, range: 198, shots: 2 },
    ],
    advanced: { name: '七星剑台', cost: 160, desc: '同时攻击 3 个目标，伤害 +30%' },
  },
  lei: {
    name: '雷法塔', type: 'magic', img: 'tlei', desc: '法术单体 · 伤害高',
    cost: [110, 90, 130],
    lv: [
      { dmg: 42, interval: 1.6, range: 185, chain: 0 },
      { dmg: 62, interval: 1.45, range: 195, chain: 0 },
      { dmg: 86, interval: 1.3, range: 210, chain: 1 },
    ],
    advanced: { name: '五雷轰顶', cost: 200, desc: '每 6 秒对射程内全部敌人落雷' },
  },
  pao: {
    name: '朱砂炮塔', type: 'phys', img: 'tpao', desc: '物理范围 · 清群',
    cost: [100, 80, 120],
    lv: [
      { dmg: 26, interval: 2.0, range: 190, splash: 50 },
      { dmg: 37, interval: 1.8, range: 200, splash: 58 },
      { dmg: 52, interval: 1.6, range: 215, splash: 70 },
    ],
    advanced: { name: '红衣大炮', cost: 180, desc: '伤害 ×1.7，射程 +30' },
  },
  wang: {
    name: '符网塔', type: 'magic', img: 'twang', desc: '法术范围 · 减速',
    cost: [80, 70, 100],
    lv: [
      { dmg: 7, interval: 1.0, range: 140, slow: 0.30, stun: 0 },
      { dmg: 10, interval: 1.0, range: 150, slow: 0.40, stun: 0 },
      { dmg: 14, interval: 1.0, range: 165, slow: 0.50, stun: 0.06 },
    ],
    advanced: { name: '天罗地网', cost: 170, desc: '减速 60%，每次张网 25% 概率定身' },
  },
};

const TAVERN = {
  name: '英雄酒馆', desc: '召唤道长守路口（全图一座）',
  cost: [120, 100, 150],
  hero: [
    { hp: 260, dmg: 22, interval: 0.9, aoeDmg: 28, aoeCd: 6, aoeR: 70 },
    { hp: 340, dmg: 29, interval: 0.85, aoeDmg: 38, aoeCd: 5.5, aoeR: 76 },
    { hp: 440, dmg: 38, interval: 0.8, aoeDmg: 50, aoeCd: 5, aoeR: 84 },
  ],
  respawn: 10,
  block: 2,          // 同时最多拦住几只
  regen: 14,         // 不战斗时每秒回血
};

// armor 物理抗性，mres 法术抗性；leak 走到主殿扣的阴气
const ENEMIES = {
  zombie: { name: '僵尸', img: 'pz', hp: 52, speed: 32, armor: 0, mres: 0.25, bounty: 7, leak: 1, size: 34, hop: true, blockable: true },
  ghost:  { name: '幽魂', img: 'pg', hp: 46, speed: 54, armor: 0.80, mres: 0, bounty: 6, leak: 1, size: 34, hop: false, blockable: false },
  king:   { name: '尸王', img: 'pk', hp: 2200, speed: 20, armor: 0.25, mres: 0.25, bounty: 150, leak: 5, size: 58, hop: true, blockable: true, boss: true },
};

// 每波怪物：[类型, 数量, 出怪间隔(秒), 路线(0 中路 / 1 上路 / 2 下路，省略则三路轮流)]
// 前几波只走中路，教玩家建塔；之后才分路
// hpScale：本波血量倍率
const WAVES = [
  { hpScale: 0.85, groups: [['zombie', 7, 1.8, 0]] },
  { hpScale: 0.95, groups: [['zombie', 11, 1.3, 0]] },
  { hpScale: 1.10, groups: [['zombie', 8, 1.0, 0], ['zombie', 8, 1.0, 2]] },
  { hpScale: 1.15, groups: [['zombie', 10, 1.0, 0], ['ghost', 6, 1.2, 2]] },
  { hpScale: 1.22, groups: [['ghost', 12, 0.8], ['zombie', 14, 0.8]] },
  { hpScale: 1.35, groups: [['zombie', 24, 0.6]] },
  { hpScale: 1.40, groups: [['ghost', 18, 0.6], ['zombie', 16, 0.7]] },
  { hpScale: 1.52, groups: [['zombie', 24, 0.55], ['ghost', 16, 0.6]] },
  { hpScale: 1.65, groups: [['ghost', 22, 0.5], ['zombie', 28, 0.5]] },
  { hpScale: 1.85, groups: [['zombie', 16, 0.7], ['king', 1, 1], ['ghost', 12, 0.8], ['zombie', 14, 0.6]] },
];

// 选卡概率：随波次变化 [绿, 蓝, 金]
function rarityWeights(wave) {
  if (wave <= 2) return [70, 28, 2];
  if (wave <= 5) return [55, 35, 10];
  return [42, 40, 18];
}
const STREAK_BONUS = 0.6;   // 流派引导：每选过一张某塔的卡，该塔卡权重 +60%
