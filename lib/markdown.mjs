// Markdown → HTML 正文。基于 marked。
// publish 输入是 .md 时走这里；.html 输入则直通（见 cmds/publish.mjs）。
import { marked } from 'marked'

marked.setOptions({
  gfm: true, // GitHub flavored: 表格、删除线、任务列表等
  breaks: false,
})

/** 把 Markdown 文本转成 HTML 正文片段。 */
export function mdToHtml(md) {
  return marked.parse(String(md ?? ''))
}
