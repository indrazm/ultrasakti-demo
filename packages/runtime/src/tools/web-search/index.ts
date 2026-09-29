import { createTool } from '@anvia/core'
import Exa from 'exa-js'
import { z } from 'zod'

export function createWebSearchTools(apiKey: string) {
  if (!apiKey) throw new Error('Exa API key is required')

  const exa = new Exa(apiKey)

  const searchWeb = createTool({
    name: 'search-web',
    description: 'Search the web for relevant pages and excerpts.',
    inputSchema: z.object({ query: z.string().min(1) }),
    async execute({ query }) {
      const { results } = await exa.search(query, {
        type: 'auto',
        numResults: 5,
        contents: { highlights: true },
      })

      return results.map(({ title, url, publishedDate, highlights }) => ({
        title,
        url,
        publishedDate: publishedDate ?? null,
        highlights,
      }))
    },
  })

  const fetch = createTool({
    name: 'fetch',
    description: 'Fetch the text of a web page by URL.',
    inputSchema: z.object({ url: z.url() }),
    async execute({ url }) {
      if (!['http:', 'https:'].includes(new URL(url).protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported')
      }

      const { results } = await exa.getContents([url], { text: { maxCharacters: 10_000 } })
      const result = results[0]
      return result
        ? { title: result.title, url: result.url, text: result.text }
        : { url, error: 'No content found' }
    },
  })

  return { searchWeb, fetch }
}
