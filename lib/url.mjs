// URL 拼接：由 deploy_url（站点根）+ 相对 src/ 的 filename，拼出真实可访问页面 URL。
// 纯函数，便于单测；publish 与首页都用同一份实现，避免"自己拼路径"导致错误链接。
//
//   pageUrlOf('https://u.github.io/pages/', 'report/2026-06-19/1130-ab12.html')
//     → 'https://u.github.io/pages/report/2026-06-19/1130-ab12.html'
//   pageUrlOf('https://u.github.io/pages', '/report/x.html') → 同上（容错首尾 slash）
//   pageUrlOf('', anything) → ''（空 base 兜底）

export function pageUrlOf(deployUrl, relPath) {
  if (!deployUrl) return ''
  const base = String(deployUrl).replace(/\/+$/, '')
  const rel = String(relPath || '').replace(/^\/+/, '')
  return rel ? `${base}/${rel}` : base
}

/** 由 GitHub 用户名 + repo 名派生 Pages base。
 *  user/org pages（repo === `<user>.github.io`）没有 /<repo>/ 这一层。 */
export function pagesBaseFor(user, repo) {
  const u = String(user || '').toLowerCase()
  if (repo && repo.toLowerCase() === `${u}.github.io`) {
    return `https://${u}.github.io/`
  }
  return `https://${u}.github.io/${repo}/`
}
