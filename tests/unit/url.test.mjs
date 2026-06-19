import { test, expect } from 'vitest'
import { pageUrlOf, pagesBaseFor } from '../../lib/url.mjs'

test('pageUrlOf 拼接 base + relPath', () => {
  expect(pageUrlOf('https://u.github.io/pages/', 'report/2026-06-19/1130-ab12.html'))
    .toBe('https://u.github.io/pages/report/2026-06-19/1130-ab12.html')
})

test('pageUrlOf 容错首尾 slash', () => {
  expect(pageUrlOf('https://u.github.io/pages', '/report/x.html'))
    .toBe('https://u.github.io/pages/report/x.html')
})

test('pageUrlOf 空 base 兜底', () => {
  expect(pageUrlOf('', 'anything')).toBe('')
})

test('pagesBaseFor project pages 带 /<repo>/', () => {
  expect(pagesBaseFor('alice', 'pages')).toBe('https://alice.github.io/pages/')
})

test('pagesBaseFor user pages 无 repo 层', () => {
  expect(pagesBaseFor('alice', 'alice.github.io')).toBe('https://alice.github.io/')
})
