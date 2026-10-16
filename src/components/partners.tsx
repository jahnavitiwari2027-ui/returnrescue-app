import { Globe, Mail, MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { newPartner, PARTNER_KIND_LABEL, type Partner } from '../data/partners'
import { ROUTES, type RouteKey } from '../lib/types'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'

const digits = (p: string) => p.replace(/\D/g, '')
const waNumber = (p: string) => {
  const d = digits(p)
  return d.length === 10 ? `91${d}` : d
}
const withProtocol = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)

export function PartnerActions({ partner }: { partner: Partner }) {
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium hover:border-ink/25'
  return (
    <div className="flex flex-wrap gap-1.5">
      {partner.phone && (
        <>
          <a className={btn} href={`tel:${digits(partner.phone)}`}><Phone className="size-3.5" /> Call</a>
          <a className={btn} href={`https://wa.me/${waNumber(partner.phone)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-3.5" /> WhatsApp</a>
        </>
      )}
      {partner.email && <a className={btn} href={`mailto:${partner.email}`}><Mail className="size-3.5" /> Email</a>}
      {partner.website && <a className={btn} href={withProtocol(partner.website)} target="_blank" rel="noreferrer"><Globe className="size-3.5" /> Website</a>}
    </div>
  )
}

export function PartnerModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Partner | null
  onClose: () => void
  onSave: (p: Partner) => Promise<void>
}) {
  const [p, setP] = useState<Partner>(initial ?? newPartner())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const set = (k: keyof Partner, v: string) => {
    setP((x) => ({ ...x, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!p.name.trim()) e.name = 'Add a name.'
    if (p.phone && digits(p.phone).length < 8) e.phone = 'That phone number looks too short.'
    if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) e.email = 'Enter a valid email.'
    if (!p.phone && !p.email && !p.website) e.phone = 'Add at least one way to reach them.'
    setErrors(e)
    if (Object.values(e).some(Boolean)) return
    setSaving(true)
    try {
      await onSave({ ...p, name: p.name.trim(), city: p.city.trim(), note: p.note.trim(), website: p.website.trim() })
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial?.name ? 'Edit partner' : 'Add a partner'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sharma Shoe Repair" invalid={!!errors.name} />}
        </Field>
        <Field label="What they do">
          {(id) => (
            <Select id={id} value={p.kind} onChange={(e) => set('kind', e.target.value as RouteKey)}>
              {ROUTES.map((r) => <option key={r} value={r}>{PARTNER_KIND_LABEL[r]}</option>)}
            </Select>
          )}
        </Field>
        <Field label="City (optional)">
          {(id) => <Input id={id} value={p.city} onChange={(e) => set('city', e.target.value)} />}
        </Field>
        <Field label="Phone / WhatsApp" error={errors.phone}>
          {(id) => <Input id={id} type="tel" value={p.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98xxxxxxxx" invalid={!!errors.phone} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(id) => <Input id={id} type="email" value={p.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} />}
        </Field>
        <Field label="Website (optional)" className="sm:col-span-2">
          {(id) => <Input id={id} value={p.website} onChange={(e) => set('website', e.target.value)} placeholder="example.com" />}
        </Field>
        <Field label="Note (optional)" className="sm:col-span-2">
          {(id) => <Textarea id={id} className="min-h-16" value={p.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Good for sneakers, 3-day turnaround" />}
        </Field>
      </div>
      {formError && <p className="mt-3 text-sm font-medium text-red-700">{formError}</p>}
    </Modal>
  )
}
