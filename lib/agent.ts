import Anthropic from '@anthropic-ai/sdk'
import { search } from '@/lib/tavily'
import { read } from '@/lib/jina'
import { tools } from '@/lib/tools'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are a research assistant. Your job is to answer the user's question \
thoroughly and accurately by searching the web and reading relevant sources.

Instructions:
- Start by searching for the user's question. Use specific, targeted search queries.
- Read the most promising results to get detailed information.
- If your first search doesn't give enough information, search again with different terms.
- When you have enough information to write a thorough answer, stop searching.
- Write your answer in clear, well-structured markdown.
- ALWAYS cite your sources using inline numbered references like [1], [2], etc.
- At the end of your answer, list all sources with their numbers and URLs.
- Be thorough but concise. Aim for 200-400 words unless the topic requires more.
- If you cannot find reliable information, say so honestly.`

export async function runAgent(
  userMessage: string,
  onToken: (text: string) => void,
  onToolCall: (name: string, input: Record<string, string>) => void,
  onToolResult: (name: string, result: string) => void
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  let iterations = 0

  while (true) {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onToken(event.delta.text)
      }
    }

    const response = await stream.finalMessage()

    if (response.stop_reason === 'end_turn') {
      return
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of toolUseBlocks) {
      const input = block.input as Record<string, string>
      onToolCall(block.name, input)

      let result: string
      if (block.name === 'search') {
        const sources = await search(input.query)
        result = JSON.stringify(sources)
      } else {
        result = await read(input.url)
      }

      onToolResult(block.name, result)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      })
    }

    messages.push({ role: 'user', content: toolResults })

    iterations++
    if (iterations >= 10) {
      messages.push({
        role: 'user',
        content: "You've done enough research. Synthesize your answer now from what you've found.",
      })
    }
  }
}
