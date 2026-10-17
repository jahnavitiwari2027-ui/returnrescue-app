import { useState } from 'react'
import { Button, Field, Modal, Textarea } from '../../components/ui'
import {
  DEFECT_LABEL,
  DEFECT_TYPES,
  GRADE_GUIDE,
  GRADE_LABEL,
  GRADES,
  type Defect,
  type DefectType,
  type Grade,
  type ReturnItem,
  type Severity,
} from '../../lib/types'
import { minimumGrade } from '../../lib/grading'

const SEVERITIES: Severity[] = ['minor', 'moderate', 'major']

export default function GradeModal({
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
  // Start from the confirmed defects, or what the AI saw.
  const startDefects = item.defects.length ? item.defects : item.ai_inspection?.defects ?? []
  const [sev, setSev] = useState<Partial<Record<DefectType, Severity>>>(() => Object.fromEntries(startDefects.map((d) => [d.type, d.severity])))
  const floor = minimumGrade(item.category, (Object.entries(sev) as [DefectType, Severity][]).map(([type, severity]) => ({ type, severity })))
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (mode === 'correct' && !note.trim()) {
      setErr('Add a short reason for the correction — it is kept in the audit trail.')
      return
    }
    setSaving(true)
    const existing = new Map(startDefects.map((d) => [d.type, d]))
    const defects: Defect[] = (Object.entries(sev) as [DefectType, Severity][]).map(([t, severity]) => {
      const e = existing.get(t)
      // Keep 'ai' only when the person left the AI's finding unchanged.
      const unchanged = !!e && e.severity === severity
      const source: Defect['source'] = unchanged ? ((e as Partial<Defect>).source ?? 'ai') : 'manual'
      return { type: t, description: e?.description ?? '', location: e?.location, severity, source }
    })
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
              <p className="mt-0.5 text-xs font-medium text-ink-2">{GRADE_GUIDE[g].short}</p>
              <p className="mt-0.5 text-xs text-muted">{GRADE_GUIDE[g].allows}</p>
            </button>
          ))}
        </div>
        <Field label="Issues found" hint="Tick what a person confirmed, and how bad it is. This sets the repair cost.">
          {() => (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              {DEFECT_TYPES.map((t) => (
                <div key={t} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg px-1.5 py-1 hover:bg-paper">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-700"
                      checked={!!sev[t]}
                      onChange={(e) =>
                        setSev((m) => {
                          const n = { ...m }
                          if (e.target.checked) n[t] = 'minor'
                          else delete n[t]
                          return n
                        })
                      }
                    />
                    {DEFECT_LABEL[t]}
                  </label>
                  {sev[t] && (
                    <div className="flex gap-1" role="radiogroup" aria-label={`${DEFECT_LABEL[t]} severity`}>
                      {SEVERITIES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={sev[t] === v}
                          onClick={() => setSev((m) => ({ ...m, [t]: v }))}
                          className={`rounded-md px-2 py-0.5 text-xs ${sev[t] === v ? 'bg-ink text-white' : 'bg-paper-2 text-ink-2'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Field>
        {grade !== 'MANUAL_REVIEW' && floor.grade !== grade && ({ A: 0, B: 1, C: 2 } as const)[floor.grade] > ({ A: 0, B: 1, C: 2 } as const)[grade] && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            These issues usually mean at least {GRADE_LABEL[floor.grade]} ({floor.why}). You can still save your grade.
          </p>
        )}
        {item.decision_route && item.status !== 'completed' && (
          <p className="rounded-lg bg-paper px-3 py-2 text-xs text-ink-2">Saving a new grade clears the saved decision and re-prices this return with your current rates.</p>
        )}
        <Field label={mode === 'correct' ? 'Reason for correction' : 'Note (optional)'} error={err} required={mode === 'correct'}>
          {(id) => <Textarea id={id} value={note} onChange={(e) => { setNote(e.target.value); setErr('') }} placeholder="e.g. Stain lifted after spot cleaning test." className="min-h-20" />}
        </Field>
      </div>
    </Modal>
  )
}
