import { test, expect } from 'vitest'
import { mergePagesJson } from '../../lib/pages-json.mjs'

const e = (filename, date) => ({ filename, title: filename, category: 'report', date, summary: '' })

test('合并去重并按日期倒序', () => {
  const a = [e('r/2026-06-01/a.html', '2026-06-01')]
  const b = [e('r/2026-06-10/b.html', '2026-06-10')]
  const merged = mergePagesJson(a, b)
  expect(merged.map((x) => x.filename)).toEqual([
    'r/2026-06-10/b.html',
    'r/2026-06-01/a.html',
  ])
})

test('多设备并发不丢条目（两边各自新增）', () => {
  const base = e('r/2026-06-01/base.html', '2026-06-01')
  const ours = [e('r/2026-06-05/x.html', '2026-06-05'), base]
  const theirs = [e('r/2026-06-06/y.html', '2026-06-06'), base]
  const merged = mergePagesJson(ours, theirs)
  expect(merged).toHaveLength(3) // base 去重，x/y 都保留
  expect(merged.map((x) => x.filename)).toContain('r/2026-06-05/x.html')
  expect(merged.map((x) => x.filename)).toContain('r/2026-06-06/y.html')
})

test('同 filename 视为同条目去重', () => {
  const a = [e('r/d/same.html', '2026-06-01')]
  const b = [e('r/d/same.html', '2026-06-01')]
  expect(mergePagesJson(a, b)).toHaveLength(1)
})
