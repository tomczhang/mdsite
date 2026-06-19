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
首页中**发布日期距当前超过 30 天**的报告 SHALL 默认折叠（隐藏、可展开），纯前端实现（Alpine x-show，无后端）。折叠阈值 SHALL 在浏览/渲染时按当前日期计算，而非在发布时固化（否则时间推移后旧报告永不折叠 / 新报告错误折叠）。

#### Scenario: 旧条目默认折叠
- **WHEN** 某条目发布日期 > 当前 30 天
- **THEN** 该条目在首页默认渲染为折叠态

#### Scenario: 可展开
- **WHEN** 用户点击展开
- **THEN** 折叠的旧条目变为可见

#### Scenario: 折叠阈值在浏览时计算
- **WHEN** 判断某条目是否超 30 天
- **THEN** 该判断 SHALL 在浏览/渲染时（client-side，以当前日期）计算，而非在发布时固化

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
