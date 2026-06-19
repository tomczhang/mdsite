## ADDED Requirements

### Requirement: 在用户自有 GitHub 准备部署目标
`init` SHALL 在**用户配置的 GitHub 账号**下创建或复用目标 repo，并启用其 GitHub Pages（来源为 `gh-pages` 分支）；若 repo 已存在则复用、不破坏其内容。

#### Scenario: 创建并开 Pages
- **WHEN** 目标 repo 不存在且用户执行 `init`
- **THEN** 在用户账号下创建该 repo，并把 Pages 来源设为 `gh-pages` 分支根目录

#### Scenario: 复用已存在 repo
- **WHEN** 目标 repo 已存在
- **THEN** 复用之、确保 Pages 已启用，且不覆盖仓库原有内容

### Requirement: 不覆盖非 mdlink 管理的已有 gh-pages 站点
当目标 repo 已存在一个 `gh-pages` 分支/站点时，工具 SHALL 在写入前判定它是否由 mdlink 管理（存在 mdlink 标记：如分支根的 `pages.json` + mdlink 生成的 `index.html`/标记文件）。**仅当确认是 mdlink 管理的站点时**才继续发布；否则 SHALL 以明确错误 BLOCK，并要求用户显式 `--force`（或独立的 import 流程）后才覆盖。

#### Scenario: 已存在的非 mdlink 站点被保护
- **WHEN** 目标 repo 的 `gh-pages` 分支存在内容但缺少 mdlink 标记（无 mdlink 的 `pages.json`/标记）
- **THEN** 工具拒绝写入、以清晰错误退出，提示这会覆盖既有站点，需 `--force` 或单独 import 才能继续

#### Scenario: mdlink 管理的站点正常续写
- **WHEN** 目标 `gh-pages` 含 mdlink 标记（mdlink 的 `pages.json` 等）
- **THEN** 工具识别为自己管理的站点，正常追加发布、合并 `pages.json`，不需 `--force`

#### Scenario: 显式 force 覆盖
- **WHEN** 用户带 `--force` 对一个非 mdlink 站点发布
- **THEN** 工具按用户显式意图覆盖，并在输出中明确告知发生了覆盖

### Requirement: gh-pages 分支根布局
工具 SHALL 把对外服务的页面内容放在 `gh-pages` 分支的**仓库根**（而非 `/src` 子目录），以满足 GitHub Pages 分支部署只能伺服仓库根或 `/docs` 的约束。

#### Scenario: 内容落在分支根
- **WHEN** publish 完成 push
- **THEN** 页面文件位于 `gh-pages` 分支根下的相对路径（如 `<category>/<date>/<slug>.html`），可被 `<user>.github.io/<repo>/...` 直接访问

### Requirement: token-HTTPS 认证且凭证不持久化
工具进行 git 远端操作时 SHALL 使用用户自己的 GitHub 凭证经 HTTPS 认证，**SHALL NOT 依赖 SSH 作为默认路径**。认证方式 SHALL 优先选用不落盘的方案：`gh` 凭证助手 / `GIT_ASKPASS` / 一次性 HTTP `Authorization` header（`http.extraHeader`）。**`GITHUB_TOKEN` SHALL NOT 被持久化**到任何 git 配置或文件中——具体地：token 不得长期写入 `~/.mdlink/.git/config`、任何临时 worktree 的 config、commit 内容、或日志/错误输出。

#### Scenario: 用 token 推送
- **WHEN** publish 需要 push 到用户 repo
- **THEN** 使用用户凭证经 HTTPS 完成认证推送，无需用户预配 SSH key

#### Scenario: token 不残留在 git 配置
- **WHEN** 一次 publish 完成（含成功或失败路径）后检查 `~/.mdlink/.git/config`、临时 worktree config 与持久 remote URL
- **THEN** 其中不含明文 `GITHUB_TOKEN` / `x-access-token:<token>`；若曾临时嵌入 remote URL，则发布后已被还原/清除

#### Scenario: 日志对 token 脱敏
- **WHEN** 工具打印命令、URL 或错误信息
- **THEN** 任何 token 都被脱敏（如 `x-access-token:***`），不出现明文

#### Scenario: 缺 token 时明确失败
- **WHEN** 未提供 `GITHUB_TOKEN` 且无可用 `gh` 登录
- **THEN** 操作以明确的凭证缺失错误失败，不静默挂起

### Requirement: publish 归档并发布
`publish` SHALL 把渲染好的页面归档进本地工作区（`src/<category>/<YYYY-MM-DD>/<slug>.html`）、commit、push 到用户 `gh-pages`，使其经 GitHub Pages 对外可达；`category` SHALL 限定为 kebab-case。

#### Scenario: 一条命令出链接
- **WHEN** 用户执行 `mdlink publish <input> --title T --category report --summary S`
- **THEN** 页面被归档、提交、push 到用户 gh-pages，并最终经其 GitHub Pages 可访问

#### Scenario: category 校验
- **WHEN** `--category` 不是 kebab-case（首字母小写、仅含 a-z0-9-）
- **THEN** publish 拒绝并以非零码退出

### Requirement: 归档文件名（slug）生成与唯一性
工具 SHALL 以确定且 path-safe 的规则生成归档文件名（slug），并保证**同一 `category/日期` 下不同报告不互相覆盖**。slug SHALL 经过路径安全清洗（小写、非 `[a-z0-9-]` 字符归一、去首尾连字符、限长），并 SHALL 含一个唯一化成分（如 `HHmm`-时间 + 短随机 hash 后缀），使两篇标题/分类/日期相同的报告产出不同文件名与不同 `pages.json` 条目。

#### Scenario: 同标题同日不覆盖
- **WHEN** 同一天为同一 category 用相同标题 publish 两篇报告
- **THEN** 生成两个不同的 `<slug>.html` 文件，归档互不覆盖，`pages.json` 中是两条独立记录

#### Scenario: 标题含特殊字符
- **WHEN** 标题含空格 / 斜杠 / 非 ASCII / 标点等不安全字符
- **THEN** 生成的 slug 与路径是 path-safe 的（不含会破坏路径或 URL 的字符），且仍可经 Pages 正常访问

### Requirement: 返回真实页面 URL
publish 成功后 SHALL 输出该页面的**真实可访问 URL**（`deploy_url` base 与归档相对路径拼接的完整链接），供调用方/agent 直接转告用户，而非让其自行拼接。

#### Scenario: 输出完整链接
- **WHEN** publish 成功
- **THEN** 输出形如 `https://<user>.github.io/<repo>/<category>/<date>/<slug>.html` 的完整 URL
