# TD游戏（任家镇塔防）

任家镇外 · 中国风地图塔防。与《暂时停止呼吸》割草游戏是两个独立项目。

- `public/index.html`：正式版（给玩家）https://td2026.netlify.app/
- `public/dev/index.html`：开发版（带调试模式）https://td2026.netlify.app/dev/
- 两者都由 `src` 生成，Netlify 发布目录为 `public`
- `src/config/`：数值、卡牌、布局；`src/js/`：功能模块；`src/td_template.html`：页面外壳
- `src/map_cn.jpg`：中国风地图（AI 出图）
- `src/hall.png`、`src/tower.png`：茅山主殿、茅山符塔（AI 出图，已抠图）
- `src/px_*.png`：原版像素道长、僵尸、幽魂、尸王
- `src/bagua_platform.png`：八卦石台（暂未使用，备用）
- 空地 + 小令旗是代码绘制的

更新流程：从最新 `main` 开分支 → 改 `src` → `python3 src/build.py` → 提交 → 开 PR → 在 Netlify 预览网址验证 → 合并后自动部署。

协作规则见 `AGENTS.md`；玩法见 `docs/第一关设计.md`；可领取的任务见 `docs/任务卡.md`。
