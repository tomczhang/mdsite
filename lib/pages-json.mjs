// pages.json 索引读写 + 多设备语义合并。（pages.json 在工作区根 = 站点根）
// pages.json 是报告索引数组，每条：{ filename, title, category, date, summary }
// filename = 相对站点根的全路径（如 report/2026-06-19/1130-ab12.html），是天然唯一键。
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export async function readPagesJson(file) {
  let raw
  try {
    raw = await readFile(file, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') return [] // 文件不存在 = 空索引
    throw e
  }
  // 文件存在但损坏 → 阻塞，避免把旧索引当空表覆盖丢失全部历史
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error(`pages.json 解析失败（${file}）：内容不是合法 JSON，请修复后重试`)
  }
  if (!Array.isArray(data)) {
    throw new Error(`pages.json 格式错误（${file}）：应为数组`)
  }
  return data
}

export async function writePagesJson(entries, file) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(entries, null, 2) + '\n', 'utf8')
}

/**
 * 语义合并两份 pages.json（多设备并发 publish 后 rebase 冲突时用）。
 * - 以 filename 为唯一键去重（两边新条目都保留）
 * - 按 date 倒序（最新在前）；同日按 filename 倒序稳定排序
 * 不丢任何一边的报告。
 */
export function mergePagesJson(a = [], b = []) {
  const byKey = new Map()
  for (const entry of [...a, ...b]) {
    if (entry && entry.filename) byKey.set(entry.filename, entry)
  }
  return [...byKey.values()].sort((x, y) => {
    const dx = String(x.date || '')
    const dy = String(y.date || '')
    if (dx !== dy) return dx < dy ? 1 : -1
    return String(x.filename) < String(y.filename) ? 1 : -1
  })
}
