// doctor：体检凭证 / 工作区 / 配置。--silent 仅以退出码表达（0=就绪）。
import { access } from 'node:fs/promises'
import { hasCredential } from '../lib/gh.mjs'
import { readConfig } from '../lib/config.mjs'
import { isRepo } from '../lib/git.mjs'
import { MDSITE_HOME, CONFIG_PATH } from '../lib/paths.mjs'
import { logger } from '../lib/log.mjs'

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

export async function runDoctor(args) {
  const silent = !!args.flags.silent
  const checks = []

  const cred = await hasCredential()
  checks.push(['GitHub 凭证（GITHUB_TOKEN 或 gh 登录）', cred,
    '设置 GITHUB_TOKEN 或运行 `gh auth login`'])

  const repo = await isRepo(MDSITE_HOME)
  checks.push(['本地工作区', repo, '运行 `mdsite init`'])

  const cfg = await exists(CONFIG_PATH) ? await readConfig() : null
  const cfgOk = !!(cfg && cfg.remote && cfg.remote.repo)
  checks.push(['配置 mdsite.yml', cfgOk, '运行 `mdsite init`'])

  const allOk = checks.every(([, ok]) => ok)

  if (!silent) {
    for (const [label, ok, hint] of checks) {
      if (ok) logger.ok(label)
      else logger.error(`${label} — ${hint}`)
    }
    if (allOk) logger.ok('一切就绪')
  }
  return allOk ? 0 : 1
}
