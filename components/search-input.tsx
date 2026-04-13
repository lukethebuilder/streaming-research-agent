'use client'

import { useState, type FormEvent } from 'react'

interface Props {
  onSubmit: (query: string) => void
  disabled: boolean
}

const EXAMPLES = [
  'What are the leading theories on dark matter?',
  'How does mRNA vaccine technology work?',
  'What caused the 2008 financial crisis?',
]

export default function SearchInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed && !disabled) {
      onSubmit(trimmed)
      setValue('')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs flex-wrap">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => !disabled && onSubmit(q)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask a research question..."
          disabled={disabled}
          className="flex-1 bg-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 border border-zinc-700 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-5 py-3 text-sm font-medium transition-colors"
        >
          ↵
        </button>
      </form>
    </div>
  )
}
