import { test, expect } from 'vitest'
import path from 'node:path'
import { safeResolve } from '../../cmds/serve.mjs'

const root = '/tmp/site'

test('正常路径解析到 root 之内', () => {
  expect(safeResolve(root, '/index.html')).toBe(path.join(root, 'index.html'))
  expect(safeResolve(root, '/report/x.html')).toBe(path.join(root, 'report/x.html'))
})

test('目录结尾补 index.html', () => {
  expect(safeResolve(root, '/')).toBe(path.join(root, 'index.html'))
  expect(safeResolve(root, '/report/')).toBe(path.join(root, 'report/index.html'))
})

test('目录穿越被拒（返回 null）', () => {
  expect(safeResolve(root, '/../site2/secret.txt')).toBeNull()
  expect(safeResolve(root, '/../../etc/passwd')).toBeNull()
})

test('前缀绕过被拒：/tmp/site 不匹配 /tmp/site2', () => {
  // 旧实现 abs.startsWith(root) 会把 /tmp/site2 误判为合法；新实现用 path.relative
  expect(safeResolve('/tmp/site', '/../site2/x')).toBeNull()
})
