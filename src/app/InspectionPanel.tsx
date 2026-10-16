import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, Cpu, Eye, Pencil, RefreshCw, ScanSearch, ShieldAlert, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardHeader, Field, GradeBadge, Modal, Select, Textarea } from '../components/ui'
import { LIMITS } from '../config'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { api, ApiError } from '../lib/api'
import { shortDate } from '../lib/format'
import { imageForInspection } from '../lib/image'
import {
  DEFECT_LABEL,
  DEFECT_TYPES,
  GRADE_DESCRIPTION,
  GRADE_LABEL,
  GRADES,
  ROUTE_LABEL,
  type Defect,
  type DefectType,
  type Grade,
  type ReturnItem,
} from '../lib/types'

export default function InspectionPanel({ item }: { item: ReturnItem }) {
  const { repo, update, base, mode } = useWorkspace()
  const { isPro, aiInspectionsUsed, refresh } = useAuth()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<{ text: string; upgrade?: boolean } | null>(null)
  const [gradeModal, setGradeModal] = useState<null | 'correct' | 'manual'>(null)
  const [confirmRerun, setConfirmRerun] = useState(false)
  const [saving, setSaving] = useState(false)
  const ai = item.ai_inspection

  const run = async () => {
    setConfirmRerun(false)
    setError(null)
    if (!item.photos.length) {
      setError({ text: 'Add at least one photo before running AI inspection.' })
      return
    }
    setRunning(true)
    try {
      const images = []
      for (const ref of item.photos.slice(0, LIMITS.maxPhotos)) images.push(await imageForInspection(await repo.photoBlob(ref)))
      const { inspection } = await api.inspect({
        mode,
        images,
        context: {
          name: item.name,
          category: item.category,
          return_reason: item.return_reason,
          condition_notes: item.condition_notes,
          original_price: item.original_price,
        },
      })
      await update(item.id, { ai_inspection: inspection })
      if (mode === 'account') refresh()
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ text: e.message, upgrade: e.code === 'TRIAL_EXHAUSTED' || e.code === 'PRO_REQUIRED' })
      } else setError({ text: (e as Error).message })
    } finally {
      setRunning(false)
    }
  }

  const accept = async () => {
    if (!ai) return
    setSaving(true)
    try {
      await update(item.id, {
        grade: ai.proposed_grade,
        grade_source: 'ai_accepted',
        grade_note: '',
        defects: ai.defects.map((d) => ({ ...d, source: 'ai' as const })),
        status: item.status === 'awaiting_inspection' ? 'inspected' : item.status,
      })
    } finally {
      setSaving(false)
    }
  }

  const trialLeft = Math.max(0, LIMITS.freeAiInspections - aiInspectionsUsed)

  return (
    <Card as="section">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-xs text-white">1</span>
            Condition & inspection
          </span>
        }
        subtitle="AI reviews the photos and your notes and proposes a grade. You confirm or correct it."
        action={item.grade ? <GradeBadge grade={item.grade} /> : undefined}
      />
      <div className="space-y-4 p-5">
        {/* Current grade */}
        {item.grade && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                Recorded grade: {GRADE_LABEL[item.grade]}{' '}
                <span className="font-normal text-muted">
                  ·{' '}
                  {item.grade_source === 'ai_accepted'
                    ? 'AI proposal accepted'
                    : item.grade_source === 'ai_corrected'
                      ? `Corrected from AI proposal (${ai ? GRADE_LABEL[ai.proposed_grade] : '—'})`
                      : 'Graded manually'}
                </span>
              </p>
              <p className="text-xs text-muted">{GRADE_DESCRIPTION[item.grade]}</p>
              {item.grade_note && <p className="mt-1 text-xs text-ink-2">Note: {item.grade_note}</p>}
            </div>
            <Button variant="secondary" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setGradeModal(ai ? 'correct' : 'manual')}>
              Change grade
            </Button>
          </div>
        )}

        {/* Recorded defects */}
        {item.defects.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Recorded issues</p>
            <ul className="flex flex-wrap gap-1.5">
              {item.defects.map((d, i) => (
                <li key={i}>
                  <Badge tone={d.severity === 'major' ? 'red' : d.severity === 'moderate' ? 'amber' : 'neutral'}>
                    {DEFECT_LABEL[d.type] ?? d.type} · {d.severity}
                    {d.source === 'ai' && <Sparkles className="size-3" aria-label="from AI" />}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI result */}
        {ai ? (
          <div className="overflow-hidden rounded-xl border border-brand-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-50 px-4 py-2.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                <ScanSearch className="size-4" /> AI inspection result
              </p>
              <p className="flex items-center gap-1.5 text-xs text-brand-900/70">
                <Cpu className="size-3.5" /> {ai.model} · {shortDate(ai.created_at)} · {ai.image_count} photo{ai.image_count > 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Proposed:</span>
                <GradeBadge grade={ai.proposed_grade} className="text-sm" />
                <Badge tone={ai.confidence === 'high' ? 'brand' : ai.confidence === 'medium' ? 'blue' : 'amber'}>{ai.confidence} confidence</Badge>
                <Badge tone={ai.image_quality === 'good' ? 'neutral' : 'amber'}>Image quality: {ai.image_quality}</Badge>
                {ai.product_match !== 'matches' && (
                  <Badge tone="red">{ai.product_match === 'mismatch' ? 'Photo may not match product' : 'Product match unclear'}</Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed text-ink-2">{ai.summary}</p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    <Eye className="size-3.5" /> Observable damage / defects
                  </h4>
                  {ai.defects.length ? (
                    <ul className="space-y-2">
                      {ai.defects.map((d, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium">{DEFECT_LABEL[d.type] ?? d.type}</span>{' '}
                          <Badge tone={d.severity === 'major' ? 'red' : d.severity === 'moderate' ? 'amber' : 'neutral'}>{d.severity}</Badge>
                          <p className="text-ink-2">
                            {d.description}
                            {d.location ? <span className="text-muted"> — {d.location}</span> : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-2">No visible defects identified in the photos.</p>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Why this grade</h4>
                  <p className="text-sm text-ink-2">{ai.grade_rationale}</p>
                  <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Potentially eligible routes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {ai.eligible_routes.length ? ai.eligible_routes.map((r) => <Badge key={r} tone="brand">{ROUTE_LABEL[r]}</Badge>) : <span className="text-sm text-muted">None until manually reviewed</span>}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-amber-50/70 p-3">
                  <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-900">
                    <AlertTriangle className="size-3.5" /> Uncertainty & limitations
                  </h4>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-amber-950/90">
                    {ai.limitations.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg bg-sky-50/70 p-3">
                  <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-900">
                    <ClipboardCheck className="size-3.5" /> Physical checks before acting
                  </h4>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-sky-950/90">
                    {ai.recommended_physical_checks.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              </div>

              <p className="flex gap-2 text-xs text-muted">
                <ShieldAlert className="size-4 shrink-0" />
                Photos cannot confirm hidden defects, hygiene, odour, authenticity or safety. Treat this as a provisional grade for a person to confirm.
              </p>

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {item.grade_source === 'ai_accepted' && item.grade === ai.proposed_grade ? (
                  <Badge tone="brand"><CheckCircle2 className="size-3.5" /> Accepted</Badge>
                ) : (
                  <Button icon={<CheckCircle2 className="size-4" />} onClick={accept} loading={saving}>
                    Accept {GRADE_LABEL[ai.proposed_grade]}
                  </Button>
                )}
                <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setGradeModal('correct')}>
                  Correct grade
                </Button>
                <Button variant="ghost" icon={<RefreshCw className="size-4" />} onClick={() => setConfirmRerun(true)} loading={running}>
                  Re-run
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
            <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <ScanSearch className="size-5" />
            </div>
            <p className="text-sm font-medium">{item.photos.length ? 'Ready for AI inspection' : 'No photos yet'}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              {item.photos.length
                ? `The AI will look at ${Math.min(item.photos.length, LIMITS.maxPhotos)} photo${item.photos.length > 1 ? 's' : ''} and your notes, list visible defects and propose a grade with its reasoning.`
                : 'Add clear photos of the product to run AI inspection, or grade it manually.'}
            </p>
            {item.is_sample && item.photos[0]?.startsWith('/demo/') && (
              <p className="mx-auto mt-2 max-w-md text-xs text-amber-800">
                This sample uses an illustration, not a real photo — the AI will likely ask for manual review. For a real test, edit the item and upload a product photo.
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {item.photos.length ? (
                <Button icon={<Sparkles className="size-4" />} onClick={run} loading={running}>
                  {running ? 'Inspecting photos…' : 'Run AI inspection'}
                </Button>
              ) : (
                <Link to={`${base}/returns/${item.id}/edit`}>
                  <Button icon={<Camera className="size-4" />}>Add photos</Button>
                </Link>
              )}
              {!item.grade && (
                <Button variant="secondary" onClick={() => setGradeModal('manual')}>
                  Grade manually
                </Button>
              )}
            </div>
            {mode === 'account' && !isPro && (
              <p className="mt-3 text-xs text-muted">
                Free plan: {trialLeft} of {LIMITS.freeAiInspections} trial inspections left.
              </p>
            )}
            {mode === 'demo' && <p className="mt-3 text-xs text-muted">Demo: up to {LIMITS.demoAiPerDay} genuine AI inspections per day.</p>}
          </div>
        )}

        {running && (
          <Alert tone="info" icon={<Sparkles className="size-4 animate-pulse" />}>
            Sending photos to the AI model and waiting for its assessment. This usually takes 10–30 seconds.
          </Alert>
        )}
        {error && (
          <Alert tone="error" title="AI inspection didn’t run">
            {error.text}{' '}
            {error.upgrade && <Link to={`${base}/billing`} className="font-semibold underline">Upgrade to Pro</Link>}
            <span className="mt-1 block text-xs opacity-80">{/no result/i.test(error.text) ? '' : 'No result was generated. '}You can still grade the item manually.</span>
          </Alert>
        )}
      </div>

      {gradeModal && <GradeModal
        open
        mode={gradeModal}
        item={item}
        onClose={() => setGradeModal(null)}
        onSave={async (grade, note, defects) => {
          await update(item.id, {
            grade,
            grade_source: gradeModal === 'correct' ? 'ai_corrected' : 'manual',
            grade_note: note,
            defects,
            status: item.status === 'awaiting_inspection' ? 'inspected' : item.status,
          })
          setError(null)
          setGradeModal(null)
        }}
      />}

      <Modal
        open={confirmRerun}
        onClose={() => setConfirmRerun(false)}
        title="Run AI inspection again?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRerun(false)}>Cancel</Button>
            <Button onClick={run}>Re-run inspection</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">The new result replaces the current AI result. Your recorded grade stays until you accept or correct again.{mode === 'account' && !isPro ? ' This uses one trial inspection.' : ''}</p>
      </Modal>
    </Card>
  )
}

function GradeModal({
  open,
  mode,
  item,
  onClose,
  onSave,
}: {
  open: boolean
  mode: 'correct' | 'manual' | null
  item: ReturnItem
  onClose: () => void
  onSave: (grade: Grade, note: string, defects: Defect[]) => Promise<void>
}) {
  const [grade, setGrade] = useState<Grade>(item.grade ?? item.ai_inspection?.proposed_grade ?? 'A')
  const [note, setNote] = useState(item.grade_note)
  const [defectTypes, setDefectTypes] = useState<DefectType[]>(() => [...new Set(item.defects.map((d) => d.type))])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (mode === 'correct' && !note.trim()) {
      setErr('Add a short reason for the correction — it is kept in the audit trail.')
      return
    }
    setSaving(true)
    const existing = new Map(item.defects.map((d) => [d.type, d]))
    const defects: Defect[] = defectTypes.map(
      (t) => existing.get(t) ?? { type: t, description: '', severity: 'moderate', source: 'manual' },
    )
    try {
      await onSave(grade, note.trim(), defects)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'correct' ? 'Correct the grade' : 'Grade manually'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save grade</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Condition grade">
          {GRADES.map((g) => (
            <button
              type="button"
              role="radio"
              aria-checked={grade === g}
              key={g}
              onClick={() => setGrade(g)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${grade === g ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line hover:border-ink/25'}`}
            >
              <p className="text-sm font-semibold">{GRADE_LABEL[g]}</p>
              <p className="mt-0.5 text-xs text-muted">{GRADE_DESCRIPTION[g]}</p>
            </button>
          ))}
        </div>
        <Field label="Issues found" hint="Tick what a person confirmed on the item.">
          {() => (
            <div className="grid max-h-40 grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto rounded-xl border border-line p-3">
              {DEFECT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand-700"
                    checked={defectTypes.includes(t)}
                    onChange={(e) => setDefectTypes((xs) => (e.target.checked ? [...xs, t] : xs.filter((x) => x !== t)))}
                  />
                  {DEFECT_LABEL[t]}
                </label>
              ))}
            </div>
          )}
        </Field>
        <Field label={mode === 'correct' ? 'Reason for correction' : 'Note (optional)'} error={err} required={mode === 'correct'}>
          {(id) => <Textarea id={id} value={note} onChange={(e) => { setNote(e.target.value); setErr('') }} placeholder="e.g. Stain lifted after spot cleaning test." className="min-h-20" />}
        </Field>
        {mode === 'correct' && item.ai_inspection && (
          <Select disabled value={item.ai_inspection.proposed_grade} aria-label="AI proposed grade">
            <option value={item.ai_inspection.proposed_grade}>AI proposed: {GRADE_LABEL[item.ai_inspection.proposed_grade]}</option>
          </Select>
        )}
      </div>
    </Modal>
  )
}
