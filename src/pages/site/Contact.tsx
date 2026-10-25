import { useState, type FormEvent } from 'react'
import { PublicLayout } from '../../components/SiteChrome'
import { Alert, Button, Field, Input, Select, Textarea } from '../../components/ui'
import { config } from '../../config'
import { SUPPORT_TOPICS, type SupportTopic } from '../../lib/support'
import { PageIntro, usePageMeta } from './shared'

const AI_TEMPLATE = 'The AI result for this return looks wrong. The item is actually: '

function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  // Links from the app (e.g. "Think the AI got this wrong?") prefill the topic and the return it's about.
  const [form, setForm] = useState(() => {
    const q = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
    const t = q.get('topic')
    const topic: SupportTopic = t && t in SUPPORT_TOPICS ? (t as SupportTopic) : 'general'
    return {
      name: '',
      email: '',
      company: '',
      topic: SUPPORT_TOPICS[topic] as string,
      return_ref: (q.get('ref') ?? '').slice(0, 120),
      message: topic === 'ai_result' ? AI_TEMPLATE : '',
      'bot-field': '',
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Please add your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email.'
    if (form.message.trim().length < 10 || form.message.trim() === AI_TEMPLATE.trim()) errs.message = 'Tell us a little more (10+ characters).'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setState('sending')
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'contact', ...form }).toString(),
      })
      if (!res.ok) throw new Error()
      setState('sent')
    } catch {
      setState('error')
    }
  }
  if (state === 'sent') return <Alert tone="success" title="Thanks — message received">We’ll reply to {form.email} within two working days.</Alert>
  return (
    <form name="contact" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="form-name" value="contact" />
      <p className="hidden"><label>Leave empty <input name="bot-field" value={form['bot-field']} onChange={(e) => setForm({ ...form, 'bot-field': e.target.value })} /></label></p>
      <Field label="Name" error={errors.name}>{(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} autoComplete="name" />}</Field>
      <Field label="Work email" error={errors.email}>{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} autoComplete="email" />}</Field>
      <Field label="Company (optional)">{(id) => <Input id={id} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" />}</Field>
      <Field label="Topic">
        {(id) => (
          <Select id={id} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
            {Object.values(SUPPORT_TOPICS).map((t) => <option key={t}>{t}</option>)}
          </Select>
        )}
      </Field>
      {form.return_ref && (
        <Field label="Return reference" className="sm:col-span-2" hint="Filled in from the return you came from.">
          {(id) => <Input id={id} value={form.return_ref} onChange={(e) => setForm({ ...form, return_ref: e.target.value.slice(0, 120) })} className="font-mono text-xs" />}
        </Field>
      )}
      <Field label="How can we help?" error={errors.message} className="sm:col-span-2">{(id) => <Textarea id={id} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} invalid={!!errors.message} placeholder="Monthly return volume, categories, what you’d like to see…" />}</Field>
      {state === 'error' && (
        <Alert tone="error" className="sm:col-span-2">
          The message couldn’t be sent right now.{config.contactEmail ? <> Please email <a className="underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.</> : ' Please try again shortly.'}
        </Alert>
      )}
      <div className="sm:col-span-2"><Button type="submit" loading={state === 'sending'}>Send message</Button></div>
    </form>
  )
}

export default function Contact() {
  usePageMeta('/contact')
  return (
    <PublicLayout>
      <PageIntro eyebrow="Contact" title="Talk to us.">
        Questions about the product, an AI result or your plan — we reply within two working days.
        {config.contactEmail && (
          <> Or email <a className="font-medium text-brand-700 underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.</>
        )}
      </PageIntro>
      <section id="contact" className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <ContactForm />
        </div>
      </section>
    </PublicLayout>
  )
}
