import clsx from 'clsx'
import { ChevronDown, ExternalLink, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useRates } from '../../data/rates'
import { BASIS_LABEL } from '../../lib/basis'
import { inr } from '../../lib/format'
import {
  estimateFromRates,
  estimateInputFor,
  isLocked,
  matchesRates,
  PLATFORM_LABEL,
  ratesPatch,
  RATE_SOURCES,
  saleOf,
  type EstimateField,
  type EstimateLine,
} from '../../lib/rates'
import { calculateRecovery, type BreakdownLine } from '../../lib/recovery'
import type { ReturnItem, RouteKey, ValueBasis } from '../../lib/types'

const COST_FIELDS = new Set<EstimateField>(['selling_fee_pct', 'handling_cost'])

export default function OptionsMaths({ item }: { item: ReturnItem }) {
  const { update, base } = useWorkspace()
  const { rates } = useRates()
  const grade = item.grade ?? item.ai_inspection?.proposed_grade ?? null
  const calc = useMemo(() => calculateRecovery({ ...item, grade }), [item, grade])
  const est = useMemo(() => estimateFromRates(estimateInputFor(item), rates), [item, rates])
  const [open, setOpen] = useState<string | null>(calc.recommended)
  const [busy, setBusy] = useState(false)

  const basisOf = (field: EstimateField, route: RouteKey): ValueBasis =>
    (COST_FIELDS.has(field) ? item.value_basis.costs : item.value_basis[route]) ?? 'estimate'

  const hasAi = Object.values(item.value_basis).includes('ai')
  // A saved decision is a record: its values are never repriced.
  const locked = isLocked(item)
  const onRates = Object.values(item.value_basis).includes('rates')
  const ratesFields = (Object.keys(est.values) as EstimateField[]).filter((f) => {
    const route = f === 'selling_fee_pct' || f === 'handling_cost' ? 'restock' : (fieldRoute[f] as RouteKey)
    return basisOf(f, route) === 'rates'
  })
  const stale = onRates && !matchesRates(item, est, ratesFields)

  const recalc = async () => {
    setBusy(true)
    try {
      await update(item.id, ratesPatch(item, est, { replaceAi: true }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {locked && (hasAi || stale) && (
        <p className="rounded-xl bg-paper p-3 text-xs text-ink-2">These are the values your decision was saved with. Changing your rates won’t alter them.</p>
      )}
      {!locked && (hasAi || stale) && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            {hasAi
              ? 'Some values here were suggested by the AI under our older method, so they can’t be traced to a source.'
              : 'These values were worked out with an earlier rate card, grade or defect list.'}
          </p>
          <Button size="sm" variant="secondary" className="mt-2" loading={busy} onClick={recalc} icon={<RefreshCw className="size-3.5" />}>
            Recalculate with your rate card
          </Button>
        </div>
      )}

      {calc.routes.map((r) => {
        const isOpen = open === r.route
        const unfixable = r.route === 'refurbish' && !r.configured && item.value_basis.refurbish === 'rates' && est.unfixable.length > 0
        const hint = !r.eligible
          ? r.ineligibleReason
          : unfixable
            ? `Not repairable: ${est.unfixable.join(', ')}`
            : !r.configured
              ? 'No value entered'
              : BASIS_LABEL[r.basis]
        return (
          <div key={r.route} className={clsx('rounded-xl border', calc.recommended === r.route ? 'border-brand-300' : 'border-line')}>
            <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left" onClick={() => setOpen(isOpen ? null : r.route)} aria-expanded={isOpen}>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {r.label}
                  {calc.recommended === r.route && <span className="ml-1.5 text-xs font-normal text-brand-700">best</span>}
                </span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
              <span className={clsx('whitespace-nowrap font-semibold tabular', (!r.eligible || !r.configured) && 'text-muted')}>{r.configured ? inr(r.net) : '—'}</span>
              <ChevronDown className={clsx('size-4 shrink-0 text-muted transition', isOpen && 'rotate-180')} />
            </button>
            {isOpen && r.configured && (
              <div className="mx-3 mb-3 space-y-2 text-xs">
                {r.lines.map((l) => (
                  <Line key={l.label} line={l} notes={l.field && basisOf(l.field, r.route) === 'rates' && matchesRates(item, est, [l.field]) ? est.notes[l.field] : undefined} basis={l.field ? basisOf(l.field, r.route) : undefined} />
                ))}
                <div className="flex justify-between border-t border-line pt-1.5 text-sm font-semibold">
                  <span>Net</span>
                  <span className="whitespace-nowrap tabular">{inr(r.net, true)}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {calc.warnings.length > 0 && <p className="text-xs text-muted">{calc.warnings[0]}</p>}
      <p className="pt-1 text-xs text-muted">
        Priced for selling on {PLATFORM_LABEL[saleOf(item.sale_setup, rates).platform]}
        {!locked && <> (<Link to={`${base}/returns/${item.id}/edit`} className="font-medium text-brand-700 hover:underline">change</Link>)</>}. Rate-card values use published prices and stated assumptions.{' '}
        <Link to={`${base}/rates`} className="font-medium text-brand-700 hover:underline">See or edit your rates</Link>
      </p>
    </div>
  )
}

const fieldRoute: Partial<Record<EstimateField, RouteKey>> = {
  resale_price: 'restock',
  refurb_resale_price: 'refurbish',
  refurb_cost: 'refurbish',
  liquidation_price: 'liquidate',
  liquidation_fee: 'liquidate',
  recycling_value: 'recycle',
  recycling_cost: 'recycle',
}

function Line({ line, notes, basis }: { line: BreakdownLine; notes?: EstimateLine[]; basis?: ValueBasis }) {
  const pct = line.field === 'selling_fee_pct'
  const parts = notes?.filter((n) => !n.info).length ?? 0
  return (
    <div>
      <div className="flex justify-between gap-3">
        <span className="text-ink-2">{line.label}</span>
        <span className={clsx('whitespace-nowrap tabular', line.amount < 0 && 'text-red-700')}>
          {line.amount < 0 ? '−' : '+'}&#8239;{inr(Math.abs(line.amount), true)}
        </span>
      </div>
      {notes && notes.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5 border-l-2 border-line pl-2 text-muted">
          {notes.map((n, i) => (
            <li key={i} className={clsx('flex justify-between gap-3', n.info && 'italic')}>
              <span>
                {n.text}
                {n.source && (
                  <a href={RATE_SOURCES[n.source].url} target="_blank" rel="noreferrer" title={RATE_SOURCES[n.source].title} className="ml-1 inline-flex items-center gap-0.5 text-brand-700 hover:underline">
                    source <ExternalLink className="size-2.5" />
                  </a>
                )}
                {n.kind === 'assumption' && <span className="ml-1 rounded bg-paper-2 px-1 text-[10px]">assumption</span>}
                {n.kind === 'business' && <span className="ml-1 rounded bg-brand-50 px-1 text-[10px] text-brand-800">your value</span>}
              </span>
              {parts > 1 && !n.info && <span className="whitespace-nowrap tabular">{pct ? `${n.amount}%` : inr(n.amount)}</span>}
            </li>
          ))}
        </ul>
      ) : basis && basis !== 'rates' ? (
        <p className="mt-0.5 border-l-2 border-line pl-2 text-muted">{BASIS_LABEL[basis]}</p>
      ) : null}
    </div>
  )
}
