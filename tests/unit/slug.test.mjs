import { test, expect } from 'vitest'
import { slugifyTitle, makeFilename } from '../../lib/slug.mjs'

test('slugifyTitle path-safe 清洗', () => {
  expect(slugifyTitle('Hello, World! / 测试')).toBe('hello-world')
  expect(slugifyTitle('  多个   空格  ')).toBe('')
  expect(slugifyTitle('a/b\\c:d')).toBe('a-b-c-d')
})

test('makeFilename time-hash 含唯一化成分', () => {
  const now = new Date(2026, 5, 19, 11, 30)
  const f = makeFilename({ title: 'T', now, rand: 'ab12' })
  expect(f).toBe('1130-ab12.html')
})

test('同标题同日不同 hash → 不互相覆盖', () => {
  const now = new Date(2026, 5, 19, 11, 30)
  const f1 = makeFilename({ title: 'Same', now, rand: 'aaaa' })
  const f2 = makeFilename({ title: 'Same', now, rand: 'bbbb' })
  expect(f1).not.toBe(f2)
})

test('title-hash 策略含清洗后的 slug', () => {
  const now = new Date(2026, 5, 19, 11, 30)
  const f = makeFilename({ title: 'My Report!', now, strategy: 'title-hash', rand: 'ab12' })
  expect(f).toBe('my-report-ab12.html')
})

test('真实随机 hash 不重复（极大概率）', () => {
  const now = new Date()
  const set = new Set(Array.from({ length: 50 }, () => makeFilename({ title: 'x', now })))
  expect(set.size).toBeGreaterThan(1)
})
