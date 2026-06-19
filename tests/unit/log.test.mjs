import { test, expect } from 'vitest'
import { redact } from '../../lib/log.mjs'

test('脱敏 remote URL 里的 token', () => {
  const s = redact('https://x-access-token:ghp_abcdefghijklmnopqrstuvwxyz0123@github.com/u/r.git')
  expect(s).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123')
  expect(s).toContain('x-access-token:***')
})

test('脱敏裸 GitHub token', () => {
  expect(redact('token=ghp_abcdefghijklmnopqrstuvwxyz0123')).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123')
  expect(redact('github_pat_11ABCDEFG0123456789_abcdefghijklmnop')).toContain('***')
})

test('普通文本不受影响', () => {
  expect(redact('hello world')).toBe('hello world')
})
