# TD游戏（任家镇塔防）

任家镇外 · 中国风地图塔防。与《暂时停止呼吸》割草游戏是两个独立项目。

- `public/index.html`：正式版（给玩家）https://td2026.netlify.app/
- `public/dev/index.html`：开发版（带调试模式）https://td2026.netlify.app/dev/
- 两者都由 `src` 生成，Netlify 发布目录为 `public`
- `src/td_template.html`：页面代码（含调试模式：拖动主殿 / 空地 / 英雄 / 路线点，导出布局）
- `src/map_cn.jpg`：中国风地图（AI 出图）
- `src/hall.png`、`src/tower.png`：茅山主殿、茅山符塔（AI 出图，已抠图）
- `src/px_taoist.png`、`src/px_zombie.png`：原版像素道长、僵尸
- `src/bagua_platform.png`：八卦石台（暂未使用，备用）
- 空地 + 小令旗是代码绘制的

更新流程：从最新 `main` 开分支 → 改 `src` → `python3 src/build.py` → 提交 → 开 PR → 在 Netlify 预览网址验证 → 合并后自动部署。

协作规则见 `AGENTS.md`。
