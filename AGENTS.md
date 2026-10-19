# TDyouxi 协作规则（所有 AI 助手开工前必读）

本仓库由多个 AI 助手（Claude、ChatGPT Codex 等）协作开发，仓库主人 Shen 负责审核与合并。
目标：**互不覆盖、每次改动都可验证、玩家永远只看到正式版。**

## 1. 分支与合并
- `main` 已开启保护，**任何人都不能直接推送到 main**，只能通过 Pull Request 合并。
- 开工前先拉取最新的 `main`，从它新建分支：
  - Claude：`claude/任务名`
  - Codex：`codex/任务名`
  - 其他助手：`助手名/任务名`
- 一个分支只做一件事。改完提 PR，**由 Shen 点合并**，助手不要自行合并。
- 如果开 PR 时 `main` 已经更新，先把最新 `main` 合进自己的分支、解决冲突，重新打包后再提交。

## 2. 改哪里
- 只改 `src/` 里的文件。`public/` 是打包结果，**不要手改**。
- 改完运行 `python3 src/build.py`，把 `src/` 和重新生成的 `public/` 一起提交。
- 打包会生成两个版本：
  - `public/index.html`：**正式版**，给玩家，网址 https://td2026.netlify.app/
  - `public/dev/index.html`：**开发版**，带调试模式，只给 Shen 调布局，网址 https://td2026.netlify.app/dev/
- 调试相关的代码必须放在模板标记里，打包时会从正式版中整段删除：
  - HTML：`<!--DEV-->…<!--/DEV-->`（只在开发版）、`<!--REL-->…<!--/REL-->`（只在正式版）
  - JS / CSS：`/*DEV*/…/*/DEV*/`、`/*REL*/…/*/REL*/`
- `build.py` 会自动检查正式版里有没有残留的调试内容，检查不过就不要提交。
- 只改任务需要的部分，不要重写、重排或"顺便优化"无关代码。

## 3. 记录
- 每次改动在 `CHANGELOG.md` 表格顶部加一行：`| 日期 时间 | 谁 | 改了什么 | 影响 |`。
- PR 说明里写清楚：改了哪些文件、改了什么、怎么验证（打开页面后看哪里、做什么操作）。

## 4. 验证
- 提交前在本地用浏览器打开 `public/index.html` 和 `public/dev/index.html`，确认能正常运行、控制台没有报错。
- 开 PR 后，Netlify 会生成预览网址（`deploy-preview-编号--td2026.netlify.app`），在预览网址上再确认一次。
- 合并后打开正式网址确认一次。

## 5. 项目结构
- `src/config/`：**纯数据**，调数值、加卡牌只改这里
  - `balance.js`：经济、四种塔、英雄酒馆、怪物、波次、选卡概率
  - `cards.js`：卡池
  - `layout.js`：主殿、空地、三条路线的坐标和尺寸
- `src/js/`：功能模块（打包时按 `src/build.py` 里 `SCRIPTS` 的顺序拼接）
  - `core.js` 状态与主循环；`enemies.js` 怪物；`towers.js` 塔与子弹；`hero.js` 英雄酒馆与道长；`cards.js` 选卡与法术；`ui.js` 画面、菜单、点击
  - `debug.js` 调试模式，**只进开发版**
- `src/td_template.html`：页面外壳
- 素材：`map_cn.jpg` 地图，`hall.png` 主殿，`tower.png` 符塔，`px_*.png` 像素道长 / 僵尸 / 幽魂 / 尸王
- 文档：`docs/第一关设计.md`（玩法）、`docs/任务卡.md`（可领取的任务）、`docs/美术规范与提示词.md`（出图）
- 新增 JS 文件要在 `src/build.py` 的 `SCRIPTS` 里登记，否则不会被打包。

## 6. 版权
- 不要放入其他游戏的角色、截图或素材（例如梦幻西游的剑侠客、王国保卫战的原图）。
