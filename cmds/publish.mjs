// publish：输入 md/html → 渲染自包含 HTML → 归档 → 更新索引 → push gh-pages → 回链真实 URL。
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { readConfig } from '../lib/config.mjs'
import { mdToHtml } from '../lib/markdown.mjs'
import { renderTemplate, renderTemplateTo, varsFromConfig, siteTitleOf } from '../lib/render.mjs'
import { makeFilename } from '../lib/slug.mjs'
import { readPagesJson, writePagesJson } from '../lib/pages-json.mjs'
import { pageUrlOf } from '../lib/url.mjs'
import { ghPagesState } from '../lib/gh.mjs'
import {
  commitAll, push, fetchRemote, commitsBehind, rebaseFromRemote,
} from '../lib/git.mjs'
import { MDLINK_HOME, INDEX_HTML, PAGES_JSON } from '../lib/paths.mjs'
import { logger, redact } from '../lib/log.mjs'

const CATEGORY_RE = /^[a-z][a-z0-9-]*$/

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

export async function runPublish(args) {
  const input = args._[0]
  const { title, category, summary } = args.flags
  const force = !!args.flags.force

  if (!input) { logger.error('用法：mdlink publish <file.md|.html> --title … --category … --summary …'); return 2 }
  if (!title) { logger.error('缺少 --title'); return 2 }
  if (!category) { logger.error('缺少 --category'); return 2 }
  if (!summary) { logger.error('缺少 --summary'); return 2 }
  if (!CATEGORY_RE.test(String(category))) {
    logger.error(`category 必须是 kebab-case（首字母小写，仅含 a-z0-9-），收到：${category}`)
    return 2
  }
  if (!(await exists(input))) { logger.error(`文件不存在：${input}`); return 2 }

  const cfg = await readConfig()
  if (!cfg) { logger.error('尚未初始化，请先运行 `mdlink init`'); return 2 }

  // 覆盖保护：远端 gh-pages 若变成非 mdlink 站点则拦截
  const state = await ghPagesState(cfg.remote.repo, 'gh-pages')
  if (state === 'foreign' && !force) {
    logger.error(`${cfg.remote.repo} 的 gh-pages 不是 mdlink 站点，发布会覆盖；确认请加 --force`)
    return 2
  }

  // 多设备同步：拉远端最新（pages.json 冲突自动语义合并）
  await syncWithOrigin()

  // 渲染正文：.md → marked；.html → 直通
  const raw = await readFile(input, 'utf8')
  const isHtml = /\.html?$/i.test(input)
  const body = isHtml ? raw : mdToHtml(raw)

  // 路径：<category>/<YYYY-MM-DD>/<slug>.html
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const filename = makeFilename({ title, now, strategy: cfg.storage?.slug_strategy })
  const relPath = `${category}/${date}/${filename}`
  const absPath = path.join(MDLINK_HOME, relPath)
  const root = '../'.repeat(relPath.split('/').length - 1) // 报告页回根的相对前缀

  const repoName = String(cfg.remote.repo).split('/')[1] || 'pages'
  const html = await renderTemplate(cfg.templates?.report || 'report.html', {
    TITLE: title,
    DATE: date,
    CATEGORY: category,
    BODY: body,
    SITE_TITLE: cfg.site?.title || siteTitleOf(repoName),
    ROOT: root,
  })
  await mkdir(path.dirname(absPath), { recursive: true })
  await writeFile(absPath, html, 'utf8')
  logger.ok(`已生成 ${relPath}`)

  // 更新索引（最新在前）
  const pages = await readPagesJson(PAGES_JSON)
  pages.unshift({ filename: relPath, title, category, date, summary })
  await writePagesJson(pages, PAGES_JSON)

  // 重渲首页
  await renderTemplateTo('index.html', INDEX_HTML, varsFromConfig(cfg))

  // commit + push
  await commitAll(MDLINK_HOME, `feat(report): ${title}`)
  logger.step('push → origin/gh-pages')
  await push(MDLINK_HOME, { branch: 'gh-pages' })

  const url = pageUrlOf(cfg.remote.deploy_url, relPath)
  console.log('')
  logger.ok('发布完成')
  console.log(`    ${url}`)
  console.log('')
  logger.dim('（GitHub Pages 构建约 1 分钟后可访问）')
  return 0
}

async function syncWithOrigin() {
  const branch = 'gh-pages'
  try {
    await fetchRemote(MDLINK_HOME, 'origin', branch)
  } catch (e) {
    logger.warn(`fetch 失败：${redact(e.message)}（跳过同步）`)
    return
  }
  const behind = await commitsBehind(MDLINK_HOME, 'origin', branch)
  if (behind === 0) return
  logger.step(`远端有 ${behind} 个新 commit，同步中…`)
  const r = await rebaseFromRemote(MDLINK_HOME, 'origin', branch)
  if (r.ok) {
    logger.ok(r.autoMerged ? '已同步（pages.json 自动合并）' : '已同步')
    return
  }
  throw new Error(`同步失败，冲突：${r.conflicts.join(', ')}。请手动处理 ${MDLINK_HOME}`)
}
