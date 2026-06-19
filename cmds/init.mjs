// init：在【你自己的】GitHub 建/复用 repo + 准备本地工作区 + 开 gh-pages Pages + 铺首页。
import { writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import {
  whoami, repoView, repoCreate, enablePages, ghPagesState, SITE_MARKER,
  setDefaultBranch, deleteBranch, branchExists,
} from '../lib/gh.mjs'
import { isRepo, initWorkspace, cloneBranch, commitAll, push, originUrl, setOrigin } from '../lib/git.mjs'
import { repoSyncPlan, shouldTidyRepoHome } from '../lib/repo.mjs'
import { defaultConfig, writeConfig, readConfig } from '../lib/config.mjs'
import { renderTemplateTo, varsFromConfig, siteReadme } from '../lib/render.mjs'
import {
  MDSITE_HOME, INDEX_HTML, PAGES_JSON, TEMPLATE_DIR_LOCAL,
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
  // MVP 只支持当前用户名下的 repo（repoCreate 永远建在 /user/repos）
  if (group.toLowerCase() !== account.toLowerCase()) {
    logger.error(
      `MVP 只支持你自己账号下的仓库。--repo 的 owner 应是 ${account}，收到：${group}。\n` +
      `  （org 仓库暂未支持）`,
    )
    return 2
  }
  logger.step(`目标仓库：${repo}`)

  // 2b. 本地 config/origin 与目标 repo 一致性（精确解析，不用 substring）。
  //     算一次 plan，复用于 BLOCK 判定 + 后续 config/origin 修复。
  const localIsRepo = await isRepo(MDSITE_HOME)
  const prevCfg = await readConfig()
  const localOrigin = localIsRepo ? await originUrl(MDSITE_HOME) : ''
  const plan = repoSyncPlan({
    configRepo: prevCfg?.remote?.repo,
    originUrl: localOrigin,
    targetRepo: repo,
    isRepo: localIsRepo,
    force,
  })
  if (plan.block) {
    logger.error(
      `本地工作区 ${MDSITE_HOME} 已绑定别的仓库（config: ${prevCfg?.remote?.repo || '无'}，origin: ${localOrigin || '无'}）。\n` +
      `  想切到 ${repo}：加 --force（会改写本地 config/origin 指向新仓库），或换一个 MDSITE_HOME。`,
    )
    return 2
  }

  // 3. 建 / 复用 repo
  const existing = await repoView(repo)
  const createdNow = !existing // 本次是否由我们新建（决定能否动 main/默认分支）
  if (existing) {
    logger.info('仓库已存在，复用')
  } else {
    logger.step(`创建仓库 ${repo}…`)
    await repoCreate(name, { description: 'mdsite 静态报告站点' })
    logger.ok(`已创建 ${repo}`)
  }

  // 4. 覆盖保护：已存在非 mdsite 的 gh-pages 站点 → BLOCK（除非 --force）
  const state = await ghPagesState(repo, 'gh-pages')
  if (state === 'foreign') {
    if (!force) {
      logger.error(
        `${repo} 的 gh-pages 分支已有内容，但不是 mdsite 管理的站点。\n` +
        `  继续会覆盖现有站点。确认要覆盖请加 --force，或换一个 repo（--repo user/other）。`,
      )
      return 2
    }
    logger.warn(`⚠️ --force：将覆盖 ${repo} 上已有的【非 mdsite】gh-pages 站点`)
  }

  // 5. 本地工作区
  if (localIsRepo) {
    logger.dim(`复用本地工作区：${MDSITE_HOME}`)
  } else if (state === 'mdsite') {
    logger.step(`clone 已有 mdsite 站点到 ${MDSITE_HOME}`)
    await cloneBranch(repo, MDSITE_HOME, 'gh-pages')
  } else {
    logger.step(`初始化本地工作区 ${MDSITE_HOME}`)
    await initWorkspace(MDSITE_HOME, repo, 'gh-pages')
  }

  // 6. 让 config/origin 权威指向本次 repo（按 plan 修复：config 对但 origin 错也会被修）
  if (plan.writeConfig) {
    await writeConfig(defaultConfig({ account, repo }))
    logger.ok(`已写入 mdsite.yml（repo=${repo}）`)
  }
  if (plan.setOrigin) {
    await setOrigin(MDSITE_HOME, repo)
    logger.ok(`origin → ${repo}`)
  }
  await mkdir(TEMPLATE_DIR_LOCAL, { recursive: true })
  const cfg = await readConfig()
  if (!(await exists(PAGES_JSON))) {
    await writeFile(PAGES_JSON, '[]\n', 'utf8')
  }
  // 写 mdsite 站点标记（覆盖保护探测依据）
  await writeFile(path.join(MDSITE_HOME, SITE_MARKER),
    JSON.stringify({ tool: 'mdsite', repo }, null, 2) + '\n', 'utf8')
  // 关掉 Jekyll：纯静态自包含 HTML，避免 Jekyll 忽略点文件/改写产物
  await writeFile(path.join(MDSITE_HOME, '.nojekyll'), '', 'utf8')
  // 仓库主页 README（GitHub 在默认分支 gh-pages 主页渲染，含 live 链接）
  await writeFile(path.join(MDSITE_HOME, 'README.md'), siteReadme(cfg), 'utf8')
  await renderTemplateTo('index.html', INDEX_HTML, varsFromConfig(cfg))
  logger.ok('已铺设首页 index.html')

  // 7. commit + push gh-pages
  const cb = await commitAll(MDSITE_HOME, 'chore(mdsite): 初始化站点')
  if (cb.committed) {
    logger.step('push → origin/gh-pages')
    await push(MDSITE_HOME, { branch: 'gh-pages', setUpstream: true })
  }

  // 8. 启用 Pages（分支已存在后再开）
  const pg = await enablePages(repo, 'gh-pages')
  logger.ok(pg.created ? '已启用 GitHub Pages' : 'GitHub Pages 已就绪')

  // 9. 仅对【本次新建】的 repo：把 gh-pages 设为默认 + 删掉 auto-init 的空 main。
  //    复用的已有 repo 绝不碰其默认分支/main（那可能是用户的真实代码，删除=数据丢失）。
  if (shouldTidyRepoHome({ createdNow })) {
    try {
      await setDefaultBranch(repo, 'gh-pages')
      if (await branchExists(repo, 'main')) {
        const deleted = await deleteBranch(repo, 'main')
        if (deleted) logger.dim('已把默认分支切到 gh-pages 并删除空 main')
        else logger.warn('默认分支已切到 gh-pages；删除 main 失败（可能权限/分支保护），可手动删除')
      }
    } catch (e) {
      logger.warn(`设置默认分支失败（不影响部署）：${e.message}`)
    }
  }

  logger.ok(`初始化完成。站点：${cfg.remote.deploy_url}`)
  logger.dim('（首次部署 GitHub Pages 构建约需 1 分钟）')
  return 0
}
