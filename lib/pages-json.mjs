// src/pages.json 索引读写 + 多设备语义合并。
// pages.json 是报告索引数组，每条：{ filename, title, category, date, summary }
// filename = 相对 src/ 的全路径（如 report/2026-06-19/1130-ab12.html），是天然唯一键。
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export async function readPagesJson(file) {
  try {
    const raw = await readFile(file, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
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
