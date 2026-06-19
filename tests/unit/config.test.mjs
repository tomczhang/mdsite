import { test, expect } from 'vitest'
import YAML from 'yaml'
import { defaultConfig, buildAnnotatedYaml } from '../../lib/config.mjs'

test('defaultConfig 派生 deploy_url', () => {
  const cfg = defaultConfig({ account: 'alice', repo: 'alice/pages' })
  expect(cfg.remote.deploy_url).toBe('https://alice.github.io/pages/')
  expect(cfg.remote.pages_branch).toBe('gh-pages')
})

test('buildAnnotatedYaml 可被 YAML 解析回来', () => {
  const cfg = defaultConfig({ account: 'alice', repo: 'alice/pages' })
  const text = buildAnnotatedYaml(cfg)
  const parsed = YAML.parse(text)
  expect(parsed.remote.repo).toBe('alice/pages')
  expect(parsed.remote.user).toBe('alice')
  expect(parsed.storage.slug_strategy).toBe('time-hash')
})

test('注释存在', () => {
  const text = buildAnnotatedYaml(defaultConfig({ account: 'a', repo: 'a/pages' }))
  expect(text).toContain('# mdsite 配置文件')
})
