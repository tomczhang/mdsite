## Why

团队日常最高频的需求是：在对话/聊天里把一段内容（Markdown 或现成 HTML）一键变成「云端可分享的精美 HTML 报告」。现成的内部方案 `@ali/aper-pages` 依赖阿里内网基建（Aone Pages CI、a1 CLI），无法对外使用且有 IP 包袱。mdsite 用 clean-room 重写其设计思路，把基建换成**每个用户自己的 GitHub**（Pages + Action），让维护者只做「工具作者」而非「内容托管/审核方」。本变更交付可跑通「一条命令出可访问链接」的 MVP。

## What Changes

- 新建一个 **skill + CLI**（JavaScript / Node ESM）项目骨架：`bin/` 入口、`cmds/` 子命令、`lib/` 纯逻辑、`templates/` 内置模板、`skill/` 调用说明、`tests/`。
- `init`：在**用户自己的 GitHub** 建/复用 repo，准备本地工作区（`~/.mdsite`），开启 gh-pages 分支的 GitHub Pages，铺好首页。
- `publish`（核心）：输入 `.md` 或 `.html` → 统一渲染成**单文件自包含 HTML** → 归档进本地工作区 → 写入 `pages.json` 索引 → push 到用户 gh-pages → 返回真实 Pages 链接。
- `doctor` / `serve` / `template`：体检、本地预览、模板管理（双层模板，用户层覆盖内置层）。
- **站点首页索引**：当前用户已发布报告的倒序时间轴，>30 天默认折叠（纯前端）。
- 认证用用户自己的 `GITHUB_TOKEN`；git remote 走 token-HTTPS；产物 CDN 用 `cdn.jsdelivr.net`。
- **BREAKING**：无（全新项目，无既有契约）。

### Non-goals（二期，不在本变更范围）

- 镜像 fan-out（多远端同步部署）
- 钉钉/IM 通知
- 真实构建链（Vite/Astro 等需 `npm run build` 的站点）；MVP 只做纯静态自包含 HTML
- 任何跨用户聚合/浏览入口（**永久禁止**，见 `deploy-isolation`）

## Capabilities

### New Capabilities

- `cli-core`: CLI 入口与子命令骨架（`init` / `doctor` / `serve` / `template`）、本地 git 工作区与带注释 YAML 配置、双层模板解析。
- `content-rendering`: 把 `.md` / `.html` 输入统一转成单文件自包含 HTML（Markdown→HTML 正文 + 模板占位渲染 + 内置 `report` 模板 + Tailwind/Alpine via jsdelivr CDN）。
- `github-publish`: `publish` 编排 + GitHub 部署机制 —— 归档产物、用 token-HTTPS 把内容 push 到用户 gh-pages 分支、确保 GitHub Pages 已开启、回链真实页面 URL。
- `deploy-isolation`: 【@Researcher 已撰写】产品的法律地基硬约束 —— 内容只部署到用户自有 GitHub、只用用户自己凭证、不内嵌维护者 token、索引必须 per-user，严禁任何跨用户汇总入口/服务。
- `site-index`: 【@Researcher 已撰写】站点首页时间轴索引 + 超 30 天折叠（折叠阈值浏览时计算）+ project-pages 相对路径正确性 + 多设备 `pages.json` 语义合并。

### Modified Capabilities

（无 —— `openspec/specs/` 当前为空，全部为新建。）

## Impact

- **新增代码**：`bin/mdsite.mjs`；`cmds/{init,publish,doctor,serve,template}.mjs`；`lib/{gh,git,markdown,render,pages-json,config,url,paths,log}.mjs`；`templates/{index,report}.html`；`skill/SKILL.md`；`tests/{unit,e2e}/`。
- **依赖**：`zx`（$/fs/path 注入）、一个 Markdown 解析器（如 `marked`）；GitHub Pages 截图测试用 Playwright；单测用 vitest。
- **外部系统**：用户的 GitHub（repo + Pages + token）。维护者侧**无任何后端/基础设施**。
- **运行时环境**：node>=20，需 `GITHUB_TOKEN`（或 `gh auth`）。
- **参考（仅借鉴、禁 copy）**：`~/Documents/git/pages`（@ali/aper-pages，gitlab 内部仓，禁推公开 GitHub）。
