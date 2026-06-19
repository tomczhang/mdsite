// init：在【你自己的】GitHub 建/复用 repo + 准备本地工作区 + 开 gh-pages Pages + 铺首页。
import { writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { whoami, repoView, repoCreate, enablePages, ghPagesState } from '../lib/gh.mjs'
import { isRepo, initWorkspace, cloneBranch, commitAll, push } from '../lib/git.mjs'
import { defaultConfig, writeConfig, readConfig } from '../lib/config.mjs'
import { renderTemplateTo, varsFromConfig } from '../lib/render.mjs'
import {
  MDLINK_HOME, INDEX_HTML, PAGES_JSON, TEMPLATE_DIR_LOCAL,
} from '../lib/paths.mjs'
import { logger } from '../lib/log.mjs'

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

export async function runInit(args) {
  const force = !!args.flags.force

  // 1. 凭证 + 用户
  const account = await whoami()
  logger.dim(`GitHub 用户：${account}`)

  // 2. 目标 repo
  const repo = args.flags.repo || `${account}/pages`
  const [group, name] = repo.split('/')
  if (!group || !name) { logger.error(`仓库格式应为 user/name，得到：${repo}`); return 2 }
  logger.step(`目标仓库：${repo}`)

  // 3. 建 / 复用 repo
  const existing = await repoView(repo)
  if (existing) {
    logger.info('仓库已存在，复用')
  } else {
    logger.step(`创建仓库 ${repo}…`)
    await repoCreate(name, { description: 'mdlink 静态报告站点' })
    logger.ok(`已创建 ${repo}`)
  }

  // 4. 覆盖保护：已存在非 mdlink 的 gh-pages 站点 → BLOCK（除非 --force）
  const state = await ghPagesState(repo, 'gh-pages')
  if (state === 'foreign' && !force) {
    logger.error(
      `${repo} 的 gh-pages 分支已有内容，但不是 mdlink 管理的站点。\n` +
      `  继续会覆盖现有站点。确认要覆盖请加 --force，或换一个 repo（--repo user/other）。`,
    )
    return 2
  }

  // 5. 本地工作区
  if (await isRepo(MDLINK_HOME)) {
    logger.dim(`复用本地工作区：${MDLINK_HOME}`)
  } else if (state === 'mdlink') {
    logger.step(`clone 已有 mdlink 站点到 ${MDLINK_HOME}`)
    await cloneBranch(repo, MDLINK_HOME, 'gh-pages')
  } else {
    logger.step(`初始化本地工作区 ${MDLINK_HOME}`)
    await initWorkspace(MDLINK_HOME, repo, 'gh-pages')
  }

  // 6. 写配置 + 基础站点文件
  if (!(await exists(path.join(MDLINK_HOME, 'mdlink.yml')))) {
    await writeConfig(defaultConfig({ account, repo }))
    logger.ok('已写入 mdlink.yml')
  }
  await mkdir(TEMPLATE_DIR_LOCAL, { recursive: true })
  const cfg = await readConfig()
  if (!(await exists(PAGES_JSON))) {
    await writeFile(PAGES_JSON, '[]\n', 'utf8')
  }
  await renderTemplateTo('index.html', INDEX_HTML, varsFromConfig(cfg))
  logger.ok('已铺设首页 index.html')

  // 7. commit + push gh-pages
  const cb = await commitAll(MDLINK_HOME, 'chore(mdlink): 初始化站点')
  if (cb.committed) {
    logger.step('push → origin/gh-pages')
    await push(MDLINK_HOME, { branch: 'gh-pages', setUpstream: true })
  }

  // 8. 启用 Pages（分支已存在后再开）
  const pg = await enablePages(repo, 'gh-pages')
  logger.ok(pg.created ? '已启用 GitHub Pages' : 'GitHub Pages 已就绪')

  logger.ok(`初始化完成。站点：${cfg.remote.deploy_url}`)
  logger.dim('（首次部署 GitHub Pages 构建约需 1 分钟）')
  return 0
}
