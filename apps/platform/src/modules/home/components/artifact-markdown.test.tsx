import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { artifactMarkdownComponents, resolveArtifactUrl } from './artifact-markdown'

const sessionId = '00000000-0000-4000-8000-000000000001'

describe('artifact urls', () => {
  it('maps the artifact protocol to the API', () => {
    expect(resolveArtifactUrl(`/s/${sessionId}/artifacts/sales.png`)).toBe(
      `${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/artifacts/sales.png`,
    )
  })

  it('leaves other urls untouched', () => {
    expect(resolveArtifactUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(resolveArtifactUrl(`/s/${sessionId}`)).toBe(`/s/${sessionId}`)
    expect(resolveArtifactUrl(`/s/${sessionId}/artifacts/..%2Fb.png`)).toBe(
      `/s/${sessionId}/artifacts/..%2Fb.png`,
    )
  })

  it('renders artifact images but not images from other hosts', () => {
    const Img = artifactMarkdownComponents.img!
    render(
      <>
        <Img node={undefined} src={`/s/${sessionId}/artifacts/sales.png`} alt="chart" />
        <Img node={undefined} src="https://evil.example/p.png?d=secret" alt="blocked" />
      </>,
    )
    expect(screen.getByRole('img', { name: 'chart' })).toBeVisible()
    expect(screen.queryByRole('img', { name: 'blocked' })).toBeNull()
    expect(screen.getByText('blocked')).toBeVisible()
  })
})
