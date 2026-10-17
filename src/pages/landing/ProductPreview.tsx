import clsx from 'clsx'
import { ArrowRight, ChevronDown, ScanSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { groupLabel, groupRoute } from '../../app/detail/breakdown'
import { Amount, KindBadge, RecoveryBar, SummaryLine } from '../../components/recovery'
import { GradeBadge } from '../../components/ui'
import { buildDemoItems } from '../../data/demoSeed'
import { inr } from '../../lib/format'
import { DEFAULT_RATES, estimateFromRates, estimateInputFor, type EstimateField } from '../../lib/rates'
import { calculateRecovery } from '../../lib/recovery'
import { DEFECT_LABEL, GRADE_GUIDE } from '../../lib/types'

const EXAMPLES = [
  { id: 'sample-02', tab: 'Sneakers' },
  { id: 'sample-07', tab: 'Leather tote' },
  { id: 'sample-04', tab: 'Denim' },
]

/**
 * Homepage preview of the real product: the same calculation engine and default
 * rate card as the app, run on fictional sample products.
 */
export default function ProductPreview() {
  const items = useMemo(() => buildDemoItems(), [])
  const [tab, setTab] = useState(EXAMPLES[0].id)
  const item = items.find((i) => i.id === tab)!
  const calc = useMemo(() => calculateRecovery(item), [item])
  const est = useMemo(() => estimateFromRates(estimateInputFor(item), DEFAULT_RATES), [item])
  const [open, setOpen] = useState<string | null>(null)
  const openRoute = open
  const maxGross = Math.max(1, ...calc.routes.filter((r) => r.configured).map((r) => r.gross))

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_30px_80px_-30px_rgb(11_61_47/0.35)]">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-paper/60 px-3 py-2.5">
        <div className="flex gap-1 rounded-xl bg-paper-2 p-0.5" role="tablist" aria-label="Example products">
          {EXAMPLES.map((e) => (
            <button
              key={e.id}
              role="tab"
              aria-selected={tab === e.id}
              onClick={() => {
                setTab(e.id)
                setOpen(null)
              }}
              className={clsx('rounded-lg px-2.5 py-1 text-xs font-medium transition', tab === e.id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}
            >
              {e.tab}
            </button>
          ))}
        </div>
        <span className="hidden text-[11px] text-muted sm:inline">Example · fictional product</span>
      </div>

      {/* 1 · Visible damage */}
      <div className="flex gap-3.5 px-4 pb-3 pt-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-paper-2">
          <img src={item.photos[0]} alt="" className="size-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="text-xs text-muted">{item.category} · {inr(item.original_price)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <GradeBadge grade={item.grade} />
            <span className="text-xs font-medium">{item.grade && GRADE_GUIDE[item.grade].short}</span>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <ScanSearch className="size-3.5" /> 1 · Visible damage
        </p>
        <ul className="mt-1.5 space-y-1">
          {item.defects.map((d) => (
            <li key={d.type} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate">{DEFECT_LABEL[d.type]} <span className="text-muted">— {d.description}</span></span>
              <span className="shrink-0 rounded-md bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-2">{d.severity}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[11px] text-muted">In the app the AI lists these from your photos. It never sets a price.</p>
      </div>

      {/* 2 · What each option recovers */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">2 · What each option recovers</p>
          <p className="text-[11px] text-muted">Tap one to see every line and its source</p>
        </div>
        <div className="mt-2 space-y-1.5">
          {calc.routes.map((r) => {
            const isOpen = openRoute === r.route && r.configured
            const best = calc.recommended === r.route
            return (
              <div key={r.route} className={clsx('rounded-xl border', best ? 'border-brand-400 bg-brand-50/40' : 'border-line')}>
                <button className="w-full px-3 py-2 text-left" onClick={() => setOpen(isOpen ? '' : r.route)} aria-expanded={isOpen} disabled={!r.configured}>
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {r.label}
                      {best && <span className="ml-1.5 rounded-full bg-brand-700 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-white">Best</span>}
                    </span>
                    {!r.eligible && <span className="hidden text-[11px] text-muted sm:inline">{r.ineligibleReason}</span>}
                    <span className={clsx('whitespace-nowrap font-display text-lg leading-none tabular', !r.eligible ? 'text-muted' : r.net < 0 && 'text-red-700')}>{r.configured ? inr(r.net) : '—'}</span>
                    {r.configured && <ChevronDown className={clsx('size-3.5 text-muted transition', isOpen && 'rotate-180')} />}
                  </div>
                  {r.configured && <RecoveryBar r={r} maxGross={maxGross} dim={!r.eligible} />}
                  {best && !isOpen && <SummaryLine r={r} className="mt-1.5 text-muted" />}
                  {!r.eligible && <p className="mt-1 text-[11px] text-muted sm:hidden">{r.ineligibleReason}</p>}
                </button>
                {isOpen && (
                  <div className="space-y-2 border-t border-line px-3 py-2.5">
                    <SummaryLine r={r} className="text-muted" />
                    {groupRoute(r).groups.map((g) => (
                      <div key={g.key}>
                        <div className="flex justify-between gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                          <span>{groupLabel(r.route, g.key)}</span>
                          <Amount n={g.total} className="text-ink" />
                        </div>
                        <ul className="mt-1 space-y-1 border-l-2 border-line pl-2.5">
                          {g.lines.flatMap((l) => (l.field ? est.notes[l.field as EstimateField] ?? [] : [])).map((n, i) => (
                            <li key={i} className="flex justify-between gap-3 text-[12px]">
                              <span className="min-w-0 text-ink-2">{n.text}<KindBadge kind={n.kind} source={n.source} /></span>
                              {g.key !== 'fees' && <span className="shrink-0 whitespace-nowrap tabular text-muted">{inr(n.amount)}</span>}
                              {g.key === 'fees' && <span className="shrink-0 whitespace-nowrap tabular text-muted">{n.amount}%</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3 · You decide */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/60 px-4 py-3">
        <p className="text-[12px] text-ink-2"><span className="font-semibold">3 · You decide.</span> Confirm, pick another option, or enter a real quote.</p>
        <Link to={`/demo/returns/${item.id}`} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-brand-700 hover:underline">
          Open in the demo <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
