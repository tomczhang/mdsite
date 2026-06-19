// mdlink.yml 读写：带注释 YAML（写盘时人类可读），运行时读解析结果。
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { CONFIG_PATH, MDLINK_HOME } from './paths.mjs'
import { pagesBaseFor } from './url.mjs'

/** 默认配置对象。account=GitHub 用户名，repo='user/name'。 */
export function defaultConfig({ account, repo }) {
  const [, name] = repo.split('/')
  return {
    remote: {
      repo, // GitHub group/project，必须用户可写
      user: account,
      pages_branch: 'gh-pages',
      deploy_url: pagesBaseFor(account, name),
    },
    storage: {
      slug_strategy: 'time-hash', // time-hash | title-hash
    },
    templates: {
      report: 'report.html',
    },
    site: {
      title: null, // 留空按 repo 名派生
      tagline: null,
    },
    meta: {
      account,
      version: '0.1.0',
      created_at: new Date().toISOString(),
    },
  }
}

function yamlStr(v) {
  if (v === null || v === undefined || v === '') return 'null'
  return `'${String(v).replaceAll("'", "''")}'`
}

/** 带注释 YAML 文本。 */
export function buildAnnotatedYaml(cfg) {
  return `# mdlink 配置文件
# 由 \`mdlink init\` 生成；可手动编辑后运行 \`mdlink doctor\` 校验。

# 部署目标（你自己的 GitHub）
remote:
  repo: ${cfg.remote.repo}            # GitHub <user>/<repo>，必须存在且你可写
  user: ${cfg.remote.user}            # GitHub 用户名
  pages_branch: ${cfg.remote.pages_branch}   # GitHub Pages 部署分支（内容放分支根）
  deploy_url: ${cfg.remote.deploy_url}  # Pages 访问 base，用于 publish 后回链

# 报告存储
storage:
  slug_strategy: ${cfg.storage.slug_strategy}   # time-hash | title-hash

# 模板映射（相对 ~/.mdlink/templates/，缺省用内置）
templates:
  report: ${cfg.templates.report}

# 首页品牌覆盖（可选，留空按 repo 名派生）
site:
  title: ${yamlStr(cfg.site?.title)}
  tagline: ${yamlStr(cfg.site?.tagline)}

# 元信息
meta:
  account: ${cfg.meta.account}
  version: '${cfg.meta.version}'
  created_at: '${cfg.meta.created_at}'
`
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function readConfig() {
  if (!(await exists(CONFIG_PATH))) return null
  return YAML.parse(await readFile(CONFIG_PATH, 'utf8'))
}

export async function writeConfig(cfg) {
  await mkdir(MDLINK_HOME, { recursive: true })
  await writeFile(CONFIG_PATH, buildAnnotatedYaml(cfg), 'utf8')
}

export async function updateConfig(patcher) {
  const cfg = await readConfig()
  if (!cfg) throw new Error('mdlink 尚未初始化')
  await patcher(cfg)
  await writeConfig(cfg)
  return cfg
}

export { CONFIG_PATH, path }
