import { test, expect } from 'vitest'
import { normalizeRepo, sameRepo } from '../../lib/repo.mjs'

test('normalizeRepo 解析各种 GitHub URL', () => {
  expect(normalizeRepo('https://github.com/Alice/Pages.git')).toBe('alice/pages')
  expect(normalizeRepo('https://github.com/alice/pages')).toBe('alice/pages')
  expect(normalizeRepo('git@github.com:alice/pages.git')).toBe('alice/pages')
  expect(normalizeRepo('https://x-access-token:ghp_xxx@github.com/alice/pages.git')).toBe('alice/pages')
  expect(normalizeRepo('alice/pages')).toBe('alice/pages')
})

test('normalizeRepo 对非 GitHub/本地 URL 返回 null', () => {
  expect(normalizeRepo('file:///tmp/x/o.git')).toBeNull()
  expect(normalizeRepo('')).toBeNull()
  expect(normalizeRepo(null)).toBeNull()
})

test('sameRepo 精确比对，不被相似名误判（修 substring bug）', () => {
  // 这两条正是 Reviewer 指出 substring 会误判的 case
  expect(sameRepo('https://github.com/alice/pages-old.git', 'alice/pages')).toBe(false)
  expect(sameRepo('https://github.com/xalice/pages.git', 'alice/pages')).toBe(false)
  // 真正匹配（含大小写/凭证/.git 差异）
  expect(sameRepo('https://github.com/Alice/Pages.git', 'alice/pages')).toBe(true)
  expect(sameRepo('git@github.com:alice/pages.git', 'https://github.com/alice/pages')).toBe(true)
})

test('sameRepo 任一侧无法解析 → false（保守）', () => {
  expect(sameRepo('file:///tmp/o.git', 'alice/pages')).toBe(false)
})
