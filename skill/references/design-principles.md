# mdlink 设计原则

- **单文件自包含 HTML**：产物就一个 `.html`，依赖（Tailwind / Alpine）全走公网 jsdelivr CDN，不引 React/Vue，不产生本地散资源 → 天生好托管、好分享。
- **BYO-host / 去中心**：内容只部署到【用户自己的】GitHub repo + Pages，用用户自己的凭证。工具不托管、不聚合任何用户内容。首页索引只列本站点自己的报告，**没有任何跨用户汇总入口**。
- **双层模板**：内置默认模板随包分发；用户在 `~/.mdlink/templates/` 放同名文件即可覆盖（`mdlink template eject <type>` 拷出来改）。
- **相对路径**：模板内链接/资源用相对路径，适配 GitHub project pages 的 `/<repo>/` base。
- **时间轴首页**：站点根是报告倒序时间轴，超 30 天默认折叠 —— 折叠在**浏览时**按当前日期算（纯前端 Alpine），不在发布时固化。
- **凭证安全**：GitHub token 绝不落盘（不进 .git/config、日志），只经子进程 env 临时注入。
- **内容安全（MVP 边界）**：用户把自己的内容发到自己的站点，不做净化（净化会打掉 Tailwind/Alpine 富页面能力）；若将来要发布第三方撰写、公开分享的内容，需重新评估净化策略。
