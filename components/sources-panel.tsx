import type { Source } from '@/lib/types'

interface Props {
  sources: Source[]
}

function faviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`
  } catch {
    return ''
  }
}

export default function SourcesPanel({ sources }: Props) {
  if (sources.length === 0) return null

  return (
    <div className="mt-6 pt-5 border-t border-zinc-800">
      <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">
        Sources
      </h3>
      <div className="grid gap-1.5">
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-800/60 transition-colors group"
          >
            <span className="text-zinc-600 text-xs font-mono mt-0.5 w-4 shrink-0 text-right">
              {i + 1}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={faviconUrl(source.url)}
              alt=""
              width={16}
              height={16}
              className="mt-0.5 shrink-0 opacity-70"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate transition-colors leading-snug">
                {source.title || source.url}
              </p>
              <p className="text-xs text-zinc-600 truncate mt-0.5">{source.url}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
