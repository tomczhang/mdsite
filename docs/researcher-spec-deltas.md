# Researcher spec deltas — mdlink

> 作者：@Researcher。这是 #3「去中心/不担审核」和 #4「站点索引 + 超 30 天折叠」两块的 OpenSpec spec 增量，按 OpenSpec spec-delta 格式写好，drop-in。
> @MdLinkBuilder：建 MVP change 时，把下面两个 capability 各自的 `## ADDED Requirements` 块放进 `openspec/changes/<change>/specs/<capability>/spec.md`。proposal.md / tasks.md / design.md / 其余 capability 仍归你。
> 范围只覆盖我研究域的两块；CLI/模板/构建等实现性 requirement 由你补。

---

## capability: deploy-isolation

> 产品的法律地基：mdlink 是「工具」不是「平台」。所有用户内容只活在**用户自己的 GitHub 账号**下，维护者（chi-zhang）不托管、不聚合任何用户内容 → 不承担平台/内容审核主体责任（与 Hugo/Jekyll 同理）。**这是硬约束，任何破坏它的功能都不得引入。**

## ADDED Requirements

### Requirement: 内容只部署到用户自有 GitHub
工具 SHALL 把所有生成的页面只提交/推送到**最终用户自己配置的 GitHub 仓库**，并由该用户自己的 GitHub Pages（`<user>.github.io/<repo>/`）对外服务；使用的是**用户自己的 GitHub 凭证**（`GITHUB_TOKEN` / `gh` 登录）。维护者 SHALL NOT 在任何由维护者控制的基础设施或域名上托管、代理、缓存用户生成内容。

#### Scenario: publish 只写用户自己的仓库
- **WHEN** 用户执行 `mdlink publish`
- **THEN** 内容只用该用户的 `GITHUB_TOKEN` 提交并 push 到该用户配置的 repo，并从该用户的 `<user>.github.io/<repo>/` 提供访问
- **AND** 整个发布/部署过程不向任何维护者运营的后端发起请求

#### Scenario: 不内嵌维护者凭证
- **WHEN** 工具进行任何 git / GitHub 操作
- **THEN** 只使用用户自己的 GitHub 凭证，工具内 SHALL NOT 内嵌或要求任何维护者持有的 token / secret

### Requirement: 索引必须 per-user、去中心
站点首页索引（见 capability site-index）SHALL 只列出**当前用户自己工作区**（本地 `pages.json`）中的报告，数据来源仅为本用户本站点。工具 SHALL NOT 包含任何「收集 / 列出 / 浏览 / 聚合多个用户已发布页面」的中心入口、中心服务或跨用户索引。

#### Scenario: 首页只列本人报告
- **WHEN** 渲染站点首页
- **THEN** 只渲染当前用户 `pages.json` 里的条目，不引用、不抓取、不链接任何其它用户或任何中心来源的内容

#### Scenario: 不存在跨用户汇总
- **WHEN** 审查整套产品的任何功能/页面/服务
- **THEN** 不存在任何把多个用户的发布页面汇总到一处展示或检索的能力

---

## capability: site-index

> 站点首页 = 当前用户已发布报告的倒序时间轴；超过 30 天的报告默认折叠（纯前端）。参考 aper-pages 的 `pages.json` + `index.html` 思路（**clean-room 重写，不 copy**）。

## ADDED Requirements

### Requirement: 用户报告时间轴首页
站点根 `<user>.github.io/<repo>/index.html` SHALL 渲染当前用户已发布报告的**倒序（最新在前）时间轴**，数据来自本地 `pages.json`。每条至少含：标题、分类、发布日期、URL、摘要。

#### Scenario: 发布后进索引
- **WHEN** 一篇报告被 publish
- **THEN** 一条记录（标题/分类/日期/url/摘要）被 prepend 进 `pages.json`，部署后体现在首页时间轴最前

#### Scenario: 倒序排列
- **WHEN** 首页渲染
- **THEN** 条目按发布时间倒序（最新在前）分组/排序

### Requirement: 超 30 天条目自动折叠
首页中**发布日期距当前超过 30 天**的报告 SHALL 默认折叠（隐藏、可展开），纯前端实现（Alpine x-show，无后端）。

#### Scenario: 旧条目默认折叠
- **WHEN** 某条目发布日期 > 当前 30 天
- **THEN** 该条目在首页默认渲染为折叠态

#### Scenario: 可展开
- **WHEN** 用户点击展开
- **THEN** 折叠的旧条目变为可见

#### Scenario: 折叠阈值在浏览时计算（关键）
- **WHEN** 判断某条目是否超 30 天
- **THEN** 该判断 SHALL 在**浏览/渲染时（client-side, 以当前日期）**计算，而非在发布时固化
- **理由**：若在发布时固化折叠状态，时间推移后阈值不会更新，旧报告永远不折叠 / 新报告错误折叠

### Requirement: project pages 下的路径正确性
`index.html` 及所有模板内的链接/静态资源 SHALL 使用相对路径或正确的 `<base>`，以便在 `/<repo>/` 这一 project-pages base 下正确解析。

#### Scenario: 绝对路径不得指错
- **WHEN** 首页/报告页含导航链接或资源引用
- **THEN** 链接解析到 `<user>.github.io/<repo>/...` 之下，而非 `<user>.github.io/...`（即不得用裸 `/index.html` 这类绝对路径）

### Requirement: 多设备并发索引合并
来自多设备的 `pages.json` 更新 SHALL 在 rebase 冲突时做语义合并、不丢条目。

#### Scenario: 并发发布不丢
- **WHEN** 两台设备各自 publish 后 push，发生 `pages.json` 冲突
- **THEN** 索引按条目语义合并（两边新条目都保留、按时间去重排序），不因冲突丢失任何一边的报告
