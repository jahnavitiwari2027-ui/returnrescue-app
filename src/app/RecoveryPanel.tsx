import clsx from 'clsx'
import { AlertTriangle, Calculator, Check, ChevronDown, CircleSlash, Flag, Info, Pencil, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardHeader, Field, MoneyInput, Textarea } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { inr, pct, shortDate } from '../lib/format'
import { calculateRecovery } from '../lib/recovery'
import { ROUTE_LABEL, type ReturnItem, type RouteKey } from '../lib/types'

export default function RecoveryPanel({ item }: { item: ReturnItem }) {
  const { update, base } = useWorkspace()
  const calc = useMemo(() => calculateRecovery(item), [item])
  const [open, setOpen] = useState<RouteKey | null>(null)
  const [editingDecision, setEditingDecision] = useState(!item.decision_route)
  const [choice, setChoice] = useState<RouteKey | null>(item.decision_route ?? calc.recommended)
  const [reason, setReason] = useState(item.decision_reason)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const canDecide = !!item.grade && item.grade !== 'MANUAL_REVIEW'
  const chosen = calc.routes.find((r) => r.route === choice)
  const isOverride = !!choice && choice !== calc.recommended

  const saveDecision = async () => {
    setErr('')
    if (!choice || !chosen) return setErr('Choose a recovery route.')
    if (!chosen.configured) return setErr('This route has no estimate. Add one by editing the return.')
    if (isOverride && !reason.trim()) return setErr('You chose a different route from the recommendation — add a short reason for the record.')
    setSaving(true)
    try {
      await update(item.id, {
        decision_route: choice,
        decision_net: chosen.net,
        recommended_route: calc.recommended,
        decision_reason: reason.trim() || 'Followed recommendation.',
        decided_at: new Date().toISOString(),
        status: item.status === 'completed' ? 'completed' : 'decided',
      })
      setEditingDecision(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const recordedNetDiffers =
    item.decision_route && item.decision_net != null && calc.routes.find((r) => r.route === item.decision_route)?.net !== item.decision_net

  return (
    <Card as="section">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-xs text-white">2</span>
            Recovery value comparison
          </span>
        }
        subtitle="Deterministic maths on your estimates — no AI. Click a route to see its breakdown."
        action={
          <Link to={`${base}/returns/${item.id}/edit`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            <Pencil className="size-3.5" /> Edit estimates
          </Link>
        }
      />
      <div className="space-y-4 p-5">
        {calc.provisional && (
          <Alert tone="warning" icon={<Info className="size-4" />}>
            Provisional: no condition grade yet, so every route is treated as eligible. Grade the item to apply eligibility rules.
          </Alert>
        )}

        <div className="space-y-2">
          {calc.routes.map((r) => {
            const recommended = calc.recommended === r.route
            const expanded = open === r.route
            return (
              <div
                key={r.route}
                className={clsx(
                  'overflow-hidden rounded-xl border transition',
                  recommended ? 'border-brand-600 ring-1 ring-brand-600' : 'border-line',
                  !r.eligible && 'bg-paper/60',
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setOpen(expanded ? null : r.route)}
                  aria-expanded={expanded}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {r.label}
                      {recommended && (
                        <Badge tone="brand">
                          <Trophy className="size-3" /> Highest eligible net
                        </Badge>
                      )}
                      {item.decision_route === r.route && <Badge tone="dark"><Flag className="size-3" /> Chosen</Badge>}
                      {r.configured && <Badge tone={r.basis === 'quote' ? 'blue' : r.basis === 'ai' ? 'brand' : 'neutral'}>{r.basis === 'quote' ? 'Third-party quote' : r.basis === 'ai' ? 'AI estimate' : 'Your estimate'}</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {!r.eligible ? (
                        <span className="inline-flex items-center gap-1"><CircleSlash className="size-3" /> {r.ineligibleReason}</span>
                      ) : !r.configured ? (
                        'No estimate entered'
                      ) : (
                        <>Recovers {pct(r.recoveryRate)} of original price</>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={clsx('font-display text-2xl leading-none tabular', !r.configured && 'text-muted', r.net < 0 && r.configured && 'text-red-700')}>
                      {r.configured ? inr(r.net) : '—'}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">est. net</p>
                  </div>
                  <ChevronDown className={clsx('size-4 text-muted transition', expanded && 'rotate-180')} aria-hidden />
                </button>
                {expanded && (
                  <div className="border-t border-line bg-paper/60 px-4 py-3 animate-fade">
                    <table className="w-full text-sm">
                      <tbody>
                        {r.lines.map((l) => (
                          <tr key={l.label}>
                            <td className="py-1 text-ink-2">{l.label}</td>
                            <td className={clsx('py-1 text-right tabular', l.amount < 0 && 'text-red-700')}>
                              {l.amount < 0 ? '− ' : '+ '}
                              {inr(Math.abs(l.amount), true)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-line font-semibold">
                          <td className="pt-2">Estimated net recovery</td>
                          <td className="pt-2 text-right tabular">{inr(r.net, true)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="rounded-xl bg-paper px-4 py-3 text-sm">
          <p className="flex items-start gap-2 font-medium">
            <Calculator className="mt-0.5 size-4 shrink-0 text-brand-700" /> {calc.explanation}
          </p>
          {calc.warnings.map((w) => (
            <p key={w} className="mt-1.5 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {w}
            </p>
          ))}
          <p className="mt-1.5 text-xs text-muted">
            Return shipping already paid ({inr(calc.sunkCost)}) is a sunk cost and is excluded so it isn’t counted against any route.
          </p>
        </div>

        {/* Decision */}
        <div className="border-t border-line pt-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-xs text-white">3</span>
            Final decision
          </h3>
          {!canDecide ? (
            <Alert tone="neutral" icon={<Info className="size-4" />}>
              {item.grade === 'MANUAL_REVIEW'
                ? 'This item is flagged for manual review. Set a grade A, B or C after a physical check to record a decision.'
                : 'Set a condition grade above before recording a decision.'}
            </Alert>
          ) : item.decision_route && !editingDecision ? (
            <div className="rounded-xl border border-line px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{ROUTE_LABEL[item.decision_route]}</span> at an estimated net of{' '}
                    <span className="font-semibold tabular">{inr(item.decision_net)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Decided {shortDate(item.decided_at)} ·{' '}
                    {item.recommended_route && item.recommended_route !== item.decision_route
                      ? `Override of recommended ${ROUTE_LABEL[item.recommended_route].toLowerCase()}`
                      : 'Followed recommendation'}
                  </p>
                  {item.decision_reason && <p className="mt-1 text-sm text-ink-2">“{item.decision_reason}”</p>}
                  {recordedNetDiffers && (
                    <p className="mt-1 text-xs text-amber-800">Estimates have changed since this decision; the recorded value is kept as it was.</p>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditingDecision(true)}>Change decision</Button>
              </div>
              <Outcome item={item} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Recovery route">
                {calc.routes.map((r) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={choice === r.route}
                    key={r.route}
                    disabled={!r.configured}
                    onClick={() => setChoice(r.route)}
                    className={clsx(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                      choice === r.route ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line hover:border-ink/25',
                    )}
                  >
                    <span className={clsx('grid size-5 place-items-center rounded-full border', choice === r.route ? 'border-brand-700 bg-brand-700 text-white' : 'border-line')}>
                      {choice === r.route && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{r.label}</span>
                      <span className="block text-xs text-muted">
                        {r.configured ? inr(r.net) : 'No estimate'}
                        {calc.recommended === r.route && ' · recommended'}
                        {r.configured && !r.eligible && ' · not normally eligible'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {chosen && !chosen.eligible && chosen.configured && (
                <Alert tone="warning" icon={<AlertTriangle className="size-4" />}>
                  Manual override: {chosen.ineligibleReason} Make sure a person has checked the item before choosing this route.
                </Alert>
              )}
              <Field label={isOverride ? 'Reason for overriding the recommendation' : 'Decision note (optional)'} error={err} required={isOverride}>
                {(id) => <Textarea id={id} value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} className="min-h-16" placeholder={isOverride ? 'e.g. Liquidator offered a bulk lot price this week.' : 'Anything the warehouse team should know.'} />}
              </Field>
              <div className="flex gap-2">
                <Button onClick={saveDecision} loading={saving} icon={<Flag className="size-4" />}>Save decision</Button>
                {item.decision_route && <Button variant="ghost" onClick={() => setEditingDecision(false)}>Cancel</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function Outcome({ item }: { item: ReturnItem }) {
  const { update } = useWorkspace()
  const [amount, setAmount] = useState(item.realized_amount != null ? String(item.realized_amount) : '')
  const [editing, setEditing] = useState(item.realized_amount == null)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const n = Number(amount)
    if (amount === '' || !Number.isFinite(n)) return setErr('Enter the amount actually received (use a negative number for a net cost).')
    setSaving(true)
    try {
      await update(item.id, { realized_amount: Math.round(n * 100) / 100, completed_at: new Date().toISOString(), status: 'completed' })
      setEditing(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      {editing ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Realized net proceeds" hint="Record once the sale, liquidation or disposal has actually happened." error={err} className="flex-1">
            {(id, d) => <MoneyInput id={id} aria-describedby={d} value={amount} min={undefined} onChange={(e) => { setAmount(e.target.value); setErr('') }} placeholder="0" />}
          </Field>
          <Button variant="dark" onClick={save} loading={saving} className="sm:mb-[22px]">Mark completed</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <Badge tone="dark">Completed</Badge>{' '}
            Realized <span className="font-semibold tabular">{inr(item.realized_amount)}</span>
            {item.decision_net != null && item.realized_amount != null && (
              <span className={clsx('ml-1 text-xs', item.realized_amount >= item.decision_net ? 'text-brand-700' : 'text-red-700')}>
                ({item.realized_amount >= item.decision_net ? '+' : '−'}
                {inr(Math.abs(item.realized_amount - item.decision_net))} vs estimate)
              </span>
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        </div>
      )}
    </div>
  )
}
