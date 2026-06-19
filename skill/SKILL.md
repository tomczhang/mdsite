---
name: mdsite
description: 当用户想把当前对话里的分析结论、设计方案、报告内容生成为一个可在线访问、可分享的精美 HTML 页面，并发布到他自己的 GitHub Pages（<user>.github.io/<repo>/）时使用。支持任意 kebab-case 类型（report/spec/review/changelog 等）。最高频用法是「把上面这段对话/分析做成一份在线报告」。触发词：生成报告、做个页面、出个看板、发布 pages、在线 HTML、mdsite、分享链接。
---

# mdsite Skill

把当前对话的分析结论 / 数据 / 方案，生成为独立可访问的 HTML 报告，发布到【用户自己的】GitHub Pages 并返回链接。**内容只部署到用户自己的 GitHub，工具不托管任何内容。**

## 0. 命令前缀

发布到 npm 后：

```bash
mdsite() { npx -y mdsite@latest "$@"; }
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

## 4. 把链接转告用户

publish 成功后会输出**真实页面 URL**（形如 `https://<user>.github.io/<repo>/<category>/<date>/<slug>.html`）。**直接把这个链接转告用户**，不要自己拼接路径。站点根可看用户全部报告时间轴（超 30 天自动折叠）。

详见 `references/design-principles.md` 与 `references/cdn-dependencies.md`。
