// 本地工作区 git 操作（clean-room 重写，借鉴 aper-pages 的并发合并思路，未 copy 代码）。
//
// 认证（spec：token 不持久化）：
//   remote URL 始终是【无 token】的 https://github.com/<repo>.git。
//   推/取时通过 GIT_ASKPASS 注入凭证——token 只活在子进程 env，
//   绝不进 argv、不写 .git/config、不落盘、不打印。
import { writeFile, mkdir, access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { git } from './sh.mjs'
import { ghToken } from './gh.mjs'
import { mergePagesJson } from './pages-json.mjs'
import { CACHE_DIR, GITIGNORE_ENTRIES, PAGES_JSON_REL } from './paths.mjs'

export function remoteHttpsUrl(repo) {
  return `https://github.com/${repo}.git`
}

const ASKPASS = path.join(CACHE_DIR, 'askpass.sh')

/** 写出一次性 askpass 脚本（脚本内不含 token，只引用 env 变量）。 */
async function ensureAskpass() {
  await mkdir(CACHE_DIR, { recursive: true })
  const script = `#!/bin/sh
case "$1" in
  *[Uu]sername*) printf '%s' "x-access-token" ;;
  *) printf '%s' "$MDSITE_GH_TOKEN" ;;
esac
`
  await writeFile(ASKPASS, script, { mode: 0o700 })
  return ASKPASS
}

/** 构造带凭证的 env（token 只在此处进 env，不进 argv/config）。 */
async function authEnv() {
  const token = await ghToken()
  const askpass = await ensureAskpass()
  return {
    GIT_ASKPASS: askpass,
    GIT_TERMINAL_PROMPT: '0',
    MDSITE_GH_TOKEN: token,
  }
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function isRepo(dir) {
  return exists(path.join(dir, '.git'))
}

/** 在 dir 初始化一个空的 gh-pages 工作区，remote 指向（无 token 的）origin。 */
export async function initWorkspace(dir, repo, branch = 'gh-pages') {
  await mkdir(dir, { recursive: true })
  await git(['init', '-b', branch], { cwd: dir })
  await git(['remote', 'remove', 'origin'], { cwd: dir, allowFail: true })
  await git(['remote', 'add', 'origin', remoteHttpsUrl(repo)], { cwd: dir })
  await ensureGitignore(dir)
}

/** clone 远端 branch 到 dir（用于复用已有 mdsite 站点 / 多设备）。 */
export async function cloneBranch(repo, dir, branch = 'gh-pages') {
  const env = await authEnv()
  await git(
    ['clone', '--branch', branch, '--single-branch', remoteHttpsUrl(repo), dir],
    { env },
  )
  await ensureGitignore(dir)
}

/** 确保 .gitignore 含本地专用排除项（不覆盖用户既有条目）。 */
export async function ensureGitignore(dir) {
  const gi = path.join(dir, '.gitignore')
  let content = ''
  if (await exists(gi)) content = await readFile(gi, 'utf8')
  const lines = content.split('\n')
  const missing = GITIGNORE_ENTRIES.filter((e) => !lines.includes(e))
  if (missing.length) {
    if (content && !content.endsWith('\n')) content += '\n'
    content += missing.join('\n') + '\n'
    await writeFile(gi, content, 'utf8')
  }
}

export async function commitAll(dir, message) {
  await git(['add', '-A'], { cwd: dir })
  const status = await git(['status', '--porcelain'], { cwd: dir })
  if (!status.stdout.trim()) return { committed: false }
  await git(['commit', '-m', message], { cwd: dir })
  return { committed: true }
}

export async function fetchRemote(dir, remote = 'origin', branch = 'gh-pages') {
  const env = await authEnv()
  return git(['fetch', remote, branch], { cwd: dir, env, allowFail: true })
}

export async function commitsBehind(dir, remote = 'origin', branch = 'gh-pages') {
  const r = await git(['rev-list', '--count', `HEAD..${remote}/${branch}`], {
    cwd: dir,
    allowFail: true,
  })
  if (r.code !== 0) return 0
  return Number(r.stdout.trim()) || 0
}

/**
 * 把本地 HEAD rebase 到 remote/branch。
 *   无冲突 / 仅 pages.json 冲突（自动语义合并）→ { ok: true }
 *   其它文件冲突 → abort + { ok: false, conflicts }
 */
export async function rebaseFromRemote(dir, remote = 'origin', branch = 'gh-pages') {
  const r = await git(['rebase', `${remote}/${branch}`], { cwd: dir, allowFail: true })
  if (r.code === 0) return { ok: true }

  const status = await git(['status', '--porcelain'], { cwd: dir, allowFail: true })
  const conflicts = String(status.stdout || '')
    .split('\n')
    .filter((l) => /^(UU|AA|DD|AU|UA|UD|DU)\s/.test(l))
    .map((l) => l.slice(3).trim())

  if (conflicts.length === 1 && conflicts[0] === PAGES_JSON_REL) {
    if (await autoMergePagesJson(dir)) {
      await git(['add', PAGES_JSON_REL], { cwd: dir })
      const cont = await git(['rebase', '--continue'], {
        cwd: dir,
        env: { GIT_EDITOR: 'true' },
        allowFail: true,
      })
      if (cont.code === 0) return { ok: true, autoMerged: [PAGES_JSON_REL] }
    }
  }
  await git(['rebase', '--abort'], { cwd: dir, allowFail: true })
  return { ok: false, conflicts }
}

// 读 rebase 冲突的某个 stage 版本。解析失败/非数组 → null（让调用方中止自动合并，不丢条目）。
async function readStage(dir, stage) {
  const r = await git(['show', `:${stage}:${PAGES_JSON_REL}`], { cwd: dir, allowFail: true })
  if (r.code !== 0) return null
  try {
    const d = JSON.parse(r.stdout)
    return Array.isArray(d) ? d : null
  } catch {
    return null
  }
}

async function autoMergePagesJson(dir) {
  try {
    const ours = await readStage(dir, 2) // rebase 时 ours=远端
    const theirs = await readStage(dir, 3) // theirs=本地 commit
    if (ours === null || theirs === null) return false // 任一侧解析失败 → 放弃自动合并（交回用户，不丢数据）
    const merged = mergePagesJson(ours, theirs)
    await writeFile(path.join(dir, PAGES_JSON_REL), JSON.stringify(merged, null, 2) + '\n', 'utf8')
    return true
  } catch {
    return false
  }
}

export async function push(dir, { remote = 'origin', branch = 'gh-pages', setUpstream = false } = {}) {
  const env = await authEnv()
  const args = ['push']
  if (setUpstream) args.push('-u')
  args.push(remote, branch)
  return git(args, { cwd: dir, env })
}

/** 读取 origin remote URL（无则返回 ''）。 */
export async function originUrl(dir) {
  const r = await git(['remote', 'get-url', 'origin'], { cwd: dir, allowFail: true })
  return r.code === 0 ? r.stdout.trim() : ''
}

/** 把 origin 指向（无 token 的）repo URL。 */
export async function setOrigin(dir, repo) {
  const url = remoteHttpsUrl(repo)
  const r = await git(['remote', 'set-url', 'origin', url], { cwd: dir, allowFail: true })
  if (r.code !== 0) await git(['remote', 'add', 'origin', url], { cwd: dir })
}

export async function currentBranch(dir) {
  const r = await git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, allowFail: true })
  return r.stdout.trim() || 'gh-pages'
}
