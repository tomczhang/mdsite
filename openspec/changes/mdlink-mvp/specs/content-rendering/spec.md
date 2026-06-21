## ADDED Requirements

### Requirement: Markdown 输入转 HTML 正文
当 publish 输入是 Markdown（`.md`）时，工具 SHALL 把 Markdown 解析为 HTML 正文，再灌入模板；常见 Markdown 语法（标题、列表、代码块、表格、链接、强调）SHALL 被正确转换。

#### Scenario: Markdown 转 HTML
- **WHEN** 输入是含标题/列表/代码块的 `.md` 文件
- **THEN** 生成的页面正文是对应的 HTML（标题成 `<h*>`、列表成 `<ul>/<ol>`、代码块成 `<pre><code>`）

### Requirement: HTML 输入直通
当 publish 输入是 `.html` 时，工具 SHALL 不做 Markdown 解析，并按其形态选择发布方式：
- **整页 HTML 文档**（含 `<!doctype html>` 或 `<html>`，如 SPA/自定义页）SHALL **原样发布**——直接作为最终页面写出，**不套报告模板**（否则会出现文档套文档、外壳错位）；
- **HTML 片段**（无 `<html>`）SHALL 作为正文灌入 report 模板。
- 另提供 `--raw` 显式强制原样发布。

#### Scenario: 整页 HTML 文档原样发布
- **WHEN** 输入是含 `<html>` 的整页 HTML（如前端路由 SPA）
- **THEN** 该 HTML 被原样写为最终页面，不嵌入 report 模板（页面自身即完整文档，独占视口）

#### Scenario: HTML 片段作为正文
- **WHEN** 输入是无 `<html>` 的 HTML 片段
- **THEN** 其内容作为正文灌入 report 模板，不经 Markdown 解析改写

### Requirement: 模板占位渲染产出自包含 HTML
工具 SHALL 通过占位替换把正文与元数据（如标题、日期、站点标题）灌入模板，产物 SHALL 是**单文件自包含 HTML**（样式/交互依赖通过 CDN 引入，不产生本地散资源、不引 React/Vue 框架）。

#### Scenario: 渲染出单文件页面
- **WHEN** 给定正文 + 标题 + 日期，按 report 模板渲染
- **THEN** 产出一个 `.html` 文件，占位符（如 `{{TITLE}}`/`{{DATE}}`/`{{BODY}}`）全部被替换，且无未解析占位残留

#### Scenario: 产物自包含
- **WHEN** 检查渲染产物
- **THEN** 它是单个 HTML 文件，不依赖同目录的额外 JS/CSS 散文件

### Requirement: CDN 使用公网 jsdelivr
模板引用的前端依赖（Tailwind browser、Alpine 等）SHALL 通过公网 `cdn.jsdelivr.net` 引入；SHALL NOT 引用任何内网 CDN（如 `unpkg.alibaba-inc.com`）。

#### Scenario: 模板只引公网 CDN
- **WHEN** 审查任一内置模板的外链脚本/样式
- **THEN** 其 host 为 `cdn.jsdelivr.net`，不含任何 `*.alibaba-inc.com` 内网地址

### Requirement: 内置 report 模板
工具 SHALL 内置至少一个 `report` 模板（Tailwind + Alpine、排版美观、含返回首页导航与分享操作），作为 MVP 默认报告样式。

#### Scenario: 默认用 report 模板
- **WHEN** publish 未指定模板
- **THEN** 使用内置 `report` 模板渲染

### Requirement: report 页携带 mdsite 品牌标识
`report` 模板渲染的报告页 SHALL 携带 mdsite 品牌标识：顶部导航左侧 SHALL 显示品牌标识（ribbon-M logo + `mdsite` 文字，点击返回首页），页脚 SHALL 显示「由 mdsite 生成」署名。品牌 logo SHALL 以**内联资源**实现（base64 data URI 内联图片，由 `lib/brand.mjs` / `lib/brand-logo.mjs` 统一提供、`lib/render.mjs` 经 `{{LOGO}}` 占位注入；品牌主题色 `#63fe13`），以保持产物单文件自包含；SHALL NOT 引用任何外部图片资源（外链 png/svg）。

#### Scenario: 报告页含品牌标识与署名
- **WHEN** 用 `report` 模板渲染一篇报告
- **THEN** 顶部导航左侧含 mdsite 品牌 logo（内联资源）与可返回首页的链接，页脚含「由 mdsite 生成」署名

#### Scenario: 徽标不破坏自包含
- **WHEN** 检查渲染产物
- **THEN** 品牌 logo 为内联资源（base64 data URI），不含对任何外部图片文件（外链 png/svg）的引用

### Requirement: 对话/原始内容 → 在线报告主路径
团队最高频路径是「在 chat 里把一段对话/分析内容变成在线报告」。skill 工作流 SHALL 能把调用方提供的**原始内容（对话提炼出的 Markdown 或现成 HTML）安全物化**为一个临时 `.md`/`.html` 文件，再走 `publish` 产出报告并**把真实 URL 回传给用户**。该路径 SHALL 有可验收的端到端定义，而不仅停留在文档描述。

#### Scenario: 对话内容生成报告
- **WHEN** skill 拿到从对话提炼的报告内容（md 或 html）
- **THEN** 它把内容物化为临时文件、调用 `publish`（带 title/category/summary），最终得到并向用户返回该报告的真实 Pages URL

#### Scenario: 物化是安全的
- **WHEN** 把原始内容写入临时文件
- **THEN** 使用安全的临时路径与文件名（不因内容中的特殊字符破坏路径），用完不残留敏感中间产物
