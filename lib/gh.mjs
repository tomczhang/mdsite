// GitHub 操作：repo view/create、启用 Pages、whoami。
// 取代 aper-pages 的 a1 pipeline 层 —— GitHub Pages 下 push 到 gh-pages 即自动部署，
// pipeline 整层塌缩成「开一次 Pages + push」，pipelineRun ≈ no-op。
//
// 凭证：只用【用户自己】的 GitHub 凭证（deploy-isolation 硬约束）。
//   解析顺序：GITHUB_TOKEN / GH_TOKEN 环境变量 > `gh auth token`（复用 gh 登录）。
//   token 只进 Authorization header，绝不落盘、绝不打印。
import { run } from './sh.mjs'

const API = 'https://api.github.com'

let _tokenCache

/** 解析用户 GitHub token。无则抛明确的凭证缺失错误。 */
export async function ghToken() {
  if (_tokenCache) return _tokenCache
  const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (env) return (_tokenCache = env.trim())
  // 尝试复用 gh CLI 登录（token 不落盘到我们的文件）
  try {
    const r = await run('gh', ['auth', 'token'], { allowFail: true })
    if (r.code === 0 && r.stdout.trim()) return (_tokenCache = r.stdout.trim())
  } catch {
    /* gh 未安装 */
  }
  const e = new Error(
    '缺少 GitHub 凭证：请设置环境变量 GITHUB_TOKEN，或先运行 `gh auth login`。',
  )
  e.code = 'NO_CREDENTIAL'
  throw e
}

/** 是否已配置凭证（不抛错版，给 doctor 用）。 */
export async function hasCredential() {
  try {
    await ghToken()
    return true
  } catch {
    return false
  }
}

async function api(method, pathOrUrl, body) {
  const token = await ghToken()
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API}${pathOrUrl}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'mdsite',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  return { status: res.status, ok: res.ok, data }
}

/** 当前用户登录名。 */
export async function whoami() {
  const r = await api('GET', '/user')
  if (!r.ok) throw new Error(`获取 GitHub 用户失败（${r.status}）：${r.data?.message || ''}`)
  return r.data.login
}

/** 仓库存在则返回信息，404 返回 null。 */
export async function repoView(repo) {
  const r = await api('GET', `/repos/${repo}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`查询仓库失败（${r.status}）：${r.data?.message || ''}`)
  return r.data
}

/** 在当前用户名下创建 repo（name 不含 owner）。 */
export async function repoCreate(name, { private: priv = false, description = '' } = {}) {
  const r = await api('POST', '/user/repos', {
    name,
    private: priv,
    description,
    auto_init: true, // 建一个初始 commit，便于后续建 gh-pages
  })
  if (!r.ok) throw new Error(`创建仓库失败（${r.status}）：${r.data?.message || ''}`)
  return r.data
}

/** 查 Pages 配置，未开返回 null。 */
export async function getPages(repo) {
  const r = await api('GET', `/repos/${repo}/pages`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`查询 Pages 失败（${r.status}）：${r.data?.message || ''}`)
  return r.data
}

/** 分支是否存在。 */
export async function branchExists(repo, branch) {
  const r = await api('GET', `/repos/${repo}/branches/${branch}`)
  if (r.status === 404) return false
  if (!r.ok) throw new Error(`查询分支失败（${r.status}）：${r.data?.message || ''}`)
  return true
}

// mdsite 站点标记文件名（写在站点根，唯一标识"这是 mdsite 管理的站点"）。
export const SITE_MARKER = '.mdsite.json'

/**
 * 覆盖保护探测（spec：不覆盖非 mdsite 管理的 gh-pages 站点）。
 * 返回 'absent'（分支不存在，安全新建）
 *     | 'mdsite'（含专用 marker，安全续写）
 *     | 'foreign'（分支有内容但无 marker，需 --force）。
 * 用专用 marker 而非 pages.json —— 避免无关站点恰好有 pages.json 被误判为 mdsite。
 */
export async function ghPagesState(repo, branch = 'gh-pages') {
  if (!(await branchExists(repo, branch))) return 'absent'
  const r = await api('GET', `/repos/${repo}/contents/${SITE_MARKER}?ref=${branch}`)
  if (!r.ok) return 'foreign'
  // 不只看文件存在，还要校验内容确实是 mdsite 标记（防空文件/同名误用绕过保护）
  try {
    const raw = r.data?.encoding === 'base64'
      ? Buffer.from(r.data.content, 'base64').toString('utf8')
      : r.data?.content
    const j = JSON.parse(raw)
    return j && j.tool === 'mdsite' ? 'mdsite' : 'foreign'
  } catch {
    return 'foreign'
  }
}

/** 设置 repo 默认分支。 */
export async function setDefaultBranch(repo, branch) {
  const r = await api('PATCH', `/repos/${repo}`, { default_branch: branch })
  if (!r.ok) throw new Error(`设置默认分支失败（${r.status}）：${r.data?.message || ''}`)
  return true
}

/** 删除分支。不存在（404/422）视为成功（幂等）。 */
export async function deleteBranch(repo, branch) {
  const r = await api('DELETE', `/repos/${repo}/git/refs/heads/${branch}`)
  return r.ok || r.status === 404 || r.status === 422
}

/** 启用/更新 Pages，来源为 branch 分支根。幂等。 */
export async function enablePages(repo, branch = 'gh-pages') {
  const existing = await getPages(repo)
  if (!existing) {
    const r = await api('POST', `/repos/${repo}/pages`, {
      source: { branch, path: '/' },
    })
    // 409 = 已存在（竞态）；其余非 2xx 报错
    if (!r.ok && r.status !== 409) {
      throw new Error(`启用 Pages 失败（${r.status}）：${r.data?.message || ''}`)
    }
    return { created: true }
  }
  // 已存在则确保 source 指向我们的分支
  const r = await api('PUT', `/repos/${repo}/pages`, {
    source: { branch, path: '/' },
  })
  if (!r.ok && r.status !== 422) {
    throw new Error(`更新 Pages 源失败（${r.status}）：${r.data?.message || ''}`)
  }
  return { created: false }
}
