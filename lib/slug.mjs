// 归档文件名（slug）生成与唯一化。
// spec github-publish「归档文件名(slug)生成与唯一性」：
//   - path-safe 清洗（小写 / 非 [a-z0-9-] 归一 / 去首尾连字符 / 限长）
//   - 含唯一化成分（HHmm + 短随机 hash），同 category/同日/同标题不互相覆盖
import { randomBytes } from 'node:crypto'

/** 把任意标题清洗成 path-safe slug 片段（可能为空 → 调用方兜底）。 */
export function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * 生成归档文件名。strategy:
 *   'time-hash'（默认）→ <HHmm>-<hash6>.html
 *   'title-hash'        → <slug>-<hash6>.html
 * 每个文件名都含随机 hash 唯一化成分（不再提供必然碰撞的纯 time 策略）。
 * 注入 now / rand 便于单测确定性。
 */
export function makeFilename({ title, now = new Date(), strategy = 'time-hash', rand } = {}) {
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const hhmm = `${hh}${mi}`
  const hash = rand || randomBytes(3).toString('hex') // 6 hex
  if (strategy === 'title-hash') {
    const slug = slugifyTitle(title) || 'page'
    return `${slug}-${hash}.html`
  }
  return `${hhmm}-${hash}.html`
}
