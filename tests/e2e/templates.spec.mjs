// 模板渲染的可视化验证（Playwright 截图）：
//  - report 页正确渲染正文
//  - index 时间轴：>30 天报告默认折叠、可展开（折叠阈值浏览时按当前日期算）
import { test, expect } from '@playwright/test'
import http from 'node:http'
import { createReadStream } from 'node:fs'
import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const TPL = path.join(ROOT, 'templates')
const OUT = path.join(os.tmpdir(), 'mdsite-e2e-site')
// 截图产物留存在 repo 内，供 review 回看
const SHOTS = path.join(ROOT, 'test-results', 'mdsite')

function applyVars(content, vars) {
  return String(content).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k] ?? '') : '')
}

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8' }
let server
let base

const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 864e5)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test.beforeAll(async () => {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(SHOTS, { recursive: true })
  await mkdir(path.join(OUT, 'report', daysAgo(1)), { recursive: true })
  await mkdir(path.join(OUT, 'report', daysAgo(60)), { recursive: true })

  // 首页
  const indexTpl = await readFile(path.join(TPL, 'index.html'), 'utf8')
  await writeFile(path.join(OUT, 'index.html'),
    applyVars(indexTpl, { SITE_TITLE: 'Test Pages', SITE_TAGLINE: '测试时间轴' }), 'utf8')

  // 索引数据：1 篇近期 + 1 篇 60 天前（应折叠）
  const recentFile = `report/${daysAgo(1)}/recent.html`
  const oldFile = `report/${daysAgo(60)}/old.html`
  await writeFile(path.join(OUT, 'pages.json'), JSON.stringify([
    { filename: recentFile, title: '近期报告', category: 'report', date: daysAgo(1), summary: '最新' },
    { filename: oldFile, title: '陈年报告', category: 'report', date: daysAgo(60), summary: '很久以前' },
  ], null, 2), 'utf8')

  // 报告页
  const reportTpl = await readFile(path.join(TPL, 'report.html'), 'utf8')
  const reportHtml = applyVars(reportTpl, {
    TITLE: '近期报告', DATE: daysAgo(1), CATEGORY: 'report', SUMMARY: '这是一句摘要。',
    BODY: '<h2>结论</h2><p>这是正文。</p><ul><li>要点一</li><li>要点二</li></ul>'
      + '<div style="height:1500px"></div>'
      + '<h2>背景</h2><p>背景说明。</p><div style="height:800px"></div>',
    SITE_TITLE: 'Test Pages', ROOT: '../../',
  })
  await writeFile(path.join(OUT, recentFile), reportHtml, 'utf8')

  server = http.createServer(async (req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (rel.endsWith('/')) rel += 'index.html'
    const abs = path.join(OUT, rel)
    const st = await stat(abs).catch(() => null)
    if (!st || !st.isFile()) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'text/plain' })
    createReadStream(abs).pipe(res)
  })
  await new Promise((r) => server.listen(0, r))
  base = `http://localhost:${server.address().port}`
})

test.afterAll(async () => {
  await new Promise((r) => server.close(r))
  await rm(OUT, { recursive: true, force: true })
})

test('report 页渲染正文 + 摘要 + 自动大纲', async ({ page }) => {
  await page.goto(`${base}/report/${daysAgo(1)}/recent.html`)
  await expect(page.locator('h1')).toHaveText('近期报告')
  await expect(page.getByText('这是一句摘要。')).toBeVisible()
  await expect(page.locator('.prose-mdsite h2').first()).toHaveText('结论')
  await expect(page.locator('.prose-mdsite li')).toHaveCount(2)
  // 右侧大纲应从正文两个 h2 自动生成
  await expect(page.locator('#outline .outline-link')).toHaveCount(2)
  await page.screenshot({ path: path.join(SHOTS, 'report.png'), fullPage: true })
  // 滚动到第二个标题（放到视口顶部 ~15% 的高亮判定带内）→ 大纲对应项高亮（scroll-spy）
  await page.evaluate(() => {
    const h = document.querySelectorAll('.prose-mdsite h2')[1]
    const y = h.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.15
    window.scrollTo(0, y)
  })
  await expect(page.locator('#outline .outline-link', { hasText: '背景' })).toHaveClass(/active/)
})

test('index 时间轴：旧报告默认折叠、可展开', async ({ page }) => {
  await page.goto(`${base}/`)
  // 近期报告可见
  await expect(page.getByText('近期报告')).toBeVisible()
  // 60 天前报告默认折叠（不可见）
  await expect(page.getByText('陈年报告')).toBeHidden()
  // 折叠区有展开按钮
  const toggle = page.getByRole('button', { name: /显示更早的报告/ })
  await expect(toggle).toBeVisible()
  await page.screenshot({ path: path.join(SHOTS, 'index-folded.png'), fullPage: true })
  // 展开后可见
  await toggle.click()
  await expect(page.getByText('陈年报告')).toBeVisible()
  await page.screenshot({ path: path.join(SHOTS, 'index-expanded.png'), fullPage: true })
})
