'use client'

import { useState, useRef, useEffect } from 'react'
import type { Source, ThinkingStep } from '@/lib/types'
import SearchInput from '@/components/search-input'
import ThinkingStepItem from '@/components/thinking-step'
import SourcesPanel from '@/components/sources-panel'
import Message from '@/components/message'

type StepWithStatus = ThinkingStep & { done: boolean }

interface Turn {
  question: string
  steps: StepWithStatus[]
  answer: string
  sources: Source[]
}

export default function Chat() {
  const [turn, setTurn] = useState<Turn | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasEverSubmitted, setHasEverSubmitted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turn])

  async function handleSubmit(query: string) {
    setHasEverSubmitted(true)
    setIsLoading(true)
    setTurn({ question: query, steps: [], answer: '', sources: [] })

    // Local mutable state — avoids stale closure issues in streaming loop
    let localSteps: StepWithStatus[] = []
    let localSources: Source[] = []
    let pendingIdx = -1

    function updateTurn(patch: Partial<Turn>) {
      setTurn((prev) => (prev ? { ...prev, ...patch } : null))
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: query }] }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`)
        updateTurn({ answer: `Request failed (${response.status}): ${errorText}` })
        return
      }

      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let localAnswer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          let event: Record<string, unknown>
          try {
            event = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (event.type === 'text') {
            localAnswer += event.text as string
            updateTurn({ answer: localAnswer })
          } else if (event.type === 'tool_call') {
            const name = event.name as string
            const input = event.input as Record<string, string>
            const step: StepWithStatus =
              name === 'search'
                ? {
                    type: 'search',
                    query: input.query,
                    summary: `Searching for: "${input.query}"`,
                    done: false,
                  }
                : {
                    type: 'read',
                    url: input.url,
                    summary: `Reading: ${input.url}`,
                    done: false,
                  }
            pendingIdx = localSteps.length
            localSteps = [...localSteps, step]
            updateTurn({ steps: localSteps })
          } else if (event.type === 'tool_result') {
            if (pendingIdx < 0) continue
            const name = event.name as string
            const result = event.result as string

            if (name === 'search') {
              let parsed: Source[] = []
              try {
                parsed = JSON.parse(result) as Source[]
              } catch { /* empty */ }
              localSources = [...localSources, ...parsed]
              localSteps = localSteps.map((s, i) =>
                i === pendingIdx ? { ...s, done: true, sources: parsed } : s
              )
              updateTurn({ steps: localSteps, sources: localSources })
            } else {
              localSteps = localSteps.map((s, i) =>
                i === pendingIdx ? { ...s, done: true } : s
              )
              updateTurn({ steps: localSteps })
            }
          }
        }
      }
    } catch (err) {
      updateTurn({ answer: `Error: ${String(err)}` })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      {/* Scrollable content area with bottom padding for the fixed input */}
      <div className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
          {!hasEverSubmitted && (
            <div className="text-center py-20 text-zinc-600 select-none">
              <p className="text-4xl mb-3">🔬</p>
              <p className="text-zinc-400 text-lg font-medium mb-1">Research Agent</p>
              <p className="text-sm">Ask a question. Watch it think.</p>
            </div>
          )}

          {turn && (
            <div className="space-y-6">
              {/* User question */}
              <div className="flex justify-end">
                <div className="bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm">
                  {turn.question}
                </div>
              </div>

              {/* Agent response */}
              <div className="space-y-4">
                {/* Thinking steps */}
                {turn.steps.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 px-4 py-3 space-y-0.5">
                    <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider mb-2">
                      Research steps
                    </p>
                    {turn.steps.map((step, i) => (
                      <ThinkingStepItem key={i} step={step} />
                    ))}
                    {isLoading && turn.steps.length === 0 && (
                      <div className="flex items-center gap-2 text-zinc-500 text-sm py-1">
                        <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        <span>Starting research…</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Streaming answer */}
                {turn.answer && (
                  <div className="px-1">
                    <Message content={turn.answer} sources={turn.sources} />
                    {isLoading && (
                      <span className="inline-block w-0.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                )}

                {/* Loading state — no steps yet, no answer yet */}
                {isLoading && turn.steps.length === 0 && !turn.answer && (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm px-1">
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <span>Researching…</span>
                  </div>
                )}

                {/* Sources */}
                {!isLoading && turn.sources.length > 0 && (
                  <SourcesPanel sources={turn.sources} />
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Fixed input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800/50 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <SearchInput onSubmit={handleSubmit} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
