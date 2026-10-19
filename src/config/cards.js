/* =====================================================================
 * 卡池（新增卡牌只改这个文件）
 * rarity: 'g' 绿/普通  'b' 蓝/稀有  'o' 金/传说
 * kind:   tower 塔特色 | general 通用 | adv 进阶 | spell 一次性法术 | eco 经济 | debuff 怪物减益
 * tower:  这张卡属于哪种塔（用于流派引导），通用卡为 null
 * max:    一局最多选几次
 * apply(M): 修改全局加成 M（结构见 src/js/cards.js 里的 newMods）
 * ===================================================================== */

const CARDS = [
  // ---------- 塔的特色卡 ----------
  { id: 'fu_double', name: '双符连发', rarity: 'b', kind: 'tower', tower: 'fu', max: 2,
    desc: '符塔每次多掷 1 张符', apply: M => { M.fuShots += 1; } },
  { id: 'fu_pierce', name: '破煞符', rarity: 'g', kind: 'tower', tower: 'fu', max: 3,
    desc: '符塔伤害 +20%', apply: M => { M.dmg.fu += 0.20; } },
  { id: 'fu_fast', name: '疾符手', rarity: 'g', kind: 'tower', tower: 'fu', max: 3,
    desc: '符塔攻速 +18%', apply: M => { M.rate.fu += 0.18; } },

  { id: 'lei_chain', name: '雷链', rarity: 'b', kind: 'tower', tower: 'lei', max: 2,
    desc: '雷法塔连锁目标 +1', apply: M => { M.leiChain += 1; } },
  { id: 'lei_stun', name: '掌心雷', rarity: 'g', kind: 'tower', tower: 'lei', max: 2,
    desc: '雷击有 15% 概率定身 1 秒', apply: M => { M.leiStun += 0.15; } },
  { id: 'lei_power', name: '天师敕令', rarity: 'g', kind: 'tower', tower: 'lei', max: 3,
    desc: '雷法塔伤害 +22%', apply: M => { M.dmg.lei += 0.22; } },

  { id: 'pao_big', name: '火药加倍', rarity: 'g', kind: 'tower', tower: 'pao', max: 3,
    desc: '朱砂炮爆炸范围 +25%', apply: M => { M.splash += 0.25; } },
  { id: 'pao_burn', name: '朱砂灼烧', rarity: 'b', kind: 'tower', tower: 'pao', max: 2,
    desc: '被炮击的敌人每秒受 8 点灼烧，持续 3 秒', apply: M => { M.burn += 8; } },
  { id: 'pao_power', name: '铁砂弹', rarity: 'g', kind: 'tower', tower: 'pao', max: 3,
    desc: '朱砂炮塔伤害 +20%', apply: M => { M.dmg.pao += 0.20; } },

  { id: 'wang_slow', name: '缚魂丝', rarity: 'g', kind: 'tower', tower: 'wang', max: 3,
    desc: '符网减速效果 +12%', apply: M => { M.slow += 0.12; } },
  { id: 'wang_wide', name: '大罗网', rarity: 'g', kind: 'tower', tower: 'wang', max: 2,
    desc: '符网塔射程 +20%', apply: M => { M.range.wang += 0.20; } },
  { id: 'wang_power', name: '五毒网', rarity: 'b', kind: 'tower', tower: 'wang', max: 2,
    desc: '符网伤害 +60%', apply: M => { M.dmg.wang += 0.60; } },

  // ---------- 通用卡 ----------
  { id: 'all_rate', name: '急急如律令', rarity: 'g', kind: 'general', tower: null, max: 3,
    desc: '所有塔攻速 +10%', apply: M => { for (const k in M.rate) M.rate[k] += 0.10; } },
  { id: 'all_dmg', name: '开光', rarity: 'g', kind: 'general', tower: null, max: 3,
    desc: '所有塔伤害 +10%', apply: M => { for (const k in M.dmg) M.dmg[k] += 0.10; } },
  { id: 'all_range', name: '登高望远', rarity: 'g', kind: 'general', tower: null, max: 2,
    desc: '所有塔增高，射程 +10%', apply: M => { for (const k in M.range) M.range[k] += 0.10; } },
  { id: 'all_combo', name: '连环符', rarity: 'b', kind: 'general', tower: null, max: 2,
    desc: '所有塔 12% 概率连击（再攻击一次）', apply: M => { M.combo += 0.12; } },
  { id: 'phys_up', name: '桃木加持', rarity: 'b', kind: 'general', tower: null, max: 2,
    desc: '所有物理伤害 +18%', apply: M => { M.physMul += 0.18; } },
  { id: 'magic_up', name: '三清护法', rarity: 'b', kind: 'general', tower: null, max: 2,
    desc: '所有法术伤害 +18%', apply: M => { M.magicMul += 0.18; } },

  // ---------- 进阶（金卡，一局最多一张，满级塔可突破） ----------
  { id: 'adv_fu', name: '突破·七星剑台', rarity: 'o', kind: 'adv', tower: 'fu', max: 1,
    desc: '符塔满级后可突破：同时攻击 3 个目标，伤害 +30%', apply: M => { M.adv = 'fu'; } },
  { id: 'adv_lei', name: '突破·五雷轰顶', rarity: 'o', kind: 'adv', tower: 'lei', max: 1,
    desc: '雷法塔满级后可突破：每 6 秒对射程内全部敌人落雷', apply: M => { M.adv = 'lei'; } },
  { id: 'adv_pao', name: '突破·红衣大炮', rarity: 'o', kind: 'adv', tower: 'pao', max: 1,
    desc: '朱砂炮满级后可突破：伤害 ×1.7，射程 +30', apply: M => { M.adv = 'pao'; } },
  { id: 'adv_wang', name: '突破·天罗地网', rarity: 'o', kind: 'adv', tower: 'wang', max: 1,
    desc: '符网塔满级后可突破：减速 60%，25% 概率定身', apply: M => { M.adv = 'wang'; } },

  // ---------- 一次性法术（进技能栏，手动使用） ----------
  { id: 'sp_thunder', name: '天雷符', rarity: 'b', kind: 'spell', tower: null, max: 9,
    desc: '技能：指定位置落雷，范围法术伤害 220', apply: M => { M.spells.push('thunder'); } },
  { id: 'sp_freeze', name: '定身符', rarity: 'b', kind: 'spell', tower: null, max: 9,
    desc: '技能：全场敌人定身 3 秒', apply: M => { M.spells.push('freeze'); } },

  // ---------- 经济 ----------
  { id: 'eco_wave', name: '香火钱', rarity: 'g', kind: 'eco', tower: null, max: 3,
    desc: '每波结束额外 +25 铜钱', apply: M => { M.waveCoins += 25; } },
  { id: 'eco_discount', name: '同门帮衬', rarity: 'g', kind: 'eco', tower: null, max: 2,
    desc: '建造和升级打九折', apply: M => { M.discount += 0.10; } },
  { id: 'eco_kill', name: '超度钱', rarity: 'g', kind: 'eco', tower: null, max: 2,
    desc: '每消灭一只敌人额外 +2 铜钱', apply: M => { M.killCoins += 2; } },
  { id: 'eco_now', name: '聚宝盆', rarity: 'b', kind: 'eco', tower: null, max: 2,
    desc: '立刻获得 160 铜钱', apply: (M, G) => { G.coins += 160; } },

  // ---------- 怪物减益 ----------
  { id: 'db_slow', name: '阴风阻路', rarity: 'g', kind: 'debuff', tower: null, max: 2,
    desc: '所有敌人移速 -8%', apply: M => { M.enemySlow += 0.08; } },
  { id: 'db_hp', name: '烈日当空', rarity: 'b', kind: 'debuff', tower: null, max: 2,
    desc: '所有敌人血量 -10%', apply: M => { M.enemyHp -= 0.10; } },
  { id: 'db_ghost', name: '照妖镜', rarity: 'g', kind: 'debuff', tower: null, max: 2,
    desc: '幽魂物理抗性 -30%', apply: M => { M.ghostArmor -= 0.30; } },
  { id: 'db_zombie', name: '糯米撒路', rarity: 'g', kind: 'debuff', tower: null, max: 2,
    desc: '僵尸法术抗性 -25%', apply: M => { M.zombieMres -= 0.25; } },
];
