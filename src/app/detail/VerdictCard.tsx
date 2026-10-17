import clsx from 'clsx'
import { Ban, Camera, Check, CheckCircle2, Loader2, ScanSearch, Sparkles, UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, GradeBadge, GradeGuide, LinkButton, MoneyInput, Textarea } from '../../components/ui'
import { LIMITS } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { inr, shortDate } from '../../lib/format'
import { useRates } from '../../data/rates'
import { estimateFromRates, estimateInputFor, ratesPatch } from '../../lib/rates'
import { calculateRecovery } from '../../lib/recovery'
import { GRADE_GUIDE, ROUTE_LABEL, type ReturnInput, type ReturnItem, type RouteKey } from '../../lib/types'
import { BASIS_SHORT } from '../../lib/basis'
import { supportHref } from '../../lib/support'
import GradeModal from './GradeModal'
import { useInspection } from './useInspection'

export default function VerdictCard({ item, autoRun }: { item: ReturnItem; autoRun: boolean }) {
  const { update, base, mode } = useWorkspace()
  const { hasAccess } = useAuth()
  const { rates } = useRates()
  const { run, running, error, canRun } = useInspection(item, autoRun)
  const ai = item.ai_inspection
  const grade = item.grade ?? ai?.proposed_grade ?? null
  const calc = useMemo(() => calculateRecovery({ ...item, grade }), [item, grade])
  const best = calc.routes.find((r) => r.route === calc.recommended) ?? null
  const [modal, setModal] = useState<null | 'correct' | 'manual'>(null)
  const [choosing, setChoosing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const gradePatch = (): Partial<ReturnInput> =>
    !item.grade && ai
      ? {
          grade: ai.proposed_grade,
          grade_source: 'ai_accepted',
          grade_note: '',
          defects: ai.defects.map((d) => ({ ...d, source: 'ai' as const })),
        }
      : {}

  const decide = async (route: RouteKey, reason: string) => {
    const r = calc.routes.find((x) => x.route === route)
    if (!r) return
    setSaving(true)
    setErr('')
    try {
      await update(item.id, {
        ...gradePatch(),
        decision_route: route,
        decision_net: r.net,
        recommended_route: calc.recommended,
        decision_reason: reason || 'Followed recommendation.',
        decided_at: new Date().toISOString(),
        status: 'decided',
      })
      setChoosing(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const gradeModal = modal && (
    <GradeModal
      open
      mode={modal}
      item={{ ...item, grade }}
      onClose={() => setModal(null)}
      onSave={async (g, note, defects) => {
        // A new grade or defect list changes the repair and liquidation estimates on the rate card.
        // Saving a new grade clears an open decision, so its values may be repriced too.
        const est = estimateFromRates(estimateInputFor(item, { grade: g, defects }), rates)
        await update(item.id, {
          ...ratesPatch(item, est, { allowDecided: item.status !== 'completed' }),
          grade: g,
          grade_source: modal === 'correct' ? 'ai_corrected' : 'manual',
          grade_note: note,
          defects,
          status: item.status === 'awaiting_inspection' ? 'inspected' : item.status,
          // a new grade can change the best option, so an earlier decision is cleared
          ...(item.decision_route && item.status !== 'completed'
            ? { decision_route: null, decision_net: null, decided_at: null, status: 'inspected' as const }
            : {}),
        })
        setModal(null)
      }}
    />
  )

  // ── Completed ──
  if (item.status === 'completed' && item.decision_route) {
    const diff = item.realized_amount != null && item.decision_net != null ? item.realized_amount - item.decision_net : null
    return (
      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-700"><CheckCircle2 className="size-4" /> Done</p>
        <p className="mt-2 text-lg font-semibold">{ROUTE_LABEL[item.decision_route]}</p>
        <p className="mt-1 text-sm text-muted">
          Received <span className="font-semibold text-ink tabular">{inr(item.realized_amount)}</span>
          {diff != null && <> · {diff >= 0 ? `${inr(diff)} above` : `${inr(-diff)} below`} the estimate</>}
        </p>
        <Outcome item={item} compact />
      </Card>
    )
  }

  // ── Decided ──
  if (item.decision_route && !choosing) {
    return (
      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-700"><Check className="size-4" /> Decision saved</p>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-lg font-semibold">{ROUTE_LABEL[item.decision_route]}</p>
          <p className="font-display text-3xl tabular">{inr(item.decision_net)}</p>
        </div>
        <p className="text-sm text-muted">Estimated net · {shortDate(item.decided_at)}</p>
        <Outcome item={item} />
        <button className="mt-3 text-sm font-medium text-brand-700 hover:underline" onClick={() => setChoosing(true)}>
          Change decision
        </button>
        {gradeModal}
      </Card>
    )
  }

  // ── Running ──
  if (running) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-brand-700" />
        <p className="mt-3 font-medium">Inspecting your photos…</p>
        <p className="mt-1 text-sm text-muted">Usually 10–30 seconds.</p>
      </Card>
    )
  }

  // ── Not graded yet ──
  if (!grade) {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ScanSearch className="size-5" />
        </div>
        {mode === 'demo' ? (
          <>
            <p className="mt-3 font-medium">Get an AI grade and value</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Start a free {LIMITS.trialDays}-day trial to inspect your own products. No card needed.</p>
            <LinkButton to="/signup" className="mt-4" icon={<Sparkles className="size-4" />}>Start free trial</LinkButton>
          </>
        ) : !hasAccess ? (
          <>
            <p className="mt-3 font-medium">Your free trial has ended</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Upgrade to keep using AI inspection.</p>
            <LinkButton to={`${base}/billing`} className="mt-4">Upgrade to Pro</LinkButton>
          </>
        ) : !item.photos.length ? (
          <>
            <p className="mt-3 font-medium">Add a photo to inspect</p>
            <LinkButton to={`${base}/returns/${item.id}/edit`} className="mt-4" icon={<Camera className="size-4" />}>Add photo</LinkButton>
          </>
        ) : (
          <>
            <p className="mt-3 font-medium">Ready to inspect</p>
            <Button className="mt-4" icon={<Sparkles className="size-4" />} onClick={run} disabled={!canRun}>Run AI inspection</Button>
          </>
        )}
        {error && (
          <Alert tone="error" className="mt-4 text-left">
            {error.text} {error.upgrade && <Link to={`${base}/billing`} className="font-semibold underline">Upgrade</Link>}
          </Alert>
        )}
        <button className="mt-4 block w-full text-sm text-muted hover:text-ink" onClick={() => setModal('manual')}>
          or grade it yourself
        </button>
        {gradeModal}
      </Card>
    )
  }

  // ── Picking a different option ──
  if (choosing) {
    return (
      <Card className="p-5">
        <OptionPicker
          item={item}
          calc={calc}
          saving={saving}
          onCancel={() => setChoosing(false)}
          onSave={decide}
        />
        {err && <Alert tone="error" className="mt-3">{err}</Alert>}
      </Card>
    )
  }

  // ── Verdict ──
  const suggestedByAI = !item.grade && !!ai
  const refused = suggestedByAI && !!ai?.out_of_scope
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <GradeBadge grade={grade} className="px-2.5 py-1 text-sm" />
        <span className="text-sm font-medium">{refused ? 'Not graded' : GRADE_GUIDE[grade].short}</span>
        {suggestedByAI && !refused && <span className="text-xs text-muted">· suggested by AI, {ai!.confidence} confidence</span>}
        {item.grade_source === 'manual' && <span className="text-xs text-muted">· {item.is_sample ? 'sample, graded by hand' : 'graded by you'}</span>}
      </div>
      {!refused && <p className="mt-1 text-xs text-muted">{GRADE_GUIDE[grade].allows}</p>}
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{ai?.summary && suggestedByAI ? ai.summary : GRADE_GUIDE[grade].meaning}</p>

      {refused ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-medium text-red-900"><Ban className="size-4" /> Not something ReturnRescue can inspect</p>
          <p className="mt-1 text-sm text-red-900/80">No grade or value was given. If these are the wrong photos, replace them and run the inspection again.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton to={`${base}/returns/${item.id}/edit`} size="sm" variant="dark">Replace photos</LinkButton>
            <Button size="sm" variant="secondary" onClick={() => setModal('correct')}>Grade it myself</Button>
          </div>
          <SupportNote id={item.id} />
        </div>
      ) : grade === 'MANUAL_REVIEW' ? (
        <div className="mt-5 rounded-xl bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-medium text-amber-900"><UserCheck className="size-4" /> A person needs to check this one</p>
          {ai?.grade_rationale && <p className="mt-1 text-sm text-amber-900/80">{ai.grade_rationale}</p>}
          {suggestedByAI && ai?.guardrail_notes?.[0] && <p className="mt-1 text-sm text-amber-900/80">{ai.guardrail_notes[0]}</p>}
          <Button className="mt-3" variant="dark" onClick={() => setModal(suggestedByAI ? 'correct' : 'manual')}>Set grade after checking</Button>
          {suggestedByAI && <SupportNote id={item.id} />}
        </div>
      ) : best ? (
        <>
          <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-800">Best option</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold">{best.label}</p>
              <p className={clsx('font-display text-3xl tabular', best.net < 0 && 'text-red-700')}>{inr(best.net)}</p>
            </div>
            <p className="text-xs text-muted">
              Estimated net per unit · {BASIS_SHORT[best.basis]}
            </p>
          </div>
          <Button size="lg" className="mt-4 w-full" loading={saving} onClick={() => decide(best.route, '')} icon={<Check className="size-4" />}>
            Confirm
          </Button>
          {err && <Alert tone="error" className="mt-3">{err}</Alert>}
          {ai?.recommended_physical_checks?.[0] && suggestedByAI && (
            <p className="mt-3 text-xs text-muted">Before you act: {ai.recommended_physical_checks[0]}</p>
          )}
        </>
      ) : (
        <div className="mt-5 rounded-xl bg-paper p-4 text-sm">
          <p className="font-medium">No values to compare yet</p>
          <p className="mt-1 text-muted">Add expected prices for at least one option.</p>
          <LinkButton to={`${base}/returns/${item.id}/edit`} size="sm" variant="secondary" className="mt-3">Add values</LinkButton>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <GradeGuide current={grade} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
        <button className="font-medium text-brand-700 hover:underline" onClick={() => setModal(suggestedByAI ? 'correct' : 'manual')}>Change grade</button>
        {grade !== 'MANUAL_REVIEW' && (
          <button className="font-medium text-brand-700 hover:underline" onClick={() => setChoosing(true)}>Choose another option</button>
        )}
        {suggestedByAI && canRun && (
          <button className="font-medium text-brand-700 hover:underline" onClick={run}>Run inspection again</button>
        )}
      </div>
      {suggestedByAI && canRun && <p className="mt-2 text-center text-xs text-muted">Added clearer photos? Re-running uses one AI inspection.</p>}
      {error && <Alert tone="error" className="mt-3">{error.text}</Alert>}
      {gradeModal}
    </Card>
  )
}

function OptionPicker({
  item,
  calc,
  saving,
  onCancel,
  onSave,
}: {
  item: ReturnItem
  calc: ReturnType<typeof calculateRecovery>
  saving: boolean
  onCancel: () => void
  onSave: (route: RouteKey, reason: string) => void
}) {
  const [choice, setChoice] = useState<RouteKey | null>(item.decision_route ?? calc.recommended)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const isOverride = !!choice && choice !== calc.recommended
  return (
    <>
      <p className="font-medium">Choose an option</p>
      <div className="mt-3 space-y-2" role="radiogroup" aria-label="Recovery option">
        {calc.routes.map((r) => (
          <button
            key={r.route}
            type="button"
            role="radio"
            aria-checked={choice === r.route}
            disabled={!r.configured}
            onClick={() => setChoice(r.route)}
            className={clsx(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition disabled:opacity-40',
              choice === r.route ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{r.label}{calc.recommended === r.route && <span className="ml-1.5 text-xs font-normal text-brand-700">best</span>}</span>
              {!r.eligible && r.configured && <span className="block text-xs text-amber-800">{r.ineligibleReason}</span>}
            </span>
            <span className="font-semibold tabular">{r.configured ? inr(r.net) : '—'}</span>
          </button>
        ))}
      </div>
      {isOverride && (
        <div className="mt-3">
          <label className="text-sm font-medium" htmlFor="reason">Why this option?</label>
          <Textarea id="reason" className="mt-1 min-h-16" value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} placeholder="e.g. A liquidator offered a better bulk price." />
          {err && <p className="mt-1 text-xs font-medium text-red-700">{err}</p>}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button
          loading={saving}
          onClick={() => {
            if (!choice) return
            if (isOverride && !reason.trim()) return setErr('Add a short reason — it’s kept on the record.')
            onSave(choice, reason.trim())
          }}
        >
          Save decision
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </>
  )
}

function Outcome({ item, compact }: { item: ReturnItem; compact?: boolean }) {
  const { update } = useWorkspace()
  const [open, setOpen] = useState(!compact && item.realized_amount == null)
  const [amount, setAmount] = useState(item.realized_amount != null ? String(item.realized_amount) : '')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  if (!open)
    return (
      <button className="mt-3 text-sm font-medium text-brand-700 hover:underline" onClick={() => setOpen(true)}>
        Edit amount received
      </button>
    )
  return (
    <div className="mt-4 border-t border-line pt-4">
      <label htmlFor="realized" className="text-sm font-medium">Sold or disposed? Amount received</label>
      <p className="text-xs text-muted">What actually reached you, after fees and excluding GST. It’s kept separate from the estimate.</p>
      <div className="mt-1.5 flex gap-2">
        <div className="flex-1">
          <MoneyInput id="realized" value={amount} min={undefined} onChange={(e) => { setAmount(e.target.value); setErr('') }} placeholder="0" />
        </div>
        <Button
          variant="dark"
          loading={saving}
          onClick={async () => {
            const n = Number(amount)
            if (amount === '' || !Number.isFinite(n)) return setErr('Enter the amount (negative if it cost you money).')
            setSaving(true)
            try {
              await update(item.id, { realized_amount: Math.round(n * 100) / 100, completed_at: new Date().toISOString(), status: 'completed' })
              setOpen(false)
            } catch (e) {
              setErr((e as Error).message)
            } finally {
              setSaving(false)
            }
          }}
        >
          Mark done
        </Button>
      </div>
      {err && <p className="mt-1 text-xs font-medium text-red-700">{err}</p>}
    </div>
  )
}

/** Shown with AI results a seller might disagree with. */
export function SupportNote({ id }: { id: string }) {
  return (
    <p className="mt-3 text-xs text-ink-2">
      Think the AI got this wrong?{' '}
      <a href={supportHref('ai_result', id)} className="font-medium text-brand-700 underline">Contact support</a> and tell us what the item is.
    </p>
  )
}
