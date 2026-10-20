import type { ComponentProps } from 'react'
import type { MessagePrimitive } from '@anvia/react-ui'

type Components = NonNullable<ComponentProps<typeof MessagePrimitive.Markdown>['components']>

const artifactPath = /^\/s\/([0-9a-f-]{36})\/artifacts\/((?!\.)[A-Za-z0-9._-]{1,200})$/i

// The agent links files as /s/:id/artifacts/:file; the API serves them under /api/sessions.
export function resolveArtifactUrl(url: string | undefined) {
  const match = url ? artifactPath.exec(url) : null
  if (!match) return url
  const [, sessionId, name] = match
  return `${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/artifacts/${name}`
}

export const artifactMarkdownComponents: Components = {
  a: ({ node: _node, href, children, ...props }) => {
    const url = resolveArtifactUrl(href)
    return (
      <a {...props} href={url} {...(url !== href && { target: '_blank', rel: 'noreferrer' })}>
        {children}
      </a>
    )
  },
  // Only the user's own artifacts render as images. Model output can carry untrusted data from
  // tools, and an arbitrary image URL would let it send that data to another host.
  img: ({ node: _node, src, alt, ...props }) => {
    const url = typeof src === 'string' ? resolveArtifactUrl(src) : undefined
    if (!url || url === src) return <span>{alt}</span>
    return <img {...props} src={url} alt={alt ?? ''} className="my-3 max-w-full rounded-lg" />
  },
}
