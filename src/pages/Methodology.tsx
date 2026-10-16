import { Calculator, CheckCircle2, ClipboardCheck, Eye, FileClock, Lock, Scale, ShieldCheck, Sparkles, UserCheck } from 'lucide-react'
import { GRADE_DESCRIPTION, GRADE_LABEL, GRADES } from '../lib/types'

const formulas = [
  ['Restock & resell', 'Resale price − channel fee − handling'],
  ['Repackage / refurbish', 'Resale after refurb − channel fee − repair cost − handling'],
  ['Liquidate', 'Liquidation price − liquidation fee − handling'],
  ['Recycle / dispose', 'Salvage value − disposal cost'],
]

const eligibility = [
  ['Grade A', 'All four routes'],
  ['Grade B', 'Refurbish, liquidate, recycle'],
  ['Grade C', 'Liquidate, recycle'],
  ['Manual review', 'None until a person grades it'],
]

const trust = [
  { icon: UserCheck, title: 'A person makes the call', body: 'The AI proposes; your team accepts or corrects. Every correction needs a reason and is kept on the record.' },
  { icon: Eye, title: 'Nothing hidden', body: 'Every input, fee and cost behind a recommendation is shown line by line, and every value can be edited.' },
  { icon: ClipboardCheck, title: 'Honest about limits', body: 'Each AI result says what photos can’t prove — hidden damage, hygiene, odour, authenticity — and which checks to do by hand.' },
  { icon: FileClock, title: 'A full audit trail', body: 'Grades, AI results with model and time, decisions, overrides and realized proceeds are all stored against the item.' },
  { icon: Lock, title: 'Your data stays yours', body: 'Workspaces are isolated in the database, photos sit in private storage, secret keys never reach the browser, and payments are handled by Dodo Payments.' },
  { icon: Scale, title: 'No inflated claims', body: 'We don’t show savings figures, logos or testimonials we can’t back up. ReturnRescue is an early-stage product — try it free on your own returns and judge for yourself.' },
]

export default function Methodology() {
  return (
    <section id="trust" className="scroll-mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">How it works · Why trust it</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">No black boxes.</h2>
          <p className="mt-4 text-ink-2">
            Here is exactly what the AI does, how every number is worked out, and where a person stays in charge.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {/* 1. Inspection */}
          <div className="rounded-2xl border border-line bg-paper p-6">
            <Sparkles className="size-6 text-brand-700" />
            <h3 className="mt-4 font-semibold">1 · How the AI inspects</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Your photos and notes go to a vision AI model (Google Gemini) with a fixed grading rubric. It may only report damage it can actually see, must say what it can’t judge, and must choose Manual review when photos are unclear or something needs a person.
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
              {GRADES.map((g) => (
                <div key={g}>
                  <dt className="font-medium">{GRADE_LABEL[g]}</dt>
                  <dd className="text-muted">{GRADE_DESCRIPTION[g]}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 2. Estimates */}
          <div className="rounded-2xl border border-line bg-paper p-6">
            <Scale className="size-6 text-brand-700" />
            <h3 className="mt-4 font-semibold">2 · How values are estimated</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Each route needs a few per-unit numbers: what the item would sell for, what fixing it costs, what a liquidator pays, and so on. You can enter your own — or leave them blank and the AI suggests them.
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                'AI suggestions start from the original selling price, then adjust for the category and the condition visible in the photos.',
                'They assume typical Indian marketplace fees (about 15–25%) and handling costs, and come with a short rationale.',
                'They are labelled “AI estimate” — a starting point, not market data or an offer.',
                'Swap in your own figure or a liquidator’s quote at any time; the recommendation recalculates instantly.',
                'After the sale you record the realized amount, so estimates and real money are never mixed up.',
              ].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" /><span className="text-ink-2">{t}</span></li>
              ))}
            </ul>
          </div>

          {/* 3. Calculation */}
          <div className="rounded-2xl border border-line bg-paper p-6">
            <Calculator className="size-6 text-brand-700" />
            <h3 className="mt-4 font-semibold">3 · How the recommendation is calculated</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Plain arithmetic, no AI. Net value per unit for each route:</p>
            <dl className="mt-3 space-y-2 text-sm">
              {formulas.map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white px-3 py-2 ring-1 ring-line">
                  <dt className="font-medium">{k}</dt>
                  <dd className="font-mono text-xs text-muted">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm font-medium">Which routes a grade allows</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {eligibility.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              The highest net among allowed routes is recommended. Return shipping you already paid is excluded (a sunk cost), and innerwear or swimwear can only be resold with a confirmed intact seal.
            </p>
          </div>
        </div>

        <div className="mt-16 max-w-2xl">
          <h3 className="flex items-center gap-2 font-display text-3xl tracking-tight"><ShieldCheck className="size-7 text-brand-700" /> Why you can trust it</h3>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trust.map((t) => (
            <div key={t.title} className="rounded-2xl border border-line p-6">
              <div className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><t.icon className="size-4" /></div>
              <h4 className="mt-3 font-semibold">{t.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
