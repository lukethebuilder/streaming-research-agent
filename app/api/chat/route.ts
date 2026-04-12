import { runAgent } from '@/lib/agent'

export const runtime = 'nodejs'
export const maxDuration = 30

function encodeLine(obj: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n')
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json()
  const messages: Array<{ role: string; content: string }> = body.messages ?? []
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userMessage = typeof lastUser?.content === 'string' ? lastUser.content : ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runAgent(
          userMessage,
          (text) => controller.enqueue(encodeLine({ type: 'text', text })),
          (name, input) => controller.enqueue(encodeLine({ type: 'tool_call', name, input })),
          (name, result) => controller.enqueue(encodeLine({ type: 'tool_result', name, result })),
        )
      } catch (err) {
        controller.enqueue(encodeLine({ type: 'error', message: String(err) }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
