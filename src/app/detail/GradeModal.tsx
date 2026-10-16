import { useState } from 'react'
import { Button, Field, Modal, Textarea } from '../../components/ui'
import {
  DEFECT_LABEL,
  DEFECT_TYPES,
  GRADE_DESCRIPTION,
  GRADE_LABEL,
  GRADES,
  type Defect,
  type DefectType,
  type Grade,
  type ReturnItem,
} from '../../lib/types'

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
      </div>
    </Modal>
  )
}
