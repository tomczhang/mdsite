// 模板占位渲染：把 {{KEY}} 替换为值，产出单文件自包含 HTML。
import { readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { TEMPLATE_DIR_LOCAL, CLI_TEMPLATES_DIR } from './paths.mjs'

const DEFAULT_TAGLINE = '思考 · 可视化 · 长久可达'

/** site_name → 可读标题：ccc→"CCC"，my-team-pages→"My Team Pages"。已含 pages 后缀不再追加。 */
export function siteTitleOf(siteName) {
  const parts = String(siteName || 'pages').split('-').filter(Boolean)
  const isAcronym = parts.length === 1 && parts[0].length <= 4
  const titled = isAcronym
    ? parts[0].toUpperCase()
    : parts.map((s) => s[0].toUpperCase() + s.slice(1)).join(' ')
  return /pages?$/i.test(titled) ? titled : `${titled} Pages`
}

/** 把 {{KEY}} 占位替换为 vars[KEY]。未提供的占位替换为空串，避免残留。 */
export function applyVars(content, vars) {
  return String(content).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k] ?? '') : '',
  )
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * 解析模板路径：用户层（~/.mdsite/templates/<file>）存在则覆盖，否则用 CLI 内嵌默认。
 * 返回 null 表示两层都不存在。
 */
export async function resolveTemplate(file) {
  const local = path.join(TEMPLATE_DIR_LOCAL, file)
  if (await exists(local)) return local
  const builtin = path.join(CLI_TEMPLATES_DIR, file)
  if (await exists(builtin)) return builtin
  return null
}

/** 读模板 → 替换占位 → 返回 HTML 字符串。 */
export async function renderTemplate(file, vars) {
  const tpl = await resolveTemplate(file)
  if (!tpl) throw new Error(`模板不存在：${file}`)
  const content = await readFile(tpl, 'utf8')
  return applyVars(content, vars)
}

/** 渲染并写入目标文件。 */
export async function renderTemplateTo(file, dst, vars) {
  const html = await renderTemplate(file, vars)
  await writeFile(dst, html, 'utf8')
  return html
}

/** 从 cfg 派生首页占位变量。site.title/tagline 优先，否则按 repo 名派生。 */
export function varsFromConfig(cfg) {
  const repoName = String(cfg?.remote?.repo || '').split('/')[1] || 'pages'
  const title = cfg?.site?.title
  const tagline = cfg?.site?.tagline
  return {
    SITE_TITLE: (title && String(title).trim()) || siteTitleOf(repoName),
    SITE_TAGLINE: (tagline && String(tagline).trim()) || DEFAULT_TAGLINE,
  }
}

/** 生成仓库主页 README.md 文本。GitHub 在默认分支(gh-pages)主页渲染它。 */
export function siteReadme(cfg) {
  const { SITE_TITLE } = varsFromConfig(cfg)
  const url = cfg?.remote?.deploy_url || ''
  return `# ${SITE_TITLE}

由 [mdsite](https://github.com/${cfg?.remote?.repo || ''}) 生成的静态报告站点。

🔗 **在线访问**：<${url}>

本仓库的 \`gh-pages\` 分支即站点内容，通过 GitHub Pages 部署。首页是报告时间轴（超 30 天自动折叠）。

> 由 mdsite 管理 · BYO-host：内容只部署在本人 GitHub，工具不托管任何内容。
`
}

export { DEFAULT_TAGLINE }
