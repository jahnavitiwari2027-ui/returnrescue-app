import clsx from 'clsx'
import { ChevronDown, Lock, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useRates } from '../../data/rates'
import { inr } from '../../lib/format'
import {
  estimateFromRates,
  estimateInputFor,
  isLocked,
  matchesRates,
  RATES_CHECKED_ON,
  ratesPatch,
  type EstimateField,
  type EstimateLine,
} from '../../lib/rates'
import { calculateRecovery, type BreakdownLine, type RouteResult } from '../../lib/recovery'
import type { ReturnItem, RouteKey, ValueBasis } from '../../lib/types'
import { Amount, KindBadge, KindDot, RecoveryBar, SummaryLine } from '../../components/recovery'
import { GROUP_META, groupLabel, groupRoute } from './breakdown'

const COST_FIELDS = new Set<EstimateField>(['selling_fee_pct', 'handling_cost'])

/** The recovery maths for one return: a bar and one-line summary per option, details on tap. */
export default function OptionsMaths({ item }: { item: ReturnItem }) {
  const { update, base } = useWorkspace()
  const { rates } = useRates()
  const grade = item.grade ?? item.ai_inspection?.proposed_grade ?? null
  const calc = useMemo(() => calculateRecovery({ ...item, grade }), [item, grade])
  const est = useMemo(() => estimateFromRates(estimateInputFor(item), rates), [item, rates])
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const locked = isLocked(item)

  const basisOf = (field: EstimateField, route: RouteKey): ValueBasis =>
    (COST_FIELDS.has(field) ? item.value_basis.costs : item.value_basis[route]) ?? 'estimate'
  const hasAi = Object.values(item.value_basis).includes('ai')
  const maxGross = Math.max(1, ...calc.routes.filter((r) => r.configured).map((r) => r.gross))

  const recalc = async () => {
    setBusy(true)
    try {
      await update(item.id, ratesPatch(item, est, { replaceAi: true }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Legend />
      {locked ? (
        <p className="flex gap-2 rounded-xl bg-paper p-3 text-xs text-ink-2">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          These are the values your decision was saved with. Changing your rates won’t alter them; change the grade or the decision to re-price.
        </p>
      ) : (
        hasAi && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <p>Some values here were suggested by the AI under our older method, so they can’t be traced to a source.</p>
            <Button size="sm" variant="secondary" className="mt-2" loading={busy} onClick={recalc} icon={<RefreshCw className="size-3.5" />}>
              Recalculate with your rate card
            </Button>
          </div>
        )
      )}

      {calc.routes.map((r) => {
        const isOpen = open === r.route
        const unfixable = r.route === 'refurbish' && !r.configured && item.value_basis.refurbish === 'rates' && est.unfixable.length > 0
        const status = !r.eligible
          ? { text: r.ineligibleReason ?? 'Not allowed', tone: 'muted' as const }
          : unfixable
            ? { text: `Not repairable: ${est.unfixable.join(', ')}`, tone: 'muted' as const }
            : !r.configured
              ? { text: 'No value entered', tone: 'muted' as const }
              : { text: 'Allowed for this grade', tone: 'ok' as const }
        const best = calc.recommended === r.route
        return (
          <div key={r.route} className={clsx('rounded-2xl border bg-white', best ? 'border-brand-400 ring-1 ring-brand-400' : 'border-line')}>
            <button
              className="w-full px-4 pb-3 pt-3.5 text-left"
              onClick={() => setOpen(isOpen ? null : r.route)}
              aria-expanded={isOpen}
              disabled={!r.configured}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {r.label}
                    {best && <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-white">Best</span>}
                  </p>
                  <p className={clsx('mt-0.5 text-xs', status.tone === 'ok' ? 'text-brand-700' : 'text-muted')}>{status.text}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={clsx('whitespace-nowrap font-display text-2xl leading-none tabular', !r.eligible || !r.configured ? 'text-muted' : r.net < 0 && 'text-red-700')}>
                    {r.configured ? inr(r.net) : '—'}
                  </span>
                  {r.configured && <ChevronDown className={clsx('size-4 text-muted transition', isOpen && 'rotate-180')} />}
                </div>
              </div>
              {r.configured && (
                <>
                  <RecoveryBar r={r} maxGross={maxGross} dim={!r.eligible} />
                  <Summary r={r} />
                </>
              )}
            </button>
            {isOpen && r.configured && (
              <Details
                r={r}
                notesFor={(l) => {
                  if (!l.field) return { lines: undefined, basis: undefined }
                  const b = basisOf(l.field, r.route)
                  const fresh = b === 'rates' && matchesRates(item, est, [l.field])
                  return { lines: fresh ? est.notes[l.field] : undefined, basis: b, stale: b === 'rates' && !fresh }
                }}
              />
            )}
          </div>
        )
      })}

      {calc.warnings.filter((w) => !/No estimate entered/.test(w) || !est.unfixable.length).slice(0, 2).map((w) => (
        <p key={w} className="text-xs text-muted">{w}</p>
      ))}
      <p className="text-xs text-muted">
        To change a value: <Link to={`${base}/returns/${item.id}/edit`} className="font-medium text-brand-700 hover:underline">enter your own price or a quote</Link>, or{' '}
        <Link to={`${base}/rates`} className="font-medium text-brand-700 hover:underline">edit your rates</Link> (applies to returns without a decision).
      </p>
    </div>
  )
}




/** "₹2,449 sale − ₹667 fees & GST − ₹509 repair − ₹147 shipping" — wraps between items, never inside one. */

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1"><KindDot kind="business" /> Your value</span>
      <span className="inline-flex items-center gap-1"><KindDot kind="published" /> Published rate</span>
      <span className="inline-flex items-center gap-1"><KindDot kind="assumption" /> Assumption</span>
      <span>· Sources checked {RATES_CHECKED_ON} · <a href="/#trust" className="text-brand-700 hover:underline">Method</a></span>
    </div>
  )
}

function Summary({ r }: { r: RouteResult }) {
  return <SummaryLine r={r} className="mt-2 text-muted" />
}

function Details({ r, notesFor }: { r: RouteResult; notesFor: (l: BreakdownLine) => { lines?: EstimateLine[]; basis?: ValueBasis; stale?: boolean } }) {
  const g = groupRoute(r)
  return (
    <div className="space-y-3 border-t border-line px-4 py-3">
      {g.groups.map((grp) => (
        <div key={grp.key}>
          <div className="flex items-baseline justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className={clsx('size-2 rounded-full', GROUP_META[grp.key].dot)} />
              {groupLabel(r.route, grp.key)}
            </span>
            <Amount n={grp.total} className="text-ink" />
          </div>
          <ul className="mt-1.5 space-y-2">
            {grp.lines.map((l) => {
              const { lines, basis, stale } = notesFor(l)
              const isPct = l.field === 'selling_fee_pct'
              return (
                <li key={l.label}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0">{l.label}</span>
                    <Amount n={l.amount} />
                  </div>
                  {lines && lines.length > 0 ? (
                    <ul className="mt-1 space-y-1 border-l-2 border-line pl-2.5">
                      {lines.map((n, i) => (
                        <li key={i} className="flex justify-between gap-3 text-xs">
                          <span className="min-w-0 text-ink-2">
                            {n.text}
                            <KindBadge kind={n.kind} source={n.source} />
                          </span>
                          {(lines.length > 1 || isPct) && (
                            <span className="shrink-0 whitespace-nowrap tabular text-muted">
                              {isPct ? `${inr((r.gross * n.amount) / 100, true)} · ${n.amount}%` : inr(n.amount)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : basis && basis !== 'rates' ? (
                    <p className="mt-1 border-l-2 border-line pl-2.5 text-xs">
                      <KindBadge kind={basis === 'quote' ? 'quote' : basis === 'ai' ? 'ai' : 'business'} />
                    </p>
                  ) : stale ? (
                    <p className="mt-1 border-l-2 border-line pl-2.5 text-xs text-muted">From the rate card as it was when this was priced.</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
        <span className="text-sm font-semibold">Estimated net recovery</span>
        <span className={clsx('whitespace-nowrap font-display text-xl tabular', r.net < 0 && 'text-red-700')}>{inr(r.net, true)}</span>
      </div>
      {!r.eligible && <p className="text-xs text-muted">Shown for comparison only — {r.ineligibleReason?.toLowerCase()}</p>}
    </div>
  )
}
