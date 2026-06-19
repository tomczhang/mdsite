import { test, expect } from 'vitest'
import { mdToHtml, transformAlerts } from '../../lib/markdown.mjs'

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

test('GitHub 风格语义提示块 → callout', () => {
  const html = mdToHtml('> [!WARNING]\n> 小心这个坑')
  expect(html).toContain('callout callout-warning')
  expect(html).toContain('注意') // 标签
  expect(html).toContain('小心这个坑')
  expect(html).not.toContain('[!WARNING]') // 标记被消费
})

test('每种 alert 类型映射对应 class', () => {
  expect(mdToHtml('> [!NOTE]\n> x')).toContain('callout-note')
  expect(mdToHtml('> [!TIP]\n> x')).toContain('callout-tip')
  expect(mdToHtml('> [!IMPORTANT]\n> x')).toContain('callout-important')
  expect(mdToHtml('> [!CAUTION]\n> x')).toContain('callout-caution')
})

test('普通引用不被误转', () => {
  const html = mdToHtml('> 普通引用')
  expect(html).toContain('<blockquote>')
  expect(html).not.toContain('callout')
})

test('未知 [!XXX] 不转，保持普通引用', () => {
  const html = transformAlerts('<blockquote>\n<p>[!FOO]\nbody</p>\n</blockquote>')
  expect(html).toContain('<blockquote>')
  expect(html).not.toContain('callout')
})
