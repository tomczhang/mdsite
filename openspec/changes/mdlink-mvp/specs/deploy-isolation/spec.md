## ADDED Requirements

### Requirement: 内容只部署到用户自有 GitHub
工具 SHALL 把所有生成的页面只提交/推送到**最终用户自己配置的 GitHub 仓库**，并由该用户自己的 GitHub Pages（`<user>.github.io/<repo>/`）对外服务；使用的是**用户自己的 GitHub 凭证**（`GITHUB_TOKEN` / `gh` 登录）。维护者 SHALL NOT 在任何由维护者控制的基础设施或域名上托管、代理、缓存用户生成内容。

#### Scenario: publish 只写用户自己的仓库
- **WHEN** 用户执行 `mdsite publish`
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
