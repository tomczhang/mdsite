// template：list（列出可用模板）/ eject <type>（把内置模板拷到用户层供自定义）。
import { readdir, copyFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { CLI_TEMPLATES_DIR, TEMPLATE_DIR_LOCAL } from '../lib/paths.mjs'
import { logger } from '../lib/log.mjs'

async function listDir(dir) {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.html'))
  } catch {
    return []
  }
}

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

export async function runTemplate(args) {
  const sub = args._[0]
  if (sub === 'list') {
    // index 是站点首页模板，不是 publish --template 的选项，单独区分
    const SITE = new Set(['index.html'])
    const builtin = await listDir(CLI_TEMPLATES_DIR)
    const local = new Set(await listDir(TEMPLATE_DIR_LOCAL))
    const name = (f) => f.replace(/\.html$/, '')
    logger.info('publish 模板（--template <type>，* = 已被本地覆盖）：')
    for (const f of builtin) {
      if (SITE.has(f)) continue
      console.log(`  ${local.has(f) ? '*' : ' '} ${name(f)}`)
    }
    for (const f of local) {
      if (!builtin.includes(f) && !SITE.has(f)) console.log(`  + ${name(f)}（仅本地）`)
    }
    const siteTpls = builtin.filter((f) => SITE.has(f))
    if (siteTpls.length) {
      logger.info('站点模板（init 使用，非 --template 选项）：')
      siteTpls.forEach((f) => console.log(`    ${name(f)}`))
    }
    return 0
  }

  if (sub === 'eject') {
    const type = args._[1]
    if (!type) { logger.error('用法：mdsite template eject <type>'); return 2 }
    const file = type.endsWith('.html') ? type : `${type}.html`
    const src = path.join(CLI_TEMPLATES_DIR, file)
    if (!(await exists(src))) { logger.error(`内置模板不存在：${file}`); return 2 }
    await mkdir(TEMPLATE_DIR_LOCAL, { recursive: true })
    const dst = path.join(TEMPLATE_DIR_LOCAL, file)
    await copyFile(src, dst)
    logger.ok(`已 eject 到 ${dst}，可编辑后生效`)
    return 0
  }

  logger.error('用法：mdsite template list | eject <type>')
  return 2
}
