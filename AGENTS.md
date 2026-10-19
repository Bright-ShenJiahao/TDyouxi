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
- `src/td_template.html`：页面代码（地图、主殿、符塔、英雄、僵尸、路线、空地、调试模式）
- `src/build.py`：打包脚本
- `src/map_cn.jpg`：中国风地图；`src/hall.png`、`src/tower.png`：主殿、符塔
- `src/px_taoist.png`、`src/px_zombie.png`：像素道长、僵尸
- `src/bagua_platform.png`：八卦石台（备用，暂未使用）
- 布局（主殿、塔位、英雄守点、路线点、各尺寸）写在模板的 `DEFAULT` 里。Shen 在开发版里调好后会发来「导出布局」的文字，把它替换进 `DEFAULT` 即可。

## 6. 版权
- 不要放入其他游戏的角色、截图或素材（例如梦幻西游的剑侠客、王国保卫战的原图）。
