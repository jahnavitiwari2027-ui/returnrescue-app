import clsx from 'clsx'
import { ArrowRight, Calculator, Camera, Check, CircleCheck, CircleX, Eye, ScanSearch, UserCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../components/SiteChrome'
import { Alert, Button, buttonClass, Field, Input, Textarea } from '../components/ui'
import { accountsEnabled, AFTER_TRIAL, config, LIMITS, PLANS } from '../config'
import ProductPreview from './landing/ProductPreview'
import Methodology from './Methodology'
import { inr } from '../lib/format'
import { RATES_CHECKED_ON } from '../lib/rates'
import { GRADE_ELIGIBILITY } from '../lib/recovery'
import { GRADE_GUIDE, GRADES, ROUTE_LABEL, type Grade } from '../lib/types'

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return setShown(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={clsx(className, 'transition-all duration-700 ease-out', shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

const GRADE_TONE: Record<Grade, { card: string; chip: string }> = {
  A: { card: 'border-brand-200 bg-brand-50/40', chip: 'bg-brand-100 text-brand-800' },
  B: { card: 'border-sky-200 bg-sky-50/40', chip: 'bg-sky-100 text-sky-800' },
  C: { card: 'border-amber-200 bg-amber-50/40', chip: 'bg-amber-100 text-amber-800' },
  MANUAL_REVIEW: { card: 'border-red-200 bg-red-50/40', chip: 'bg-red-100 text-red-800' },
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{children}</p>
}

function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', 'bot-field': '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Please add your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email.'
    if (form.message.trim().length < 10) errs.message = 'Tell us a little more (10+ characters).'
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
      <Field label="Company (optional)" className="sm:col-span-2">{(id) => <Input id={id} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" />}</Field>
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

function GradePicker() {
  const [g, setG] = useState<Grade>('B')
  return (
    <div className="rounded-3xl border border-line bg-paper/50 p-4 sm:p-5">
      <div className="grid grid-cols-4 gap-2" role="tablist" aria-label="Grades">
        {GRADES.map((x) => (
          <button
            key={x}
            role="tab"
            aria-selected={g === x}
            onClick={() => setG(x)}
            className={clsx('rounded-2xl border px-2 py-3 text-center transition', g === x ? clsx(GRADE_TONE[x].card, 'ring-1 ring-current/0 shadow-sm') : 'border-transparent hover:bg-white')}
          >
            <span className={clsx('mx-auto grid size-10 place-items-center rounded-xl font-display text-2xl', GRADE_TONE[x].chip)}>{x === 'MANUAL_REVIEW' ? '?' : x}</span>
            <span className="mt-1.5 block text-[11px] font-medium leading-tight text-ink-2">{GRADE_GUIDE[x].short}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-white p-4" role="tabpanel">
        <p className="text-sm font-semibold">{g === 'MANUAL_REVIEW' ? 'Manual review' : `Grade ${g}`} · {GRADE_GUIDE[g].short}</p>
        <p className="mt-1 text-sm text-ink-2">{GRADE_GUIDE[g].meaning}</p>
        <p className="mt-3 text-xs font-medium text-muted">Allowed options</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {GRADE_ELIGIBILITY[g].length ? (
            GRADE_ELIGIBILITY[g].map((r) => <li key={r} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-900">{ROUTE_LABEL[r]}</li>)
          ) : (
            <li className="rounded-md bg-paper-2 px-2 py-0.5 text-xs text-ink-2">None until a person checks it</li>
          )}
        </ul>
        <p className="mt-3 text-xs text-muted">Innerwear and swimwear also need an intact hygiene seal to be restocked or refurbished.</p>
      </div>
    </div>
  )
}

const faqs: [string, ReactNode][] = [
  ['What does the AI do — and not do?', 'It looks at your photos and notes, lists each visible defect with how severe it is, and proposes a grade with its reasons. It never sets a price or a cost, and it can’t judge hidden damage, odour, hygiene or authenticity. Fixed rules check its grade against the defects, and a person confirms it.'],
  ['Where do the rupee values come from?', 'From a rate card. Each default is either a published rate — Amazon.in fees, GST slabs, courier and payment-gateway rates, the Delhi minimum wage, real cleaner, cobbler and tailor price lists, surplus-stock and scrap rates — linked to its source and date, or a clearly labelled assumption. You can replace any of them with your own figures, or enter a real quote on a single return.'],
  ['How is GST handled?', 'If you’re GST-registered, the GST included in the selling price is deducted (it goes to the government), and GST on marketplace or gateway fees is treated as claimable input tax credit, not a cost. If you’re not registered, no GST is deducted from the sale and GST on fees counts as a cost. You set this on the Rates page.'],
  ['How is the best option chosen?', 'By plain arithmetic, not AI: for each option the grade allows, the money in minus fees and GST, repairs and shipping. The highest estimated net wins. Return shipping you already paid is left out because it’s spent whichever option you choose.'],
  ['What happens to past decisions if I change my rates?', 'Nothing. Saved decisions and completed returns keep the values they were decided with. Returns without a decision can be updated in one step, and the app shows how many will change.'],
  ['Are the estimates guaranteed?', 'No. They’re estimates, not offers. The amount you actually receive is recorded separately, so you can compare it with the estimate.'],
  ['Do I need to sign up?', `Not to look around — the demo is open. To inspect your own products, start the ${LIMITS.trialDays}-day free trial. No card needed.`],
  ['What happens after the trial?', AFTER_TRIAL + ' Nothing is charged unless you upgrade.'],
  ['Can I cancel anytime?', 'Yes, from the billing page. Pro stays active until the end of the paid month.'],
]

export default function Landing() {
  const steps = [
    { icon: Camera, title: 'Photo', body: 'Snap the returned item.' },
    { icon: ScanSearch, title: 'AI finds damage', body: 'Visible defects, severity, a grade.' },
    { icon: Calculator, title: 'Rate card prices it', body: 'Every option, every rupee sourced.' },
    { icon: UserCheck, title: 'You decide', body: 'Confirm, override, or add a quote.' },
  ]
  const roles = [
    {
      icon: Eye,
      who: 'The AI',
      does: ['Lists the visible defects and how severe each is', 'Proposes a grade with its reasons and confidence', 'Says what photos can’t show'],
      never: ['Sets a price or a cost', 'Judges hidden damage, odour, hygiene or authenticity'],
    },
    {
      icon: Calculator,
      who: 'The rate card',
      does: ['Prices each fix from real cleaner, cobbler and tailor rates', 'Applies Amazon.in fees, GST and courier rates', `Links every published rate to its source, checked ${RATES_CHECKED_ON}`],
      never: ['Hides an assumption — each one is labelled and editable'],
    },
    {
      icon: UserCheck,
      who: 'Your team',
      does: ['Confirms or corrects every grade', 'Chooses the option — overrides keep a reason', 'Replaces any estimate with your own price or a real quote', 'Records what was actually received'],
      never: [],
    },
  ]

  return (
    <PublicLayout>
      {/* Hero + live example */}
      <section className="relative overflow-hidden">
        <div className="grain pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-start gap-10 px-5 pb-14 pt-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="animate-rise lg:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Returns recovery for apparel & footwear brands</p>
            <h1 className="mt-4 font-display text-[44px] leading-[1] tracking-tight sm:text-[64px]">
              Know what every return is worth — <em className="text-brand-700">and why.</em>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
              AI identifies the visible damage. A transparent rate card prices each recovery option. Your team makes the final call.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={accountsEnabled ? '/signup' : '/demo'} className={buttonClass('primary', 'lg')}>
                {accountsEnabled ? `Start ${LIMITS.trialDays}-day free trial` : 'Try the demo'} <ArrowRight className="size-4" />
              </Link>
              <Link to="/demo" className={buttonClass('secondary', 'lg')}>Open the live demo</Link>
            </div>
            <p className="mt-3 text-sm text-muted">No card needed · Then {inr(config.proPriceInr)}/month</p>
            <ul className="mt-8 grid gap-2.5 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                ['No made-up money', 'The AI never sets a price.'],
                ['Every rupee sourced', 'Published rate or labelled assumption.'],
                ['You stay in charge', 'Nothing is final until you confirm.'],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-2.5 rounded-xl border border-line bg-white/70 px-3 py-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  <span><span className="block font-medium">{t}</span><span className="text-xs text-muted">{b}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div id="example" className="relative scroll-mt-20 animate-rise [animation-delay:120ms]">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-paper to-transparent" />
            <ProductPreview />
            <p className="mt-2 text-center text-[11px] text-muted">Live: the same engine and default rate card as the app · fictional sample products</p>
          </div>
        </div>
      </section>

      {/* Process — compact */}
      <section id="how" className="scroll-mt-20 border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <ol className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-4">
            {steps.map((st, i) => (
              <li key={st.title} className="relative flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                  <st.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold"><span className="mr-1 text-brand-400 tabular">{i + 1}</span>{st.title}</span>
                  <span className="block text-xs text-muted">{st.body}</span>
                </span>
                {i < steps.length - 1 && <ArrowRight className="absolute -right-3 top-2.5 hidden size-4 text-line md:block" aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who does what */}
      <section id="roles" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-14 lg:py-20">
        <Reveal className="max-w-2xl">
          <Eyebrow>Who does what</Eyebrow>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">Clear jobs. No black box.</h2>
          <p className="mt-3 text-ink-2">Returns leak margin when grading depends on who’s on shift and costs are guessed. ReturnRescue splits the work so every number can be checked.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {roles.map((r, i) => (
            <Reveal key={r.who} delay={i * 70}>
              <div className="h-full rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><r.icon className="size-4" /></span>
                  <h3 className="font-semibold">{r.who}</h3>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {r.does.map((d) => <li key={d} className="flex gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0 text-brand-600" />{d}</li>)}
                  {r.never.map((d) => <li key={d} className="flex gap-2 text-ink-2"><CircleX className="mt-0.5 size-4 shrink-0 text-muted" /><span><span className="font-medium">Never:</span> {d.charAt(0).toLowerCase() + d.slice(1)}</span></li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Grades — interactive */}
      <section id="grades" className="scroll-mt-20 border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
          <Reveal>
            <Eyebrow>The grades</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Four grades decide what’s allowed.</h2>
            <p className="mt-3 text-ink-2">The AI proposes a grade from the photos. Fixed rules check it against the defects found — any visible defect rules out A, a major or unrepairable one means C — and a person confirms it.</p>
          </Reveal>
          <Reveal delay={80}>
            <GradePicker />
          </Reveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-14 lg:py-20">
        <Reveal className="text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Try it free for {LIMITS.trialDays} days.</h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 80}>
              <div className={clsx('relative flex h-full flex-col rounded-3xl border bg-white p-7', p.id === 'pro' ? 'border-brand-700 shadow-xl shadow-brand-900/10 ring-1 ring-brand-700' : 'border-line')}>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-4 font-display text-5xl leading-none tabular">
                  {p.price ? inr(p.price) : '₹0'}
                  <span className="font-sans text-base text-muted"> {p.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{f}</li>)}
                </ul>
                <Link
                  to={p.id === 'pro' ? (accountsEnabled ? '/signup?next=/app/billing' : '/demo') : accountsEnabled ? '/signup' : '/demo'}
                  className={buttonClass(p.id === 'pro' ? 'primary' : 'secondary', 'lg', 'mt-7 w-full')}
                >
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-muted">
          {AFTER_TRIAL} Prices in INR, processed by Dodo Payments. <Link to="/refunds" className="underline">Refunds & cancellation</Link>.
        </p>
      </section>

      <Methodology />

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:py-20 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight">Questions</h2>
          </Reveal>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 pr-10 text-sm leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <Eyebrow>Contact</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight">Talk to us.</h2>
            <p className="mt-3 text-ink-2">We reply within two working days.</p>
            {config.contactEmail && (
              <p className="mt-4 text-sm">Or email <a className="font-medium text-brand-700 underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a></p>
            )}
          </Reveal>
          <Reveal delay={100} className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  )
}
