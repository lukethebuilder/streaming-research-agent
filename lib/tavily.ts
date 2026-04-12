import type { Source } from '@/lib/types'

interface TavilyResult {
  title: string
  url: string
  content: string
}

interface TavilyResponse {
  results: TavilyResult[]
}

export async function search(query: string): Promise<Source[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      max_results: 5,
      include_raw_content: false,
      api_key: process.env.TAVILY_API_KEY,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`)
  }

  const data: TavilyResponse = await response.json()

  return data.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }))
}
