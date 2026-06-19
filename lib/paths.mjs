// 路径常量。本地工作区默认 ~/.mdsite，可用 MDSITE_HOME 覆盖（便于测试/隔离）。
//
// 部署模型：~/.mdsite 工作树本身 = GitHub Pages 的 gh-pages 分支、站点在【工作区根】
// （满足 Pages 分支部署只伺服仓库根的约束）。配置/模板/缓存用 .gitignore 排除，不进站点。
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const HOME = os.homedir()

// 本地 git 工作区 = 站点根
export const MDSITE_HOME = process.env.MDSITE_HOME || path.join(HOME, '.mdsite')

// 站点文件（被 git 跟踪、push 到 gh-pages 根）
export const SITE_DIR = MDSITE_HOME
export const INDEX_HTML = path.join(MDSITE_HOME, 'index.html')
export const PAGES_JSON = path.join(MDSITE_HOME, 'pages.json')
export const PAGES_JSON_REL = 'pages.json'

// 本地专用（.gitignore 排除，不进站点）
export const CONFIG_PATH = path.join(MDSITE_HOME, 'mdsite.yml')
export const TEMPLATE_DIR_LOCAL = path.join(MDSITE_HOME, 'templates')
export const CACHE_DIR = path.join(MDSITE_HOME, '.cache')

// .gitignore 必含项：把本地专用文件挡在站点之外
export const GITIGNORE_ENTRIES = ['mdsite.yml', 'templates/', '.cache/', '.DS_Store']

// CLI 内嵌默认模板目录（随包分发，永远存在）
export const CLI_TEMPLATES_DIR = fileURLToPath(new URL('../templates', import.meta.url))
