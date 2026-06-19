## Context

mdsite 是对内部 `@ali/aper-pages` 的 clean-room 重写：把「Markdown/对话 → 单文件自包含 HTML → 云端可分享链接」的能力，从阿里内网基建（Aone Pages CI + a1 CLI）迁移到**每个用户自己的 GitHub**（repo + Pages + token）。参考源码在本机 `~/Documents/git/pages`，**仅借鉴设计、禁止 copy**，其 gitlab 内部 origin 禁推公开 GitHub。

经逐文件勘察，阿里耦合只集中在两处薄文件（`lib/a1.mjs` pipeline 层、`lib/git.mjs` remote 常量）；其余（clone/commit/push/rebase + pages.json 多设备语义合并、模板渲染、配置、URL 拼接）是通用逻辑，重写即可。约束硬条件见 specs：`deploy-isolation`（去中心红线）、`site-index`（时间轴+折叠）。

## Goals / Non-Goals

**Goals:**
- 跑通「一条命令出可访问链接」：`mdsite publish <md|html> --title --category --summary` → 用户 GitHub Pages 上的真实 URL。
- 站点首页 = 该用户报告倒序时间轴，>30 天默认折叠（纯前端）。
- 阿里→GitHub 的全部耦合收敛在 `lib/gh.mjs` + `lib/git.mjs`，其余 lib 与基建无关。
- 维护者零后端：所有内容只活在用户自己的 GitHub。

**Non-Goals:**
- 镜像 fan-out、IM 通知、真实构建链（Vite/Astro）——二期。
- 任何跨用户聚合/浏览入口——**永久禁止**（deploy-isolation）。

## Decisions

### D1. 部署用 gh-pages 分支根，而非 /src 或 Actions
GitHub Pages 分支部署只能伺服**仓库根**或 `/docs`，不支持 `/src`。
- 选 **gh-pages 分支 + 内容放分支根**：本地工作区 `src/` 布局不变、`main` 分支保持干净、零 CI workflow。
- 备选 (a) 本地 src→docs：改动本地布局；(c) GitHub Actions deploy-pages：可部署任意目录但引入 CI 文件、更重。
- 实现（落地选择）：**~/.mdsite 工作树本身 = gh-pages 分支、站点在工作区根**，`mdsite.yml`/`templates/`/`.cache/` 用 `.gitignore` 排除出站点。比"推 src/ 子树到分支根"的 worktree 方案更简单可靠，且天然满足 Pages 分支根服务。`init` 用 GitHub REST 把 Pages source 设为 `gh-pages` 分支根。
- **覆盖保护（@Reviewer）**：复用已存在 repo 且其 `gh-pages` 已有内容时，写入前先探测 mdsite 标记（分支根的 `pages.json`/mdsite 生成的 `index.html`）。非 mdsite 站点 → BLOCK 报错，需 `--force` 或单独 import 才覆盖，避免抹掉用户既有 Pages 站点。

### D2. 认证走 token-HTTPS，不用 SSH；token 绝不持久化（@Reviewer 强化）
参考仓的 git.mjs 全程 SSH。BYO + `GITHUB_TOKEN` 场景下重写为 HTTPS 认证。
- **认证方式优先级**（择不落盘者）：`gh` 凭证助手 > `GIT_ASKPASS` / 一次性 `http.extraHeader`（`Authorization`）> 临时嵌入 remote URL（`https://x-access-token:<TOKEN>@github.com/<repo>.git`）。
- **token 绝不持久化**：不得长期留在 `~/.mdsite/.git/config`、临时 worktree config、commit 或日志/错误输出。若走临时嵌入 URL，push 后必须还原/清除 remote URL。日志对 token 脱敏（`x-access-token:***`）。
- 实现自检：加 grep 测试确保发布后 config/日志里搜不到明文 token。
- **最小权限引导（@Researcher）**：README/init 默认按风险从低到高推荐——① `gh auth login` 复用（token 不落任何文件）为**首选**；② fine-grained PAT 且 Repository access 限「Only select repositories」为那一个 pages 仓库（Contents:write + Pages:write + 建仓所需 Administration:write）次之；③ classic `repo` PAT 仅作"懒人兜底"且**显式标注风险**（它授予该用户全部仓库读写，泄露 blast radius = 整个 GitHub）。token 读取逻辑不变，只是引导默认拉到最小权限。
- 好处：用户无需预配 SSH key，CI/headless 友好。

### D3. lib/gh.mjs 取代 a1 pipeline 层，pipeline 塌缩为「开一次 Pages + push」
aper 的 `pipelineCreate/Update/Run`（调 Aone CI 模板 10014197）在 GitHub Pages 下不需要：push 到 gh-pages 即自动构建部署。
- `gh.mjs` 只保留：`repoView` / `repoCreate`（`gh repo view/create` 或 REST）、`enablePages`（设 Pages source）、可选 `pagesBuildStatus`（轮询 build，用于回链前确认）。
- `pipelineRun` ≈ no-op（顶多轮询 Pages build 状态）。

### D4. lib/git.mjs 重写但保留 aper 的并发合并思路
照搬**思路**（非代码）：clone/commit/push + `fetch→rebase`，rebase 冲突时若仅 `pages.json` 冲突则用 `mergePagesJson` 语义合并（按条目去重、按时间排序、两边新条目都保留）后 `rebase --continue`；其它文件冲突则 `rebase --abort` 把问题交回用户。满足 site-index 的「多设备并发不丢条目」。

### D5. 输入 md/html 统一管线
`publish <input>`：按扩展名分流——`.md` 经 `markdown.mjs`（用 `marked` 之类解析器）转 HTML 正文；`.html` 直通作为正文。两者都灌进模板占位（`{{TITLE}}/{{DATE}}/{{BODY}}/{{SITE_TITLE}}` 等）产出单文件自包含 HTML。skill 在 chat 里把对话内容写成 md/html 临时文件再调 publish。

### D6. 折叠阈值在浏览时算（site-index 关键约束）
首页 `index.html` 内嵌 Alpine：渲染时用 `new Date()` 与每条 `date` 比较，>30 天则默认 `x-show=false`（可展开）。**绝不**在 publish 时把折叠状态写死进 pages.json/HTML——否则时间推移后旧报告永不折叠。pages.json 只存事实数据（title/category/date/url/summary）。

### D9. slug 生成与碰撞（@Reviewer）
归档文件名 = path-safe slug + 唯一化成分。沿用 aper 思路（重写）：`<HHmm>-<hash4>.html`（日期已在路径 `<category>/<YYYY-MM-DD>/` 里）；title-hash 策略时对标题做小写化、非 `[a-z0-9-]` 归一、去首尾连字符、限长，再接 hash 后缀。保证同 category/同日/同标题两篇不互相覆盖，pages.json 两条独立记录。

### D10. 对话→报告主路径进验收（@Reviewer / @chi-zhang）
最高频用法是 chat 里把对话内容变报告。skill 工作流把对话提炼出的 md/html **安全物化**为临时文件 → 调 `publish` → 回传真实 URL。这条路径在 content-rendering 里有验收 scenario（不止文档描述），确保实现不会"通过 spec 却漏掉日常核心流程"。物化用安全临时路径/文件名，用完不残留。

### D7. 模板相对路径，适配 project-pages base
project pages base 带 `/<repo>/`。模板内导航/资源**禁用裸绝对路径** `/index.html`；用相对路径（`./` / `../`）或在 `<head>` 注入正确 `<base href>`。CDN 外链用绝对 `https://cdn.jsdelivr.net/...`（不受 base 影响）。

### D8. 目录与依赖
`bin/mdsite.mjs`（入口+zx 注入）；`cmds/{init,publish,doctor,serve,template}.mjs`；`lib/{gh,git,markdown,render,pages-json,config,url,paths,log}.mjs`；`templates/{index,report}.html`；`skill/SKILL.md`；`tests/{unit,e2e}`。依赖：`zx` + 一个 Markdown 解析器；测试 `vitest` + `@playwright/test`。

## Risks / Trade-offs

- [gh-pages 子树推送复杂度] 把 `src/` 子树推到 gh-pages 根可能比单分支麻烦 → 用专用 worktree 或 `git subtree push`；MVP 先用最简单可靠路径（独立 worktree checkout gh-pages，copy src/* 到根，commit+push），有单测兜住 URL 拼接。
- [Pages 首次部署有延迟] push 后 Pages build 需 ~1 分钟 → 回链时说明「约 1 分钟可访问」，可选轮询 build 状态。
- [token 泄露] token 进 remote URL → 不写入任何可提交文件，日志脱敏；优先支持 `gh` 凭证助手避免裸 token。
- [Markdown 解析器引入依赖] 选成熟库（marked）、锁版本。
- [内容安全 / XSS]（@Researcher 复核确认）MVP 不需净化：用户把**自己的**内容发到**自己的**站点，XSS-to-self 不构成实际威胁；且 `.html` 直通**必须保持不净化**——净化会打掉 Tailwind/Alpine/echarts 等富页面能力，那正是 D5 的核心用途。**边界（将来再评估）**：若 publish 流程将来会吃「第三方撰写、再由用户公开分享给第三方看」的内容，届时需重新评估净化策略。MVP 不涉及。
- [去中心红线被无意破坏] 任何「列出别人页面」的需求都要在 review 拦截 → deploy-isolation spec 作为 @Reviewer 审查清单硬项。

## Migration Plan

全新项目，无存量迁移。交付顺序：CLI 骨架+config/paths → render/markdown+report 模板 → git/gh+publish → site-index 首页 → 测试（vitest + Playwright 截图）。首版打 tag，README 写 BYO 配置（GITHUB_TOKEN、repo 命名）。

## Open Questions

- gh-pages 推送具体实现：独立 worktree vs `git subtree push` vs orphan 分支——实现时取最稳的；不影响 spec。
- 是否在 MVP 就支持 user/org pages（repo=`<user>.github.io`，无 `/<repo>/` 层）——URL 规则已通用（pageUrlOf 只拼 base+rel），设对 deploy_url 即可，无需额外工作。
- Markdown 解析器选型（marked vs markdown-it）——实现时定，倾向 marked（轻、零配置）。
