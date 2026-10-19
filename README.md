# TD游戏（塔防测试版）

任家镇外 · 中国风地图塔防。与《暂时停止呼吸》割草游戏是两个独立项目。

- `public/index.html`：游戏页面（由 `src` 生成，Netlify 发布目录为 `public`）
- `src/td_template.html`：页面代码（含调试模式：拖动主殿 / 空地 / 英雄 / 路线点，导出布局）
- `src/map_cn.jpg`：中国风地图（AI 出图）
- `src/hall.png`、`src/tower.png`：茅山主殿、茅山符塔（AI 出图，已抠图）
- `src/px_taoist.png`、`src/px_zombie.png`：原版像素道长、僵尸
- `src/bagua_platform.png`：八卦石台（暂未使用，备用）
- 空地 + 小令旗是代码绘制的

更新流程：改 `src` → `python3 src/build.py` → 提交 → Netlify 自动部署。

注意：调试模式只用于测试版，正式给玩家前要去掉。
