---
name: mdsite
description: 当用户想把当前对话里的分析结论、设计方案、报告内容生成为一个可在线访问、可分享的精美 HTML 页面，并发布到他自己的 GitHub Pages（<user>.github.io/<repo>/）时使用。支持任意 kebab-case 类型（report/spec/review/changelog 等）。最高频用法是「把上面这段对话/分析做成一份在线报告」。触发词：生成报告、做个页面、出个看板、发布 pages、在线 HTML、mdsite、分享链接。
---

# mdsite Skill

把当前对话的分析结论 / 数据 / 方案，生成为独立可访问的 HTML 报告，发布到【用户自己的】GitHub Pages 并返回链接。**内容只部署到用户自己的 GitHub，工具不托管任何内容。**

## 0. 命令前缀

发布到 npm 后：

```bash
mdsite() { npx -y @tomczhang/mdsite@latest "$@"; }
```

当前（未发布）：从源码 `npm link` 后直接用全局 `mdsite` 命令，或 `node /path/to/mdsite/bin/mdsite.mjs`。

## 1. 前置：确保已初始化

```bash
mdsite doctor --silent || mdsite init
```
- `init` 会在用户自己的 GitHub 建/复用 repo、开 gh-pages Pages。
- 认证：用户需 `export GITHUB_TOKEN=…` 或先 `gh auth login`（推荐，token 不落盘）。失败就把错误原文转告用户并停止。

## 2. 提取对话内容（生成报告的素材）

扫描当前对话，提炼：
- 核心结论与决策点（已达成共识/明确拍板的）
- 关键数据与分析结果
- 设计方案 / 架构 / 接口
- 关键代码片段

规则：优先结论性内容，过滤探索性废稿；用户指定范围时只取该范围；内容不足以成文时主动问用户聚焦点。

## 3. 物化为临时文件并发布

把提炼出的内容写成一个临时 Markdown（推荐）或 HTML 文件，再 publish：

```bash
tmp="$(mktemp -t mdsite-XXXX).md"
cat > "$tmp" <<'MD'
# 标题
…（Markdown 正文）…
MD
mdsite publish "$tmp" --title "标题" --category report --summary "一句话摘要"
rm -f "$tmp"
```

- `.md` 会被转成 HTML 正文；若你已产出精装 HTML（含图表等富交互），用 `.html` 直通。
- `--category` 任意 kebab-case（report / spec / review / dashboard / changelog…）。
- 物化用安全临时路径，发布后清理临时文件。

### 3.0 选对模板（`--template`）

| 模板 | `--template` | 适合 | 版式 |
|---|---|---|---|
| 报告（默认） | `report` | 分析/周报/复盘 | 标题+摘要+正文+右侧大纲 |
| 文档 | `doc` | 长文档/手册/教程 | 全宽：左侧自动导航（从 `##` 标题）+ 宽内容 |
| 看板 | `dashboard` | 指标/数据看板 | KPI 数字卡 + echarts 图表 |
| 自定义整页 | （整页 `.html` 直通） | SPA/复杂交互 | 你自己的完整 HTML |

**doc**：正文用 `##`/`###` 分节，左侧导航自动生成。
**dashboard**：正文里放 KPI 卡和图表（Markdown 可内嵌 HTML，**前后空行**）：
```html
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">DAU</div><div class="kpi-value">12,345</div><div class="kpi-delta up">+5.2%</div></div>
</div>

<div class="chart-card"><h3>趋势</h3>
  <div class="chart" data-echarts='{"xAxis":{"type":"category","data":["一","二","三"]},"yAxis":{"type":"value"},"series":[{"type":"line","data":[12,20,15]}]}'></div>
</div>
```
图表用 `<div class="chart" data-echarts='<echarts option JSON>'>`，会自动渲染。kpi-delta 用 `up`/`down`/`flat`。

### 3.1 报告结构与排版规范（重要，决定成品好不好看）

**总是以「摘要 + 速览」开头**：
- **摘要**：用 `--summary` 传一句话核心结论（模板会渲染成顶部蓝色 callout）。
- **速览**：正文第一块用「速览」要点卡网格（3 张左右），用下面这段 HTML（Markdown 里可直接内嵌 HTML，会原样渲染）：
  ```html
  <div class="ql-grid">
    <div class="ql-card"><div class="ql-card-title">要点一</div><div class="ql-card-body">一句话说明</div></div>
    <div class="ql-card"><div class="ql-card-title">要点二</div><div class="ql-card-body">一句话说明</div></div>
    <div class="ql-card"><div class="ql-card-title">要点三</div><div class="ql-card-body">一句话说明</div></div>
  </div>
  ```

**语义提示块**（按语义定色，别全用普通引用）——用 GitHub 风格。**每个提示块各自独立一段、前后留空行；不要把多个 `[!TYPE]` 写进同一个引用块**（否则只有第一个生效，其余变正文）：
```markdown
> [!WARNING]
> 需要注意的坑。

> [!TIP]
> 一条建议。
```
可用类型：`[!NOTE]`(蓝·说明) `[!TIP]`(绿·提示) `[!IMPORTANT]`(紫·重点) `[!WARNING]`(黄·注意) `[!CAUTION]`(红·警告)，渲染成对应颜色+图标的色条 callout。

**表格**：技术报告多用表格；表头/斑马纹模板已带。单元格内可用：
- 行内代码 `` `code` ``、徽章 `<span class="badge badge-green">EXP</span>`（颜色：green/blue/gray/amber）。

正文用 `##`/`###` 分节（右侧大纲会自动生成），结论/风险用上面的语义块,提升可扫描性。

> [!IMPORTANT] 在 Markdown 里内嵌 HTML 块（如 `<div class="ql-grid">…</div>`）时，**前后都要留空行**，否则紧跟其后的 Markdown 会被并入 HTML 块、不被解析。

## 4. 把链接转告用户

publish 成功后会输出**真实页面 URL**（形如 `https://<user>.github.io/<repo>/<category>/<date>/<slug>.html`）。**直接把这个链接转告用户**，不要自己拼接路径。站点根可看用户全部报告时间轴（超 30 天自动折叠）。

详见 `references/design-principles.md` 与 `references/cdn-dependencies.md`。
