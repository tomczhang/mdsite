// serve：本地静态预览工作区（站点根），发布前肉眼看。零依赖 node http。
import http from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { MDLINK_HOME } from '../lib/paths.mjs'
import { logger } from '../lib/log.mjs'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

export async function runServe(args) {
  const port = Number(args.flags.port) || 1700
  const root = MDLINK_HOME

  const server = http.createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      if (rel.endsWith('/')) rel += 'index.html'
      const abs = path.resolve(root, '.' + (rel.startsWith('/') ? rel : '/' + rel))
      // 防目录穿越：abs 必须在 root 之内（用 path.relative，不靠字符串前缀）
      const relCheck = path.relative(root, abs)
      if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
        res.writeHead(403).end('forbidden'); return
      }
      const st = await stat(abs).catch(() => null)
      if (!st || !st.isFile()) { res.writeHead(404).end('not found'); return }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' })
      createReadStream(abs).pipe(res)
    } catch {
      res.writeHead(500).end('error')
    }
  })

  return new Promise((resolve) => {
    // 只监听本机回环，不对外暴露本地工作区
    server.listen(port, '127.0.0.1', () => {
      logger.ok(`本地预览：http://127.0.0.1:${port}/`)
      logger.dim('Ctrl+C 退出')
    })
    // serve 是长驻进程，不 resolve（直到被杀）。测试时不会真跑。
    process.on('SIGINT', () => { server.close(); resolve(0) })
  })
}
