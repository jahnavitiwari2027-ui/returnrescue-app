import { ChevronDown, ExternalLink } from 'lucide-react'
import { KindDot } from '../components/recovery'
import { ASSUMPTIONS, RANGE_POLICY, RATE_SOURCES, RATES_CHECKED_ON } from '../lib/rates'
import { GRADE_GUIDE, GRADE_LABEL, GRADES } from '../lib/types'

const formulas = [
  ['Restock', 'your price − fees & GST − handling & shipping'],
  ['Refurbish', 'resale after repair (default 70% of your price) − fees & GST − repairs − handling & shipping'],
  ['Liquidate', 'liquidation price (before GST) − commission & bulk freight'],
  ['Recycle', 'scrap value − sorting & transport'],
]

const kinds = [
  { kind: 'business' as const, title: 'Your value', body: 'A price, rate or quote you entered. Always wins over a default.' },
  { kind: 'published' as const, title: 'Published rate', body: 'A default from a public source, linked with its date.' },
  { kind: 'assumption' as const, title: 'Assumption', body: 'A default with no public source. Labelled, and yours to replace.' },
]

export default function Methodology() {
  return (
    <section id="trust" className="scroll-mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">The method</p>
        <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Every number says where it came from.</h2>
        <p className="mt-3 max-w-2xl text-ink-2">Each line of a calculation is one of three kinds. Estimates are not offers: the amount you actually receive is recorded separately.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {kinds.map((k) => (
            <div key={k.kind} className="rounded-2xl border border-line p-4">
              <p className="flex items-center gap-2 font-semibold"><KindDot kind={k.kind} /> {k.title}</p>
              <p className="mt-1 text-sm text-muted">{k.body}</p>
            </div>
          ))}
        </div>

        <details className="group mt-6 rounded-2xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-medium [&::-webkit-details-marker]:hidden">
            The full method: grading, formulas, tax, sources and assumptions
            <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-8 border-t border-line px-6 py-6 lg:grid-cols-3">
            <div>
              <h3 className="font-semibold">Grading</h3>
              <p className="mt-1 text-sm text-muted">
                A vision AI model (Google Gemini) follows a fixed rubric and may only report damage it can see. Fixed rules then check its grade: any visible defect rules out A, a major or unrepairable one means C, and odour, unclear photos or a possible mismatch go to a person. Rules only ever make a grade stricter.
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                {GRADES.map((g) => (
                  <div key={g}>
                    <dt className="font-medium">{GRADE_LABEL[g]} · {GRADE_GUIDE[g].short}</dt>
                    <dd className="text-muted">{GRADE_GUIDE[g].meaning} {GRADE_GUIDE[g].allows}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h3 className="font-semibold">Formulas</h3>
              <dl className="mt-2 space-y-1.5 text-sm">
                {formulas.map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-medium">{k}</dt>
                    <dd className="font-mono text-xs text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li>Each defect maps to one fix: in-house minutes at the labour rate, or a cleaner, cobbler or tailor price. One professional clean covers every issue it fixes; unrepairable damage rules out refurbishing.</li>
                <li><span className="font-medium text-ink">GST:</span> for a registered seller, the GST inside the selling price is deducted and GST on fees is claimable input tax credit. If you’re not registered, GST on fees is a cost.</li>
                <li>Only options the grade allows are compared; the highest estimated net wins. Return shipping already paid is excluded.</li>
                <li>Saved decisions keep their values when rates change.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Sources <span className="font-normal text-muted">(checked {RATES_CHECKED_ON})</span></h3>
              <ul className="mt-2 space-y-2 text-xs">
                {Object.values(RATE_SOURCES).map((src) => (
                  <li key={src.url}>
                    <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                      {src.publisher} <ExternalLink className="size-3" />
                    </a>
                    <span className="text-muted"> — {src.used_for} {src.effective}.</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-5 font-semibold">Assumptions</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">
                {ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
              </ul>
              <p className="mt-3 text-xs text-muted">{RANGE_POLICY}</p>
            </div>
          </div>
        </details>
      </div>
    </section>
  )
}
