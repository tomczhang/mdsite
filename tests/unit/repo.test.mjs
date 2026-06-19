import { test, expect } from 'vitest'
import { normalizeRepo, sameRepo, repoSyncPlan, shouldTidyRepoHome } from '../../lib/repo.mjs'

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

const G = 'https://github.com/alice/pages.git'

test('repoSyncPlan：全新工作区 → 写 config + 设 origin', () => {
  const p = repoSyncPlan({ configRepo: null, originUrl: '', targetRepo: 'alice/pages', isRepo: false, force: false })
  expect(p).toEqual({ block: false, writeConfig: true, setOrigin: true })
})

test('repoSyncPlan：已正确初始化 → no-op（保留 config）', () => {
  const p = repoSyncPlan({ configRepo: 'alice/pages', originUrl: G, targetRepo: 'alice/pages', isRepo: true, force: false })
  expect(p).toEqual({ block: false, writeConfig: false, setOrigin: false })
})

test('repoSyncPlan：config 对但 origin 错，无 force → BLOCK', () => {
  const p = repoSyncPlan({ configRepo: 'alice/pages', originUrl: 'https://github.com/alice/pages-old.git', targetRepo: 'alice/pages', isRepo: true, force: false })
  expect(p.block).toBe(true)
})

test('repoSyncPlan：config 对但 origin 错 + force → 真正修 origin（recovery 关键）', () => {
  const p = repoSyncPlan({ configRepo: 'alice/pages', originUrl: 'https://github.com/alice/pages-old.git', targetRepo: 'alice/pages', isRepo: true, force: true })
  expect(p).toEqual({ block: false, writeConfig: false, setOrigin: true })
})

test('repoSyncPlan：origin 不可解析(file://) 无 force → BLOCK', () => {
  const p = repoSyncPlan({ configRepo: 'alice/pages', originUrl: 'file:///tmp/o.git', targetRepo: 'alice/pages', isRepo: true, force: false })
  expect(p.block).toBe(true)
})

test('repoSyncPlan：origin 缺失但 config 对 → 不 block，仍修 origin', () => {
  const p = repoSyncPlan({ configRepo: 'alice/pages', originUrl: '', targetRepo: 'alice/pages', isRepo: true, force: false })
  expect(p).toEqual({ block: false, writeConfig: false, setOrigin: true })
})

test('repoSyncPlan：config 错 + force → 写 config + 设 origin', () => {
  const p = repoSyncPlan({ configRepo: 'alice/old', originUrl: 'https://github.com/alice/old.git', targetRepo: 'alice/pages', isRepo: true, force: true })
  expect(p).toEqual({ block: false, writeConfig: true, setOrigin: true })
})

test('shouldTidyRepoHome：仅本次新建的 repo 才整理主页（防删用户 main）', () => {
  expect(shouldTidyRepoHome({ createdNow: true })).toBe(true)   // 新建 → 切默认分支/删空 main
  expect(shouldTidyRepoHome({ createdNow: false })).toBe(false) // 复用已有 repo → 绝不碰
})
