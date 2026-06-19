// 轻量日志 + token 脱敏。
// 安全要求（spec github-publish）：任何打印的命令/URL/错误都不得出现明文 token。

const TOKEN_PATTERNS = [
  // x-access-token:<token>@  /  user:<token>@
  /(x-access-token:)[^@\s/]+(@)/gi,
  /(:\/\/[^:/\s]+:)[^@\s/]+(@)/g,
  // 裸 GitHub token（ghp_/ github_pat_ / gho_ 等）
  /\b(gh[pousr]_[A-Za-z0-9]{20,})\b/g,
  /\b(github_pat_[A-Za-z0-9_]{20,})\b/g,
]

/** 把字符串里任何疑似 token 的部分脱敏成 *** */
export function redact(input) {
  let s = String(input ?? '')
  s = s.replace(TOKEN_PATTERNS[0], '$1***$2')
  s = s.replace(TOKEN_PATTERNS[1], '$1***$2')
  s = s.replace(TOKEN_PATTERNS[2], '***')
  s = s.replace(TOKEN_PATTERNS[3], '***')
  return s
}

const enabled = () => process.env.MDSITE_SILENT !== '1'

export const logger = {
  info: (m) => enabled() && console.error(redact(`  ${m}`)),
  ok: (m) => enabled() && console.error(redact(`✓ ${m}`)),
  step: (m) => enabled() && console.error(redact(`→ ${m}`)),
  warn: (m) => enabled() && console.error(redact(`! ${m}`)),
  error: (m) => console.error(redact(`✗ ${m}`)),
  dim: (m) => enabled() && console.error(redact(`  ${m}`)),
}
