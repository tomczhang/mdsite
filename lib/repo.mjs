// GitHub repo 标识解析 + 精确比对。供 init/publish/doctor 复用，
// 避免用 substring 判断 origin 是否匹配（会把 alice/pages-old、xalice/pages 误判为 alice/pages）。

/**
 * 把一个 GitHub remote URL 或 "owner/repo" 串规范化成小写 "owner/repo"。
 * 支持：
 *   https://github.com/owner/repo(.git)
 *   https://x-access-token:TOKEN@github.com/owner/repo(.git)
 *   git@github.com:owner/repo(.git)
 *   ssh://git@github.com/owner/repo(.git)
 *   owner/repo
 * 不是可识别的 GitHub repo（如 file:// 本地、其它 host）→ 返回 null。
 */
export function normalizeRepo(input) {
  if (!input) return null
  let s = String(input).trim().replace(/\.git$/i, '')
  // 纯 owner/repo
  let m = s.match(/^([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)$/)
  if (m) return `${m[1].toLowerCase()}/${m[2].toLowerCase()}`
  // 去掉 https 里的 user:token@ 凭证
  s = s.replace(/^(https?:\/\/)[^@/]+@/i, '$1')
  m =
    s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i) ||
    s.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+)$/i) ||
    s.match(/^git@github\.com:([^/]+)\/([^/]+)$/i)
  if (!m) return null
  return `${m[1].toLowerCase()}/${m[2].toLowerCase()}`
}

/** 两个 repo 标识（URL 或 owner/repo）是否指向同一个 GitHub 仓库。
 *  任一侧无法解析 → false（保守，不误判为匹配）。 */
export function sameRepo(a, b) {
  const na = normalizeRepo(a)
  const nb = normalizeRepo(b)
  return !!na && !!nb && na === nb
}
