import { test, expect } from 'vitest'
import { applyVars, siteTitleOf, varsFromConfig } from '../../lib/render.mjs'

test('applyVars 替换占位且无残留', () => {
  const out = applyVars('<h1>{{TITLE}}</h1><p>{{BODY}}</p>', { TITLE: 'Hi', BODY: 'x' })
  expect(out).toBe('<h1>Hi</h1><p>x</p>')
})

test('applyVars 未提供的占位替换为空串', () => {
  expect(applyVars('a{{MISSING}}b', {})).toBe('ab')
})

test('siteTitleOf 派生', () => {
  expect(siteTitleOf('ccc')).toBe('CCC Pages')
  expect(siteTitleOf('my-team-pages')).toBe('My Team Pages')
  expect(siteTitleOf('pages')).toBe('Pages')
})

test('varsFromConfig 用 site.title 覆盖', () => {
  const v = varsFromConfig({ remote: { repo: 'u/pages' }, site: { title: 'My Site' } })
  expect(v.SITE_TITLE).toBe('My Site')
})

test('varsFromConfig 无 title 时按 repo 名派生', () => {
  const v = varsFromConfig({ remote: { repo: 'u/team-pages' }, site: {} })
  expect(v.SITE_TITLE).toBe('Team Pages')
})
