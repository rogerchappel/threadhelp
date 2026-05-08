const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\b(sk-(?:live|test|proj)?-[A-Za-z0-9_-]{12,})\b/g, "[REDACTED_OPENAI_KEY]"],
  [/\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g, "[REDACTED_SLACK_TOKEN]"],
  [/\b(gh[pousr]_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\b(AKIA[0-9A-Z]{16})\b/g, "[REDACTED_AWS_KEY]"],
  [/\b(password|passwd|api[_-]?key|secret|token)\s*[:=]\s*([^\s,;]+)/gi, "$1=[REDACTED]"]
];
export function redactText(value: string): { value: string; redacted: boolean } { let output = value; for (const [pattern, replacement] of SECRET_PATTERNS) output = output.replace(pattern, replacement); return { value: output, redacted: output !== value }; }
export function redactObject<T>(input: T): { value: T; redacted: boolean } { let redacted = false; function walk(value: unknown): unknown { if (typeof value === "string") { const result = redactText(value); redacted ||= result.redacted; return result.value; } if (Array.isArray(value)) return value.map(walk); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walk(item)])); return value; } return { value: walk(input) as T, redacted }; }
