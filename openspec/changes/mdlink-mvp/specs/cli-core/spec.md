## ADDED Requirements

### Requirement: 子命令路由与用法
CLI SHALL 以 `mdlink <command> [args]` 形式把请求路由到 `init` / `publish` / `doctor` / `serve` / `template` 子命令；未识别或缺命令时 SHALL 打印用法并以非零码退出。

#### Scenario: 路由到已知子命令
- **WHEN** 用户执行 `mdlink publish foo.md --title T --category report --summary S`
- **THEN** CLI 调用 `publish` 子命令并把解析后的参数透传给它

#### Scenario: 未知命令报用法
- **WHEN** 用户执行 `mdlink frobnicate`
- **THEN** CLI 打印可用子命令的用法说明，并以非零退出码结束

### Requirement: 本地 git 工作区
工具 SHALL 维护一个本地 git 工作区，默认路径 `~/.mdlink`，可由环境变量 `MDLINK_HOME` 覆盖；首次使用时 `init` SHALL 准备该工作区（git 仓库 + `src/` 目录 + 空 `pages.json`）。

#### Scenario: 首次准备工作区
- **WHEN** 工作区不存在且用户执行 `init`
- **THEN** 在 `MDLINK_HOME`（默认 `~/.mdlink`）创建 git 工作区，含 `src/` 目录与初始化为 `[]` 的 `src/pages.json`

#### Scenario: 复用已存在工作区
- **WHEN** 工作区已是 git 仓库且用户再次执行 `init`
- **THEN** 工具复用现有工作区、不覆盖已有内容，缺失的基础文件按需补齐

### Requirement: 带注释 YAML 配置
工具 SHALL 在工作区下读写一份带注释的 YAML 配置 `mdlink.yml`，包含 remote（GitHub repo、分支、Pages base url）、模板映射、storage 等字段；运行时按解析结果读取，回填字段（如 Pages 启用状态）时保留结构。

#### Scenario: init 写出配置
- **WHEN** `init` 完成
- **THEN** 工作区下存在 `mdlink.yml`，其中 remote.repo 指向用户配置的 GitHub repo，deploy_url 为该用户 Pages 的 base（`https://<user>.github.io/<repo>/`）

#### Scenario: 运行时读取配置
- **WHEN** 任意子命令需要 repo / 模板 / deploy_url
- **THEN** 从 `mdlink.yml` 读取，而非硬编码

### Requirement: 双层模板解析
工具 SHALL 采用双层模板：内置默认模板随包分发，用户可在 `~/.mdlink/templates/` 放置同名模板覆盖之；`template list` SHALL 列出可用模板，`template eject <type>` SHALL 把内置模板拷到用户层供自定义。

#### Scenario: 用户模板覆盖内置
- **WHEN** `~/.mdlink/templates/report.html` 存在
- **THEN** 渲染 report 类型时使用用户层模板，而非内置默认

#### Scenario: eject 内置模板
- **WHEN** 用户执行 `mdlink template eject report`
- **THEN** 内置 `report.html` 被拷到 `~/.mdlink/templates/report.html`，后续可编辑生效

### Requirement: 环境体检 doctor
`doctor` SHALL 校验运行前提（GitHub 凭证可用、工作区状态、配置完整性），并对每项给出明确的通过/失败与修复提示；`--silent` 模式下 SHALL 仅以退出码表达结果（0=就绪）。

#### Scenario: 缺少凭证时报错
- **WHEN** 既无 `GITHUB_TOKEN` 也无可用 `gh` 登录，用户执行 `doctor`
- **THEN** doctor 报告凭证缺失并给出修复提示，以非零码退出

#### Scenario: silent 模式只给退出码
- **WHEN** 配置就绪，用户执行 `doctor --silent`
- **THEN** 无冗余输出，退出码为 0

### Requirement: 本地预览
`serve` SHALL 在本地起一个静态服务器伺服工作区的 `src/`，便于发布前肉眼预览产物。

#### Scenario: 启动本地预览
- **WHEN** 用户执行 `mdlink serve`
- **THEN** 工作区 `src/` 被静态伺服，用户可在本地浏览器访问首页与报告
