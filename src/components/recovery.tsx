// Shared pieces for showing a recovery calculation: used in the app and on the homepage preview.
import clsx from 'clsx'
import { ExternalLink } from 'lucide-react'
import { groupRoute, GROUP_META, summaryParts } from '../app/detail/breakdown'
import { inr } from '../lib/format'
import { RATE_SOURCES, RATES_CHECKED_ON, type InputKind, type SourceKey } from '../lib/rates'
import type { RouteResult } from '../lib/recovery'

export function KindDot({ kind }: { kind: InputKind | 'quote' | 'ai' }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-block size-2 shrink-0 rounded-full',
        kind === 'business' || kind === 'quote' ? 'bg-brand-600' : kind === 'published' ? 'bg-ink' : kind === 'ai' ? 'bg-red-500' : 'border border-amber-500 bg-amber-100',
      )}
    />
  )
}

export function RecoveryBar({ r, maxGross, dim }: { r: RouteResult; maxGross: number; dim: boolean }) {
  const g = groupRoute(r)
  if (g.gross <= 0) return null
  const width = (n: number) => `${Math.max(0, (Math.abs(n) / maxGross) * 100)}%`
  const costs = g.groups.filter((x) => x.key !== 'in')
  return (
    <div className={clsx('mt-3 flex h-2.5 overflow-hidden rounded-full bg-paper-2', dim && 'opacity-50')} role="img" aria-label={`Of ${inr(g.gross)}: net ${inr(g.net)}`}>
      {g.net > 0 && <div className="bg-brand-600" style={{ width: width(g.net) }} />}
      {costs.map((c) => (
        <div key={c.key} className={GROUP_META[c.key].bar} style={{ width: width(Math.min(Math.abs(c.total), g.gross)) }} />
      ))}
    </div>
  )
}

export function SummaryLine({ r, className }: { r: RouteResult; className?: string }) {
  const parts = summaryParts(r)
  return (
    <p className={clsx('flex flex-wrap gap-x-1.5 text-xs leading-relaxed', className)}>
      {parts.map((p, i) => (
        <span key={p.key} className="whitespace-nowrap">
          {i > 0 && <span className="mr-1.5">{p.amount < 0 ? '−' : '+'}</span>}
          <span className="tabular text-ink-2">{inr(Math.abs(p.amount))}</span> {p.label}
        </span>
      ))}
    </p>
  )
}

export function Amount({ n, className }: { n: number; className?: string }) {
  return (
    <span className={clsx('shrink-0 whitespace-nowrap tabular', n < 0 && 'text-red-700', className)}>
      {n < 0 ? '− ' : '+ '}
      {inr(Math.abs(n), true)}
    </span>
  )
}

export function KindBadge({ kind, source }: { kind: InputKind | 'quote' | 'ai'; source?: SourceKey }) {
  const src = source ? RATE_SOURCES[source] : null
  return (
    <span className="ml-1.5 inline-flex flex-wrap items-center gap-1 align-middle">
      <span
        className={clsx(
          'inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-px text-[10px] font-medium',
          kind === 'published' ? 'bg-ink/[0.06] text-ink' : kind === 'assumption' ? 'bg-amber-50 text-amber-800' : kind === 'ai' ? 'bg-red-50 text-red-800' : 'bg-brand-50 text-brand-800',
        )}
      >
        <KindDot kind={kind} />
        {KIND_LABEL[kind]}
      </span>
      {src && (
        <a
          href={src.url}
          target="_blank"
          rel="noreferrer"
          title={`${src.title} — ${src.effective}. Checked ${RATES_CHECKED_ON}.`}
          className="inline-flex items-center gap-0.5 whitespace-nowrap text-[10px] text-brand-700 hover:underline"
        >
          {kind === 'assumption' ? `rate: ${src.publisher}` : src.publisher}
          <ExternalLink className="size-2.5" />
        </a>
      )}
    </span>
  )
}

const KIND_LABEL: Record<InputKind | 'quote' | 'ai', string> = {
  business: 'Your value',
  published: 'Published',
  assumption: 'Assumption',
  quote: 'Quote you recorded',
  ai: 'Older AI value — not sourced',
}
