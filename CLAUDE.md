# CLAUDE.md — mdlink 项目背景与约定

## 是什么
mdlink = 把 Markdown / 对话内容一键转成「云端可分享的精美 HTML 报告」，部署到**用户自己的 GitHub Pages**（BYO-host）。形态 = skill + CLI（Node ESM，node>=20）。

## 核心约束（改代码前必读）
- **去中心 / 不担审核（法律地基）**：内容只部署到用户自有 GitHub repo + Pages，用用户自己的凭证。维护者是「工具作者」不是「平台方」。**严禁任何跨用户汇总/浏览入口或中心服务**——首页索引只列本站点自己的报告。
- **clean-room**：架构借鉴阿里内部 `@ali/aper-pages`（参考源码 `~/Documents/git/pages`，gitlab 内部仓），**禁止 copy 代码、禁止把其 origin 推到公开 GitHub**。
- **凭证不落盘**：GitHub token 绝不进 `.git/config`、worktree config、commit、日志。认证优先 `gh` 助手 / `GIT_ASKPASS`，token 只经子进程 env 注入。日志一律走 `lib/log.mjs` 的 `redact`。

## 关键决策
- **部署**：GitHub Pages 分支部署只伺服仓库根或 /docs，不支持 /src ⇒ 用 **gh-pages 分支、站点在工作区根**。`~/.mdlink` 工作树 = gh-pages 分支；`mdlink.yml`/`templates/`/`.cache/` 用 `.gitignore` 排除，不进站点。
- **认证**：token-HTTPS（remote URL 无 token，靠 GIT_ASKPASS 注入），不用 SSH。
- **产物**：单文件自包含 HTML，Tailwind+Alpine via `cdn.jsdelivr.net`，不引 React/Vue。
- **首页**：报告倒序时间轴，>30 天默认折叠——**折叠在浏览时按当前日期算**（前端 fetch pages.json + Alpine），不在发布时固化。
- **路径**：模板内本地链接用相对路径（report 页用 `{{ROOT}}` 前缀），适配 project pages `/<repo>/` base。

## 结构
- `bin/mdlink.mjs` 入口路由｜`cmds/` 子命令（init/publish/doctor/serve/template）｜`lib/` 纯逻辑
- 阿里→GitHub 的改造收敛在 `lib/gh.mjs`（repo/Pages，REST）+ `lib/git.mjs`（token-HTTPS、commit/push/rebase、pages.json 语义合并）

## 测试
- 纯函数：`vitest`（`tests/unit/`，`npm test`）。
- 前端/模板改动：**除 vitest 外必须跑 Playwright 截图**（`tests/e2e/`，`npm run test:e2e`）。

## 规格
设计/验收规格在 `openspec/changes/mdlink-mvp/`（proposal/design/specs/tasks）。改行为先更 spec，`openspec validate --strict` 须过。
