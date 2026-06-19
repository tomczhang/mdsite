#!/usr/bin/env node
// mdlink CLI 入口：解析参数 + 路由子命令。
import { logger } from '../lib/log.mjs'

const USAGE = `mdlink — 把 Markdown / 对话内容一键变成云端可分享的 HTML 报告

用法：
  mdlink init [--repo <user/repo>] [--force]      初始化（建/复用你自己的 GitHub repo + 开 Pages）
  mdlink publish <file.md|.html> --title <t> --category <c> --summary <s> [--force]
                                                  生成报告 → 发布到你的 GitHub Pages → 返回链接
  mdlink doctor [--silent]                         体检：凭证 / 工作区 / 配置
  mdlink serve [--port <n>]                        本地预览工作区
  mdlink template list | eject <type>             模板管理（用户层覆盖内置层）

认证：设置环境变量 GITHUB_TOKEN，或先运行 \`gh auth login\`（推荐，token 不落盘）。`

/** 极简参数解析：返回 { _, flags }。--k v / --k=v / --flag(布尔) / --no-flag。 */
export function parseArgs(argv) {
  const _ = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      let key = a.slice(2)
      if (key.startsWith('no-')) {
        flags[key.slice(3)] = false
        continue
      }
      const eq = key.indexOf('=')
      if (eq >= 0) {
        flags[key.slice(0, eq)] = key.slice(eq + 1)
        continue
      }
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      _.push(a)
    }
  }
  return { _, flags }
}

const COMMANDS = {
  init: () => import('../cmds/init.mjs').then((m) => m.runInit),
  publish: () => import('../cmds/publish.mjs').then((m) => m.runPublish),
  doctor: () => import('../cmds/doctor.mjs').then((m) => m.runDoctor),
  serve: () => import('../cmds/serve.mjs').then((m) => m.runServe),
  template: () => import('../cmds/template.mjs').then((m) => m.runTemplate),
}

async function main() {
  const [, , cmd, ...rest] = process.argv
  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    console.log(USAGE)
    return cmd ? 0 : 2
  }
  const loader = COMMANDS[cmd]
  if (!loader) {
    logger.error(`未知命令：${cmd}`)
    console.log('\n' + USAGE)
    return 2
  }
  const args = parseArgs(rest)
  try {
    const fn = await loader()
    return (await fn(args)) ?? 0
  } catch (e) {
    logger.error(e.message || String(e))
    return 1
  }
}

// 仅作为入口运行时执行（被测试 import 时不跑）
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code || 0))
}
