# CDN 依赖

模板通过公网 jsdelivr 引入前端依赖（**不使用任何内网 CDN**）：

| 依赖 | 用途 | 引入 |
|---|---|---|
| `@tailwindcss/browser@4` | 排版样式（浏览器端） | `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4` |
| `alpinejs@3` | 轻量交互（首页折叠、复制链接） | `https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js` |

按需可在自定义模板里追加（同样走 jsdelivr）：
- `echarts` — 图表看板
- `mermaid` — 流程图/时序图

注意：CDN 用绝对 `https://` URL，不受 project-pages `/<repo>/` base 影响；页面内的**本地**链接/资源才用相对路径。
