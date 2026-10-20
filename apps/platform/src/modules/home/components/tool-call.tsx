import type { UIToolMessagePart } from '@anvia/client'

const MAX_SUMMARY = 90
// Arguments that best say what a call does come first, so truncation drops the least useful ones.
const LEADING_KEYS = ['command', 'query', 'url', 'path', 'name', 'id']

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim()
  if (value !== null && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function rank(key: string) {
  const index = LEADING_KEYS.indexOf(key)
  return index === -1 ? LEADING_KEYS.length : index
}

function truncate(text: string) {
  return text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY - 1)}…` : text
}

/** A one-line description of what a tool call did, taken from its arguments or its failure. */
export function summarizeToolCall(part: UIToolMessagePart) {
  if (part.state === 'error') return truncate(`failed: ${part.error.message}`)
  if (part.state === 'input-streaming') return 'preparing…'
  const input = part.input
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return input === null || input === undefined ? '' : truncate(formatValue(input))
  }
  const entries = Object.entries(input)
    .filter(([, value]) => value !== '' && value != null)
    // `filter` returned a new array, and the ES2022 lib has no `toSorted`.
    // oxlint-disable-next-line unicorn/no-array-sort
    .sort(([a], [b]) => rank(a) - rank(b))
  return truncate(entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join(', '))
}

export function ToolCall({ part }: { part: UIToolMessagePart }) {
  const summary = summarizeToolCall(part)
  return (
    <p
      data-state={part.state}
      className="my-1 truncate font-mono text-[13px] leading-6 text-[#73726c] data-[state=error]:text-destructive"
    >
      <span className="text-[#3d3d3a]">{part.toolName}</span>
      {summary && ` - ${summary}`}
    </p>
  )
}
