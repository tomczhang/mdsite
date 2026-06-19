// 极薄的子进程封装。不用 zx，保持依赖最小。
// 安全：永不把 token 拼进可被日志打印的命令字符串；token 只经 env / stdin 传递。
import { execFile } from 'node:child_process'

/**
 * 运行命令，返回 { stdout, stderr, code }。
 * opts: { cwd, env, input(stdin), allowFail }
 * allowFail=false 且 code!=0 时抛错（错误信息已由调用方负责脱敏）。
 */
export function run(cmd, args = [], opts = {}) {
  const { cwd, env, input, allowFail = false } = opts
  return new Promise((resolve, reject) => {
    const child = execFile(
      cmd,
      args,
      { cwd, env: env ? { ...process.env, ...env } : process.env, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0
        const res = { stdout: stdout || '', stderr: stderr || '', code }
        if (code !== 0 && !allowFail) {
          const e = new Error(`命令失败（exit ${code}）：${cmd} ${args.join(' ')}\n${stderr || stdout}`)
          e.result = res
          return reject(e)
        }
        resolve(res)
      },
    )
    if (input !== undefined) {
      child.stdin.end(input)
    }
  })
}

/** 便捷：git 子命令。 */
export function git(args, opts = {}) {
  return run('git', args, opts)
}
