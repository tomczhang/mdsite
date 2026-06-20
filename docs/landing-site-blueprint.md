# mdsite 落地站 + skill-first 定位 Blueprint

> 作者：@Researcher｜日期：2026-06-20｜状态：方案/实现输入（非实现）
> 受众：@chi-zhang（决策，已 greenlight "开搞"）、@MdsiteBuilder（落地站 + skill 打包实现输入）、@Reviewer（审查清单）
> 配套：定价/免费档/URL/合规细节见 `docs/monetization-plan.md`（仍全部有效，挂在本文件的 "mdsite Cloud" 托管层下）。

---

## 0. 一句话定位

> **「给你的 AI agent 装上『一句话生成可分享网页文档』的能力」**

不是"给开发者的 CLI"。CLI 退居 skill 底层的**引擎**；人不敲命令，agent 敲。

---

## 1. 产品模型（skill-first）

- **真正的产品界面 = skill**：用户在 Codex app / WorkBuddy / Claude Code 等 agent 应用里装上 mdsite skill。
- 用户说"把这段做成在线文档" → **agent 调 skill 生成 + 发布 + 返回链接**。
- **CLI = 引擎**（skill 底层 `npx mdsite publish` 调它），已就绪。

**为什么这是对的（护城河重定义）**：
- "md→html" 代码谁都能写，护城河不在代码。
- 真护城河 = **分发位**：成为各 agent 生态里**默认装好 / 被推荐**的那个 skill。铺得越广越难替代——**占住分发入口 > 卖模板 > 防自建**，直接回答 chi 最早的"护城河低"焦虑。
- ⚠️ 推论：早期增长的核心 KPI 不是 npm 装机，是**"被多少 agent 生态收录 / 装机量"**。

---

## 2. 目标用户（ICP）

- **不是** CLI 开发者。
- **是**：活在 agent 应用里、想把 AI 产出变成能分享的网页、**又不碰 GitHub / 代码**的非技术知识工作者 / 创作者。
- 操作者是 agent；**付钱的是 agent 背后那个非技术的人**。
- 技术用户走 BYO-GitHub 免费路——他们本来也不付费，不是目标客户（但是分发/口碑来源，别赶走）。

---

## 3. 变现：路 B（托管 SaaS / mdsite Cloud）

> 路 A（单卖 md 模板）已被证伪：daisyUI 卖模板成立是因为买家=开发者、$69 省一周；mdsite 的 md 模板买家=做报告的普通人，低感知价值、一次性需求，搬不过来。**变现走托管服务，模板作 Pro 解锁、不单卖。**

**付费触发点 = 「没 GitHub 的发布」**
skill 要发布而用户没配/不想配 GitHub → **默认一键走 mdsite Cloud，秒出链接**。这是 freemium 漏斗入口。

| 档位 | 内容 |
|---|---|
| **BYO-GitHub** | 永久免费（开源路，发到用户自己 GitHub Pages，不需 mdsite 账号） |
| **Cloud 免费档** | 带 "made with mdsite" 水印（服务端强制）+ 限站点数 + `username.mdsite.app` 子域名 + 不限次 + 永久保留 |
| **Cloud Pro $9.9/mo** | 去水印 + 自定义域名(BYO domain) + 解锁 doc/dashboard 高级模板 + 私有/密码页 + 更多站点；年付 ~$79–99 |

定价依据、竞品实证（Carrd/Super/Ghost）、免费档为何不能用"每日1次/30天删除"、子域名隔离安全约束、BYO-domain 机制 → 见 `docs/monetization-plan.md`。

---

## 4. 认证 / 身份设计（chi 关心的"怎么知道谁是谁"）

**核心原则：要身份，但绝不能"先注册 + 手动申请粘贴 apikey"**——那会毁掉"零配置"价值主张（让非技术用户申请 apikey = 劝退）。分层渐进：

1. **免费首发 = 不用登录就能出链接**（先给魔法，后要身份）
   - 第一次发布 → 直接生成带水印的托管页 + 临时链接，当场可用；
   - 链接旁提示"登录以保存/认领此页"。身份在**交付价值之后**才要。（v0 等工具同款"先生成、登录才保存"）
2. **身份 = 一次性浏览器登录，不是手动 apikey**
   - skill 首次要"保存/绑定/升级"时弹浏览器登录（Google/邮箱一键，OAuth device flow）→ token 自动存本地，之后发布全静默。
   - **就是 `gh auth login` / `vercel login` 那套**：开 URL、浏览器登一次、完事。**用户从不手抄 apikey**——token 由登录流程发、skill 自己管。
3. **账号 + 付费 = 只在"升级"那刻才要**
   - 去水印/自定义域名/私有页 → 浏览器 Stripe 付费，"谁是谁"在此刻绑到付费身份。计费 / 配额 / 内容归属全挂这个登录身份。

**两条边界**：
- BYO-GitHub 免费路 = **完全不用 mdsite 账号**（用他自己 GitHub）。只有托管路才需要 mdsite 身份。
- 免费托管配额用**匿名设备 token** 记（够 per-device 限次）；真计费才必须真账号。匿名 token 能被重装绕过——没关系，免费档靠水印 + "非技术用户懒得绕"兜底，不靠硬锁。

> ⚠️ 认证/计费是 **Cloud 阶段后端活**，周期长。落地站 + 候补名单这一步**不需要它**。

---

## 5. 落地站设计（daisyUI 风格，照搬其说服结构）

daisyUI 网站说服力来自这套结构，逐段映射到 mdsite：

| daisyUI 段落 | mdsite 落地站 |
|---|---|
| Hero + 双 CTA | headline=「给你的 AI agent 装上『一句话生成可分享网页文档』的能力」 |
| 量化对比（少 88% class）+ 左右代码对比图 | "3 行 md vs 一个精美网页" 前后对比、"0 配置 / 30 秒出链接" |
| 组件/主题预览 | report/doc/dashboard **三套模板 live demo 截图墙**（现成可用） |
| 社会证明（大厂 logo / star / 好评墙） | 早期：GitHub star + 真实用户站点案例 + "被 X 个 agent 生态收录" |
| 竞品对比表（vs MUI/shadcn） | vs Notion 分享 / Typora 导出 / 手搓 HTML：突出"agent 内一句话 + 自带托管 + 模板" |
| 一行装命令 | "把 mdsite 加到你的 agent" 安装片段 + 复制按钮 |

**主 CTA（定位决定）**：
- 主：**[把 mdsite 加到你的 agent：Codex / WorkBuddy / Claude]**（免费）
- 次：**[没 GitHub？直接拿托管链接 → Pro 候补]**

**落地站可 dogfood**：用 mdsite 自身整页 `.html` 直通发布（Builder 提，最好的 demo）。

---

## 6. 候补页信号设计（最便宜的转化验证）

落地站先上、收 Pro 候补邮箱，是上线前**最便宜的需求验证**，闭合"付费转化无数据"这个最大不确定项。要让信号更真：

1. **候补页先把价格亮出来**（"托管 Pro $9.9/mo"）→ 留邮箱=带价格意向的信号，不是泛泛兴趣。
2. **可选加一道"愿付多少"轻问卷**（$5 / $9.9 / $19 三选一）→ 上线定价前拿到支付意愿分布。

---

## 7. 执行节奏（已三方对齐）

**① 落地站先上**（CTA=加到你的 agent + 亮价格的 Pro 候补；零后端）
→ **② 验证需求**（候补邮箱量 + 愿付分布）
→ **③ 建 mdsite Cloud**（那时才做 OAuth 登录 / 计费 / 子域名托管 / 合规）

---

## 8. 给 @MdsiteBuilder 的实现要点

**落地站阶段（现在做）**
- [ ] daisyUI 风格落地站，headline + 主 CTA「加到你的 agent」+ 次 CTA「没 GitHub→托管/Pro 候补」
- [ ] 三套模板 live demo 截图墙 + 竞品对比表 + 一行安装片段
- [ ] 候补页：亮价格 + 收邮箱 + 可选"愿付多少"问卷
- [ ] 用 mdsite 自身发布落地站（dogfood）

**skill 打包阶段（现在/并行）**
- [ ] 跨生态标准 skill 包：Codex / Claude / WorkBuddy / Raft 各格式 + 安装文档
- [ ] 凭证走 agent 环境（用户自己的 `gh`/`GITHUB_TOKEN`，BYO 天然成立）
- [ ] skill 加"无 GitHub→托管"分支：**默认走 Cloud**、BYO-GitHub 是进阶选项（硬约束：检测无 GitHub 不引导去配 GitHub）；Cloud 后端就绪前先接候补/占位

**Cloud 阶段（验证后做）**
- [ ] OAuth device-flow 登录（不手动 apikey）+ 渐进认证（免登录首发临时页）
- [ ] 计费（Stripe）+ 配额（免费档限次/水印服务端强制）
- [ ] 每用户子域名隔离 + 保留名单 + 改名 301 + BYO 域名接入（见 monetization-plan.md）
- [ ] 合规：ToS + 举报/删除 + CSAM 零容忍

**两条硬护栏（贯穿）**：
1. 无 GitHub → 一键托管是**默认顺滑路**，不引导用户去配 GitHub（否则收不到钱）。
2. **不绑死单一 agent 生态**：铺广度 = 护城河。

> 本文件为研究/方案工件，不含实现。实现与代码改动归 @MdsiteBuilder。
