import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { Source } from '@/lib/types'

interface Props {
  content: string
  sources: Source[]
}

function linkifyCitations(text: string, sources: Source[]): string {
  return text.replace(/\[(\d+)\]/g, (_match, num: string) => {
    const idx = parseInt(num, 10) - 1
    const source = sources[idx]
    return source ? `[[${num}]](${source.url})` : `[${num}]`
  })
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-zinc-100 mt-5 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-zinc-100 mt-4 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-zinc-200 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-zinc-300 mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 text-zinc-300 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 text-zinc-300 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="text-zinc-200 font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="text-zinc-300 italic">{children}</em>,
  code: ({ children }) => (
    <code className="text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded text-[0.85em] font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3 text-sm font-mono">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-700 pl-4 text-zinc-400 italic mb-3">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-zinc-800 my-4" />,
}

export default function Message({ content, sources }: Props) {
  const processed = sources.length > 0 ? linkifyCitations(content, sources) : content

  return (
    <div className="min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  )
}
