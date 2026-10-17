import { ChevronDown, Eye, FileClock, Lock, Scale, UserCheck, ClipboardCheck } from 'lucide-react'
import { RATE_SOURCES, RATES_CHECKED_ON } from '../lib/rates'
import { GRADE_GUIDE, GRADE_LABEL, GRADES } from '../lib/types'

const formulas = [
  ['Restock', 'your price − selling fee − handling & shipping'],
  ['Refurbish', 'resale after repair (default 70% of your price) − selling fee − repairs − handling & shipping'],
  ['Liquidate', 'liquidation price − commission & bulk freight'],
  ['Recycle', 'scrap value − sorting & transport'],
]

const trust = [
  { icon: UserCheck, title: 'You make the call', body: 'The AI suggests a grade. Rules check it. You confirm.' },
  { icon: Eye, title: 'No made-up money', body: 'The AI never sets a price. Every rupee links to a source.' },
  { icon: ClipboardCheck, title: 'Honest limits', body: 'It says what photos can’t prove.' },
  { icon: FileClock, title: 'Full record', body: 'Grades, decisions and outcomes are logged.' },
  { icon: Lock, title: 'Private data', body: 'Isolated workspaces and private photo storage.' },
  { icon: Scale, title: 'No inflated claims', body: 'No made-up savings, logos or testimonials.' },
]

export default function Methodology() {
  return (
    <section id="trust" className="scroll-mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Why trust it</p>
        <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">No black boxes.</h2>

        <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {trust.map((t) => (
            <div key={t.title} className="flex gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><t.icon className="size-4" /></div>
              <div>
                <h3 className="font-semibold">{t.title}</h3>
                <p className="text-sm text-muted">{t.body}</p>
              </div>
            </div>
          ))}
        </div>

        <details className="group mt-10 rounded-2xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-medium [&::-webkit-details-marker]:hidden">
            See exactly how grades, values and recommendations are worked out
            <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-8 border-t border-line px-6 py-6 lg:grid-cols-3">
            <div>
              <h3 className="font-semibold">Grading</h3>
              <p className="mt-1 text-sm text-muted">A vision AI model (Google Gemini) follows a fixed rubric and may only report damage it can see. Fixed rules then check its grade: any visible defect rules out A, a major or unrepairable one means C, and odour, unclear photos or a possible mismatch go to a person.</p>
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
              <h3 className="font-semibold">Values</h3>
              <ul className="mt-1 space-y-2 text-sm text-muted">
                <li>The AI never sets a price. It only reports each defect and how severe it is.</li>
                <li>Each defect maps to a fix with a cost: in-house work at Delhi minimum wage, or a cleaner, cobbler or tailor at published prices. Unrepairable damage rules out refurbishing.</li>
                <li>Fees and shipping follow Amazon.in’s fee schedule (or your own website’s). Resale and liquidation are stated percentages of your price.</li>
                <li>Every default links to its source or is labelled an assumption. Change any rate to your own; enter a quote and it’s kept as one.</li>
              </ul>
              <p className="mt-3 text-xs font-medium text-ink">Sources (checked {RATES_CHECKED_ON})</p>
              <ul className="mt-1 space-y-1 text-xs">
                {Object.values(RATE_SOURCES).map((src) => (
                  <li key={src.url}>
                    <a href={src.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{src.title}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Recommendation</h3>
              <p className="mt-1 text-sm text-muted">Plain arithmetic, per unit:</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                {formulas.map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-medium">{k}</dt>
                    <dd className="font-mono text-xs text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-muted">
                Grade A allows all routes, B excludes restock, C allows liquidate or recycle, and Manual review waits for a person. The highest net wins. Return shipping already paid is excluded. Where a source gives a range, we take the cautious end.
              </p>
            </div>
          </div>
        </details>
      </div>
    </section>
  )
}
