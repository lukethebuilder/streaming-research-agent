const TRUNCATE_LENGTH = 6000

export async function read(url: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`
  }

  const response = await fetch(`https://r.jina.ai/${url}`, { headers })

  if (!response.ok) {
    throw new Error(`Jina read failed: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  return text.slice(0, TRUNCATE_LENGTH)
}
