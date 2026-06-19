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

/**
 * init 时根据本地 config/origin 与目标 repo 算出该如何处置（纯函数，便于单测）。
 * 入参：
 *   configRepo  本地 mdsite.yml 的 remote.repo（无则 ''/null）
 *   originUrl   本地 git origin（无则 ''/null）
 *   targetRepo  本次目标 repo
 *   isRepo      本地工作区是否已是 git 仓库
 *   force       是否带 --force
 * 返回：{ block, writeConfig, setOrigin }
 *   - block=true：存在 config/origin 与目标不一致且未 --force，应报错退出
 *   - writeConfig=true：需要写/改写 mdsite.yml
 *   - setOrigin=true：需要把 origin 指向目标（含缺失/不可解析/不匹配）
 * 关键：config 已对但 origin 错/缺失时，force 也要真正 setOrigin 修复，而不只是放行。
 */
/**
 * 是否应整理仓库主页（切默认分支到 gh-pages + 删 auto-init 的空 main）。
 * 安全契约：**仅对本次由工具新建的 repo** 才整理；复用的已有 repo 绝不碰（防删用户真实 main）。
 * 纯函数，便于回归测试这条防数据丢失的 guard。
 */
export function shouldTidyRepoHome({ createdNow }) {
  return !!createdNow
}

export function repoSyncPlan({ configRepo, originUrl, targetRepo, isRepo, force }) {
  const cfgPresent = !!configRepo
  const originPresent = !!originUrl
  const cfgMatch = sameRepo(configRepo, targetRepo)
  const originMatch = sameRepo(originUrl, targetRepo)
  const cfgMismatch = cfgPresent && !cfgMatch
  const originMismatch = originPresent && !originMatch
  if (isRepo && (cfgMismatch || originMismatch) && !force) {
    return { block: true, writeConfig: false, setOrigin: false }
  }
  return {
    block: false,
    writeConfig: !cfgPresent || !cfgMatch, // 缺失或不匹配 → 写
    setOrigin: !originMatch, // 不匹配（含缺失/不可解析）→ 修
  }
}
