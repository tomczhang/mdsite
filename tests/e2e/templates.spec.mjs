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
import { MDSITE_FAVICON_LINK } from '../../lib/brand.mjs'
import { mdToHtml } from '../../lib/markdown.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const TPL = path.join(ROOT, 'templates')
const OUT = path.join(os.tmpdir(), 'mdsite-e2e-site')
// 截图产物留存在 repo 内，供 review 回看
const SHOTS = path.join(ROOT, 'test-results', 'mdsite')

function applyVars(content, vars) {
  const merged = { FAVICON: MDSITE_FAVICON_LINK, ...vars }
  return String(content).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(merged, k) ? String(merged[k] ?? '') : '')
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
  // 用真实 markdown 渲染（含速览卡 + 语义 callout + 表格），验证整条管线
  const bodyMd = [
    '<div class="ql-grid">'
      + '<div class="ql-card"><div class="ql-card-title">卡A</div><div class="ql-card-body">说明A</div></div>'
      + '<div class="ql-card"><div class="ql-card-title">卡B</div><div class="ql-card-body">说明B</div></div>'
      + '<div class="ql-card"><div class="ql-card-title">卡C</div><div class="ql-card-body">说明C</div></div></div>',
    '', // 内嵌 HTML 块后必须空行，否则后续 markdown 被并入 HTML 块
    '## 结论', '这是正文。', '- 要点一', '- 要点二', '',
    '> [!WARNING]', '> 小心这个坑', '',
    '| 列1 | 列2 |', '|---|---|', '| <span class="badge badge-green">EXP</span> | `code` |', '',
    '<div style="height:1500px"></div>', '', '## 背景', '背景说明。', '<div style="height:800px"></div>',
  ].join('\n')
  const reportHtml = applyVars(reportTpl, {
    TITLE: '近期报告', DATE: daysAgo(1), CATEGORY: 'report', SUMMARY: '这是一句摘要。',
    BODY: mdToHtml(bodyMd),
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
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /data:image\/svg\+xml/)
  await expect(page.locator('h1')).toHaveText('近期报告')
  await expect(page.getByText('这是一句摘要。')).toBeVisible()
  await expect(page.locator('.prose-mdsite h2').first()).toHaveText('结论')
  await expect(page.locator('.prose-mdsite li')).toHaveCount(2)
  // 语义 callout + 速览卡 + 徽章 都渲染
  await expect(page.locator('.callout-warning')).toBeVisible()
  await expect(page.locator('.ql-card')).toHaveCount(3)
  await expect(page.locator('.badge-green')).toHaveText('EXP')
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

test('doc 模板：左侧自动导航从标题生成', async ({ page }) => {
  const tpl = await readFile(path.join(TPL, 'doc.html'), 'utf8')
  const body = mdToHtml(['## 第一章', '内容一。', '### 小节', 'x', '## 第二章', '内容二。'].join('\n'))
  await writeFile(path.join(OUT, 'doc.html'), applyVars(tpl, {
    TITLE: '文档标题', DATE: daysAgo(1), CATEGORY: 'doc', SUMMARY: '一句话摘要',
    BODY: body, SITE_TITLE: 'Test Pages', ROOT: './',
  }), 'utf8')
  await page.goto(`${base}/doc.html`)
  await page.waitForTimeout(400)
  // 左侧 section 导航只放 h2（2 个章节）
  await expect(page.locator('#nav .nav-link')).toHaveCount(2)
  // 右侧本页目录放 h2+h3（2+1=3）
  await expect(page.locator('#toc .toc-link')).toHaveCount(3)
  await expect(page.locator('#article h2').first()).toHaveText('第一章')
  await page.screenshot({ path: path.join(SHOTS, 'doc.png'), fullPage: true })
})

test('dashboard 模板：KPI 卡 + echarts 图表渲染', async ({ page }) => {
  const tpl = await readFile(path.join(TPL, 'dashboard.html'), 'utf8')
  const body = [
    '<div class="kpi-grid"><div class="kpi-card"><div class="kpi-label">DAU</div><div class="kpi-value">12,345</div><div class="kpi-delta up">+5.2%</div></div></div>',
    '',
    '<div class="chart-card"><h3>趋势</h3><div class="chart" data-echarts=\'{"xAxis":{"type":"category","data":["一","二","三"]},"yAxis":{"type":"value"},"series":[{"type":"line","data":[12,20,15]}]}\'></div></div>',
  ].join('\n')
  await writeFile(path.join(OUT, 'dash.html'), applyVars(tpl, {
    TITLE: '看板标题', DATE: daysAgo(1), CATEGORY: 'dashboard', SUMMARY: '指标概览',
    BODY: body, SITE_TITLE: 'Test Pages', ROOT: './',
  }), 'utf8')
  await page.goto(`${base}/dash.html`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await expect(page.locator('.kpi-card .kpi-value')).toHaveText('12,345')
  // echarts 渲染出 canvas
  await expect(page.locator('.chart canvas')).toHaveCount(1)
  await page.screenshot({ path: path.join(SHOTS, 'dashboard.png'), fullPage: true })
})
