import { test, expect } from 'vitest'
import { mdToHtml } from '../../lib/markdown.mjs'

test('标题转 h*', () => {
  expect(mdToHtml('# Hello')).toContain('<h1>Hello</h1>')
})

test('列表转 ul/li', () => {
  const html = mdToHtml('- a\n- b')
  expect(html).toContain('<ul>')
  expect(html).toContain('<li>a</li>')
})

test('代码块转 pre/code', () => {
  const html = mdToHtml('```\ncode\n```')
  expect(html).toContain('<pre>')
  expect(html).toContain('<code>')
})

test('表格（gfm）', () => {
  const html = mdToHtml('| a | b |\n|---|---|\n| 1 | 2 |')
  expect(html).toContain('<table>')
})

test('空输入安全', () => {
  expect(mdToHtml('')).toBe('')
  expect(mdToHtml(null)).toBe('')
})
