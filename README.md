# mdlink

把一段 **Markdown / 对话内容**一键变成**云端可分享的精美 HTML 报告**，发布到**你自己的 GitHub Pages**。

- 形态：skill + CLI（Node ≥ 20）
- BYO-host：内容只部署到你自己的 GitHub repo + Pages，用你自己的凭证。**我们不托管任何内容。**
- 产物：单文件自包含 HTML（Tailwind + Alpine via CDN），天生好分享。
- 站点首页：你的报告倒序时间轴，超 30 天自动折叠。

## 安装

```bash
npm i -g mdlink     # 或：npx mdlink <command>
```

## 认证（只需一次，推荐用最小权限）

mdlink 用**你自己的** GitHub 凭证操作**你自己的** repo。**不需要 SSH key，也不需要配 GitHub Action。** 按推荐程度从高到低：

1. **`gh auth login`（推荐）** — 复用 GitHub CLI 登录，token 不落任何文件。
2. **Fine-grained PAT（次之，最小权限）** — 新建 [fine-grained token](https://github.com/settings/tokens?type=beta)，`Repository access` 选 **Only select repositories** → 仅你的 pages 仓库，权限给：`Contents: Read and write`、`Pages: Read and write`、`Administration: Read and write`（建仓 + 开 Pages）。然后 `export GITHUB_TOKEN=github_pat_…`。
3. **Classic PAT（兜底，⚠️ 风险）** — 勾 `repo` scope 即可，但它授予你**所有仓库**的读写权限，一旦泄露影响面是整个 GitHub 账号。仅在图省事时用。

> token 绝不会被写入 `.git/config`、日志或任何文件——只在推送时经子进程环境临时注入。

## 用法

```bash
# 1) 初始化（建/复用你的 GitHub repo + 开 gh-pages Pages）
mdlink init                      # 默认 repo = <你>/pages
mdlink init --repo <你>/my-pages # 指定仓库

# 2) 发布一篇报告
mdlink publish notes.md --title "周报" --category report --summary "本周进展"
mdlink publish page.html --title "看板" --category dashboard --summary "指标"
# → 输出真实链接：https://<你>.github.io/<repo>/report/<日期>/<slug>.html

# 其它
mdlink doctor            # 体检：凭证 / 工作区 / 配置
mdlink serve             # 本地预览工作区
mdlink template list     # 查看可用模板
mdlink template eject report   # 拷出内置模板到 ~/.mdlink/templates/ 自定义
```

- 输入 `.md` 会转成 HTML 正文；`.html` 直通（适合已产出的富交互页面）。
- `--category` 任意 kebab-case（report / spec / review / dashboard / changelog…）。
- 站点根 `https://<你>.github.io/<repo>/` 是你全部报告的时间轴，超 30 天默认折叠。

## 开发

```bash
npm test            # vitest 单元测试
npm run test:e2e    # Playwright 模板截图测试
```

设计/验收规格见 `openspec/changes/mdlink-mvp/`。背景与约定见 `CLAUDE.md`。

## License

MIT
