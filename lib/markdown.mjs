// Markdown → HTML 正文。基于 marked。
// publish 输入是 .md 时走这里；.html 输入则直通（见 cmds/publish.mjs）。
import { marked } from 'marked'

marked.setOptions({
  gfm: true, // GitHub flavored: 表格、删除线、任务列表等
  breaks: false,
})

// GitHub 风格语义提示块（按语义定色 + 图标）。模板提供对应 .callout-* 样式。
const ALERTS = {
  NOTE: { cls: 'note', label: '说明', icon: 'ℹ️' },
  TIP: { cls: 'tip', label: '提示', icon: '💡' },
  IMPORTANT: { cls: 'important', label: '重点', icon: '🔆' },
  WARNING: { cls: 'warning', label: '注意', icon: '⚠️' },
  CAUTION: { cls: 'caution', label: '警告', icon: '⛔' },
}

/**
 * 把以 `[!TYPE]` 开头的 blockquote 转成语义 callout div。
 * marked 把 `> [!WARNING]\n> body` 渲染成 `<blockquote><p>[!WARNING]\nbody</p></blockquote>`。
 * 逐个 blockquote 处理：命中则替换，未命中保持普通引用。
 */
export function transformAlerts(html) {
  return String(html).replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (full, inner) => {
    const m = inner.match(/^\s*<p>\s*\[!(\w+)\]\s*(?:<br\s*\/?>|\n)?/i)
    if (!m) return full
    const def = ALERTS[m[1].toUpperCase()]
    if (!def) return full
    let body = inner.replace(/^\s*<p>\s*\[![^\]]+\]\s*(?:<br\s*\/?>|\n)?/i, '<p>')
    body = body.replace(/^\s*<p>\s*<\/p>\s*/i, '') // marker 单独成段时去掉残留的空 <p>

    return `<div class="callout callout-${def.cls}">` +
      `<div class="callout-title"><span class="callout-icon">${def.icon}</span>${def.label}</div>` +
      `<div class="callout-body">${body}</div></div>`
  })
}

/** 把 Markdown 文本转成 HTML 正文片段。 */
export function mdToHtml(md) {
  return transformAlerts(marked.parse(String(md ?? '')))
}

/** 是否为「整页 HTML 文档」（含 <!doctype html> 或 <html ...>）。
 *  整页文档应原样发布(不套报告模板)；HTML 片段则作为正文灌入模板。 */
export function isFullHtmlDoc(html) {
  return /<!doctype\s+html|<html[\s>]/i.test(String(html ?? ''))
}
