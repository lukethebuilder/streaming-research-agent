'use client'

import { useState } from 'react'
import type { ThinkingStep } from '@/lib/types'

type StepWithStatus = ThinkingStep & { done: boolean }

interface Props {
  step: StepWithStatus
}

const ICONS: Record<ThinkingStep['type'], string> = {
  search: '🔍',
  read: '📖',
  reasoning: '💭',
}

export default function ThinkingStepItem({ step }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = step.sources && step.sources.length > 0

  return (
    <div className="text-sm">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`flex items-center gap-2 w-full text-left py-1 transition-colors ${hasDetails ? 'cursor-pointer hover:text-zinc-300' : 'cursor-default'} text-zinc-500`}
      >
        <span className="w-4 shrink-0 flex items-center justify-center">
          {step.done ? (
            <span className="text-emerald-500 text-xs">✓</span>
          ) : (
            <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          )}
        </span>
        <span>{ICONS[step.type]}</span>
        <span className="flex-1 truncate">{step.summary}</span>
        {hasDetails && (
          <span className="text-zinc-700 text-xs">{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {expanded && hasDetails && (
        <ul className="ml-8 mt-1 mb-1 space-y-1 border-l border-zinc-800 pl-3">
          {step.sources!.map((source, i) => (
            <li key={i}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 truncate block transition-colors"
              >
                {source.title || source.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
