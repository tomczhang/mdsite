## 1. 项目脚手架

- [x] 1.1 初始化 `package.json`（name=mdsite, type=module, bin.mdsite=bin/mdsite.mjs, engines.node>=20；deps: marked + yaml；devDeps: vitest + @playwright/test） — `package.json`
- [x] 1.2 写 `README.md`（BYO 配置说明：认证按最小权限三档引导——① `gh auth login` 首选 ② fine-grained 单仓 PAT 次之 ③ classic `repo` PAT 兜底并标注风险；repo 命名、一条命令示例、申请 token 链接）与 `CLAUDE.md`（项目背景/决策/禁 copy 来源） — `README.md` `CLAUDE.md`
- [x] 1.3 `.gitignore`（node_modules/、.cache/、build/） — `.gitignore`

## 2. lib 基础层（无基建依赖，纯函数优先可单测）

- [x] 2.1 `lib/paths.mjs`：路径常量（MDSITE_HOME 默认 ~/.mdsite、SITE_DIR、PAGES_JSON、模板目录、CLI 内嵌模板目录） — `lib/paths.mjs`
- [x] 2.2 `lib/log.mjs`：日志/格式化 helper（含 token 脱敏的输出） — `lib/log.mjs`
- [x] 2.3 `lib/url.mjs`：`pageUrlOf(deployUrl, relPath)` 拼真实页面 URL（容错首尾 slash、空 base 兜底） — `lib/url.mjs`
- [x] 2.4 `lib/pages-json.mjs`：`readPagesJson/writePagesJson` + `mergePagesJson`（按条目去重、按时间倒序、两边新条目都保留） — `lib/pages-json.mjs`
- [x] 2.5 `lib/config.mjs`：`mdsite.yml` 读写（带注释 YAML 生成）+ `defaultConfig`（remote.repo/branch、deploy_url=`https://<user>.github.io/<repo>/`、模板映射、storage） — `lib/config.mjs`
- [x] 2.6 `lib/render.mjs`：模板占位渲染（`{{TITLE}}/{{DATE}}/{{BODY}}/{{SITE_TITLE}}` 等替换）+ siteTitle 派生 — `lib/render.mjs`
- [x] 2.7 `lib/markdown.mjs`：Markdown→HTML 正文（marked 封装，标题/列表/代码块/表格/链接/强调） — `lib/markdown.mjs`

## 3. lib 基建层（阿里→GitHub 收敛点，clean-room 重写）

- [x] 3.1 `lib/gh.mjs`：`repoView/repoCreate`（gh CLI 或 REST）、`enablePages`（设 Pages source=gh-pages 根）、可选 `pagesBuildStatus` 轮询；pipelineRun 等价 no-op — `lib/gh.mjs`
- [x] 3.2 `lib/git.mjs`：HTTPS 认证（remote 无 token，凭证经 GIT_ASKPASS 注入）+ clone/commit/push；`fetch→rebase`，仅 pages.json 冲突时调 mergePagesJson 自动合并、其它冲突 abort — `lib/git.mjs`
- [x] 3.3 **token 不持久化**：remote URL 无 token，凭证仅经子进程 env(GIT_ASKPASS)注入，不进 .git/config、commit、日志；日志脱敏（`x-access-token:***`） — `lib/git.mjs` `lib/log.mjs`
- [x] 3.4 gh-pages 发布机制：工作区根即 gh-pages 分支根，直接 commit+push — `lib/git.mjs`
- [x] 3.5 **覆盖保护**：写 gh-pages 前探测 mdsite 标记(.mdsite.json)，非 mdsite 站点 BLOCK，支持 `--force` 显式覆盖 — `lib/gh.mjs`/`cmds/publish.mjs`

## 4. 模板（前端，含截图测试）

- [x] 4.1 `templates/report.html`：Tailwind+Alpine via jsdelivr、排版美观、返回首页导航 + 分享操作、占位符；**相对路径**（禁裸 `/index.html`） — `templates/report.html`
- [x] 4.2 `templates/index.html`：报告倒序时间轴；Alpine 在**浏览时**按 `new Date()` 判定 >30 天默认折叠（x-show，可展开）；相对路径；只渲染本地 pages.json（去中心） — `templates/index.html`
- [x] 4.3 Playwright 截图测试：report 页与 index 页（含「>30天折叠/可展开」交互）渲染快照 — `tests/e2e/templates.spec.*`

## 5. CLI 子命令

- [x] 5.1 `bin/mdsite.mjs`：入口路由，参数解析 + 路由 init/publish/doctor/serve/template，未知命令报用法 — `bin/mdsite.mjs`
- [x] 5.2 `cmds/init.mjs`：whoami/凭证检查 → repoView/Create → enablePages(gh-pages) → 准备本地工作区(git+根 pages.json) → 写 mdsite.yml → 铺首页 — `cmds/init.mjs`
- [x] 5.3 `cmds/publish.mjs`：输入 md/html 分流→render→归档 `<category>/<date>/<slug>.html`(工作区根)→prepend pages.json→重渲首页→commit→push gh-pages→输出真实 URL；category kebab-case 校验 — `cmds/publish.mjs`
- [x] 5.3a **slug 生成**：path-safe 清洗 + 唯一化成分（`<HHmm>-<hash4>`），同标题/同日不覆盖、pages.json 两条独立记录 — `cmds/publish.mjs`/`lib/`
- [x] 5.4 `cmds/doctor.mjs`：校验凭证/工作区/配置；`--silent` 仅退出码 — `cmds/doctor.mjs`
- [x] 5.5 `cmds/serve.mjs`：本地静态伺服工作区根 — `cmds/serve.mjs`
- [x] 5.6 `cmds/template.mjs`：`list` / `eject <type>`（双层模板：用户层覆盖内置层） — `cmds/template.mjs`

## 6. skill

- [x] 6.1 `skill/SKILL.md`：触发词 + 工作流（提取对话→**安全物化为临时 md/html**→ publish → 把真实 URL 转告用户）；命令前缀约定 — `skill/SKILL.md`
- [x] 6.1a **对话→报告端到端验收**：覆盖「拿到对话提炼内容→物化临时文件→publish→返回真实 URL」主路径（content-rendering 的验收 scenario） — `tests/`/`skill/SKILL.md`
- [x] 6.2 `skill/references/`：设计原则 + CDN 依赖说明 — `skill/references/*.md`

## 7. 单测与验收

- [x] 7.1 vitest 单测：url / pages-json(merge) / config / render / markdown 纯函数 — `tests/unit/*.test.mjs`
- [x] 7.2 端到端冒烟（可用临时 repo 或 mock）：`publish foo.md` 走通归档→pages.json→URL 输出 — `tests/`
- [x] 7.3 去中心红线自检：grep/审查确认无任何跨用户聚合入口、无内嵌维护者 token — 全仓
- [x] 7.3a 凭证泄露自检：publish 后 grep `.git/config`/日志确认无明文 token；slug 碰撞用例（同标题同日两篇）单测 — `tests/`
- [x] 7.4 跑全量 `vitest` + Playwright 截图，转 in_review 交 @Reviewer

## 8. 品牌标识

- [x] 8.1 `lib/brand.mjs`：品牌主题色 `#63fe13` + 内联 M 徽标 SVG（`MDSITE_BRAND_COLOR` / `MDSITE_LOGO_SVG`） — `lib/brand.mjs`
- [x] 8.2 `lib/render.mjs`：渲染时注入 `{{LOGO}}` / `{{BRAND_COLOR}}` 占位 — `lib/render.mjs`
- [x] 8.3 `templates/report.html`：顶部导航品牌徽标 + 页脚「由 mdsite 生成」署名（内联 SVG，自包含） — `templates/report.html`
