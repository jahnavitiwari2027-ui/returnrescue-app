import clsx from 'clsx'
import { ArrowRight, ChevronDown, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, Button, Card } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { useRates } from '../data/rates'
import { inr } from '../lib/format'
import {
  ASSUMPTIONS,
  DEFAULT_RATES,
  estimateFromRates,
  RANGE_POLICY,
  RATE_SOURCES,
  RATES_CHECKED_ON,
  rateMeta,
  repriceable,
  type Channel,
  type RateCard,
  type SourceKey,
} from '../lib/rates'
import { calculateRecovery } from '../lib/recovery'
import { CATEGORIES, emptyReturnInput, ROUTE_LABEL, type Category } from '../lib/types'

type Unit = '₹' | '%' | 'kg'

const getAt = (o: unknown, path: string[]): number => path.reduce<unknown>((v, k) => (v as Record<string, unknown>)[k], o) as number
function setAt(o: RateCard, path: string[], value: number): RateCard {
  const next = JSON.parse(JSON.stringify(o)) as RateCard
  let cur = next as unknown as Record<string, unknown>
  for (const k of path.slice(0, -1)) cur = cur[k] as Record<string, unknown>
  cur[path[path.length - 1]] = value
  return next
}

/** A fixed example so the effect of an edit is visible before saving. */
const EXAMPLE = { category: 'Topwear' as Category, original_price: 1999, grade: 'B' as const, defects: [{ type: 'stain' as const, severity: 'moderate' as const }] }
function exampleNets(r: RateCard) {
  const e = estimateFromRates(EXAMPLE, r)
  const c = calculateRecovery({ ...emptyReturnInput(), ...EXAMPLE, ...e.values, value_basis: {} })
  return c.routes.filter((x) => x.eligible && x.configured).map((x) => ({ route: x.route, net: x.net, best: x.route === c.recommended }))
}

export default function RatesPage() {
  const { items, update, mode } = useWorkspace()
  const { rates, customised, save } = useRates()
  const [draft, setDraft] = useState<RateCard>(rates)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [applying, setApplying] = useState(false)
  useEffect(() => setDraft(rates), [rates])

  const dirty = JSON.stringify(draft) !== JSON.stringify(rates)
  const pending = useMemo(() => repriceable(items, rates), [items, rates])
  const decidedCount = items.filter((i) => i.decision_route || i.status === 'completed').length
  const before = useMemo(() => exampleNets(rates), [rates])
  const after = useMemo(() => exampleNets(draft), [draft])

  const row = (label: string, path: string[], unit: Unit, hint?: string) => (
    <NumRow
      key={path.join('.')}
      label={label}
      hint={hint}
      unit={unit}
      value={getAt(draft, path)}
      def={getAt(DEFAULT_RATES, path)}
      meta={rateMeta(path)}
      onChange={(v) => setDraft((d) => setAt(d, path, v))}
    />
  )

  const doSave = async (next: RateCard | null) => {
    setSaving(true)
    setMsg(null)
    try {
      await save(next)
      setMsg({ tone: 'success', text: next ? 'Rates saved. New inspections and grades use them now.' : 'Back to the published defaults.' })
    } catch (e) {
      setMsg({ tone: 'error', text: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const applyToOpen = async () => {
    setApplying(true)
    try {
      for (const p of pending) await update(p.item.id, p.patch)
      setMsg({ tone: 'success', text: `Updated ${pending.length} return${pending.length === 1 ? '' : 's'} without a decision. Saved decisions were left as they are.` })
    } catch (e) {
      setMsg({ tone: 'error', text: (e as Error).message })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <h1 className="font-display text-[36px] leading-none tracking-tight sm:text-[44px]">Your rates</h1>
      <p className="mt-2 text-sm text-muted">
        Every rupee estimate comes from these numbers — the AI only spots the damage. Each default is either a published rate (with its source) or a labelled assumption. Sources checked {RATES_CHECKED_ON}.
        {mode === 'demo' && ' In the demo, changes stay in this browser.'}
      </p>

      <Card className="mt-5 p-4">
        <p className="text-sm font-semibold">How a change applies</p>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          <li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" /> New inspections and grade changes use your rates straight away.</li>
          <li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" /> Returns without a decision update when you choose <strong className="font-medium">Update them</strong>.</li>
          <li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" /> Saved decisions and completed returns{decidedCount ? ` (${decidedCount} now)` : ''} never change.</li>
        </ul>
        <div className="mt-4 rounded-xl bg-paper p-3">
          <p className="text-xs font-medium text-muted">Example: ₹1,999 shirt, Grade B, moderate stain</p>
          <ul className="mt-1.5 space-y-1">
            {after.map((a) => {
              const b = before.find((x) => x.route === a.route)
              const changed = dirty && b && Math.round(b.net) !== Math.round(a.net)
              return (
                <li key={a.route} className="flex items-center justify-between gap-3 text-sm">
                  <span>{ROUTE_LABEL[a.route]}{a.best && <span className="ml-1.5 text-xs text-brand-700">best</span>}</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap tabular">
                    {changed && <><span className="text-muted line-through">{inr(b!.net)}</span><ArrowRight className="size-3 text-muted" /></>}
                    <span className={clsx(changed && 'font-semibold text-brand-800')}>{inr(a.net)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </Card>

      {msg && <Alert tone={msg.tone} className="mt-4">{msg.text}</Alert>}
      {!dirty && pending.length > 0 && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 border-brand-300 p-4">
          <p className="text-sm">{pending.length} return{pending.length === 1 ? '' : 's'} without a decision {pending.length === 1 ? 'uses' : 'use'} earlier values.</p>
          <Button size="sm" variant="secondary" loading={applying} onClick={applyToOpen} icon={<RefreshCw className="size-3.5" />}>Update them</Button>
        </Card>
      )}

      <Group title="Where you sell" open>
        <div className="grid grid-cols-2 gap-2 py-3" role="radiogroup" aria-label="Sales channel">
          {(
            [
              ['marketplace', 'Marketplace', 'Amazon.in fees, Easy Ship'],
              ['own_site', 'Own website', 'Payment gateway + courier'],
            ] as [Channel, string, string][]
          ).map(([v, l, d]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={draft.channel === v}
              onClick={() => setDraft((x) => ({ ...x, channel: v }))}
              className={clsx('rounded-xl border px-3 py-2.5 text-left', draft.channel === v ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line')}
            >
              <span className="block text-sm font-medium">{l}</span>
              <span className="block text-xs text-muted">{d}</span>
            </button>
          ))}
        </div>
        {draft.channel === 'marketplace' ? (
          <>
            {row('No referral fee up to', ['fee_free_up_to'], '₹')}
            {CATEGORIES.map((c) => row(`${c} referral fee`, ['referral_pct', c], '%'))}
          </>
        ) : (
          row('Payment gateway fee', ['payment_gateway_pct'], '%')
        )}
      </Group>

      <Group title="GST" open>
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm">GST-registered business</p>
            <p className="text-xs text-muted">Registered: GST on the sale is deducted, and GST on fees is claimed back. Not registered: GST on fees is a cost.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.gst_registered}
            aria-label="GST-registered business"
            onClick={() => setDraft((x) => ({ ...x, gst_registered: !x.gst_registered }))}
            className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', draft.gst_registered ? 'bg-brand-600' : 'bg-ink/20')}
          >
            <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', draft.gst_registered ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>
        {row('Clothing & footwear GST up to the threshold', ['goods_gst_low_pct'], '%')}
        {row('Threshold per piece or pair', ['goods_gst_threshold'], '₹')}
        {row('Clothing & footwear GST above it', ['goods_gst_high_pct'], '%')}
        {row('Bags & accessories GST', ['bags_gst_pct'], '%', 'Check your HSN code')}
        {row('GST on marketplace and gateway fees', ['gst_on_fees_pct'], '%')}
      </Group>

      <Group title="Shipping, packing & labour">
        {row(draft.channel === 'marketplace' ? 'Weight handling, first 500 g' : 'Courier, first 500 g', ['ship_first_500g', draft.channel], '₹')}
        {row('Each extra 500 g', ['ship_extra_500g'], '₹', draft.channel === 'own_site' ? 'Amazon’s slab rate used as a proxy' : undefined)}
        {row('Packing materials per unit', ['packing_materials'], '₹')}
        {row('Labour per hour', ['labour_per_hour'], '₹', '₹710/day ÷ 8 h + 16.25% employer PF & ESI')}
      </Group>

      <Group title="Resale & liquidation">
        {row('Repaired items resell at', ['refurb_resale_pct'], '%', '% of your original price')}
        {row('Liquidation, Grade A', ['liquidation_pct', 'A'], '%', '% of your original price, before GST')}
        {row('Liquidation, Grade B', ['liquidation_pct', 'B'], '%')}
        {row('Liquidation, Grade C', ['liquidation_pct', 'C'], '%')}
        {row('Liquidation, not graded yet', ['liquidation_pct', 'ungraded'], '%')}
        {row('Liquidation commission', ['liquidation_commission_pct'], '%')}
        {row('Bulk freight per unit', ['liquidation_freight'], '₹')}
      </Group>

      <Group title="Cleaning & repair prices">
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Professional cleaning, per item</p>
        {CATEGORIES.filter((c) => c !== 'Footwear' && c !== 'Bags & accessories').map((c) => row(c, ['services', 'dry_clean', c], '₹'))}
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Cobbler (shoes and bags)</p>
        {row('Cleaning & polish', ['services', 'shoe_clean'], '₹')}
        {row('Hard-stain removal (extra)', ['services', 'shoe_hard_stain'], '₹')}
        {row('Sole pasting', ['services', 'shoe_sole_paste'], '₹')}
        {row('Sole replacement', ['services', 'shoe_sole_replace'], '₹')}
        {row('Stitching work', ['services', 'shoe_stitch'], '₹')}
        {row('Patch work', ['services', 'shoe_patch'], '₹')}
        {row('Heel replacement', ['services', 'shoe_heel'], '₹')}
        {row('Colour change / restoration', ['services', 'shoe_colour'], '₹')}
        {row('Leather / upper replacement', ['services', 'shoe_leather_replace'], '₹')}
        {row('Replacement shoebox', ['services', 'shoe_box'], '₹')}
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Tailor</p>
        {row('Small darn or patch', ['services', 'tailor_small_repair'], '₹')}
        {row('Larger darn, patch or stitch repair', ['services', 'tailor_repair'], '₹')}
        {row('Seam repair', ['services', 'seam_repair'], '₹')}
        {row('Zip replacement', ['services', 'zip_replace'], '₹')}
        {row('Zip & hardware replacement (major)', ['services', 'zip_replace_major'], '₹')}
      </Group>

      <Group title="Recycling">
        {row('Textile scrap value per kg', ['scrap_per_kg'], '₹')}
        {row('Transport per unit', ['recycle_transport'], '₹')}
      </Group>

      <Group title="Packed weight per item">
        {CATEGORIES.map((c) => row(c, ['weight_kg', c], 'kg'))}
      </Group>

      <Group title="Sources and assumptions">
        <ul className="space-y-2.5 py-3 text-sm">
          {(Object.keys(RATE_SOURCES) as SourceKey[]).map((k) => (
            <li key={k}>
              <a href={RATE_SOURCES[k].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                {RATE_SOURCES[k].publisher} — {RATE_SOURCES[k].title} <ExternalLink className="size-3" />
              </a>
              <p className="text-xs text-muted">{RATE_SOURCES[k].used_for} <span className="text-ink-2">{RATE_SOURCES[k].effective}.</span></p>
            </li>
          ))}
        </ul>
        <p className="pt-3 text-xs font-medium">Assumptions — no public source; replace them with your own figures or quotes</p>
        <ul className="list-disc space-y-0.5 py-2 pl-4 text-xs text-muted">
          {ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
        </ul>
        <p className="pb-3 text-xs text-muted">{RANGE_POLICY} Fee and GST bands use the original price; a repaired item sold lower may fall in a cheaper band, so refurbish estimates err low.</p>
      </Group>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-60">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink disabled:opacity-40"
            disabled={!customised || saving}
            onClick={() => doSave(null)}
          >
            <RotateCcw className="size-3.5" /> Reset to defaults
          </button>
          <div className="flex gap-2">
            {dirty && <Button variant="ghost" onClick={() => setDraft(rates)}>Discard</Button>}
            <Button loading={saving} disabled={!dirty} onClick={() => doSave(draft)}>Save rates</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Group({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group mt-4 rounded-2xl border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="divide-y divide-line border-t border-line px-5 pb-2">{children}</div>
    </details>
  )
}

function NumRow({
  label,
  hint,
  unit,
  value,
  def,
  meta,
  onChange,
}: {
  label: string
  hint?: string
  unit: Unit
  value: number
  def: number
  meta: { kind: 'business' | 'published' | 'assumption'; source?: SourceKey }
  onChange: (v: number) => void
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const changed = value !== def
  const id = `rate-${label.replace(/\W+/g, '-').toLowerCase()}`
  const src = meta.source ? RATE_SOURCES[meta.source] : null
  const fmt = (n: number) => (unit === '₹' ? `₹${n}` : unit === '%' ? `${n}%` : `${n} kg`)
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm">{label}</label>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
          {changed ? (
            <span className="rounded bg-brand-50 px-1.5 py-px text-[10px] font-medium text-brand-800">Your value · default {fmt(def)}</span>
          ) : meta.kind === 'published' ? (
            <span className="rounded bg-ink/[0.06] px-1.5 py-px text-[10px] font-medium text-ink">Published</span>
          ) : (
            <span className="rounded bg-amber-50 px-1.5 py-px text-[10px] font-medium text-amber-800">Assumption</span>
          )}
          {src && !changed && (
            <a href={src.url} target="_blank" rel="noreferrer" title={`${src.title} — ${src.effective}`} className="inline-flex items-center gap-0.5 text-brand-700 hover:underline">
              {src.publisher} <ExternalLink className="size-2.5" />
            </a>
          )}
          {hint && <span>{hint}</span>}
        </p>
      </div>
      <div className="relative w-28 shrink-0">
        {unit === '₹' && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">₹</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={unit === '%' ? 100 : undefined}
          step="any"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(n) && n >= 0 && (unit !== '%' || n <= 100)) onChange(n)
          }}
          onBlur={() => setText(String(value))}
          className={clsx(
            'h-10 w-full rounded-xl border bg-white text-right text-sm tabular outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            unit === '₹' ? 'pl-7 pr-3' : 'pl-3 pr-9',
            changed ? 'border-brand-400' : 'border-line',
          )}
        />
        {unit !== '₹' && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{unit}</span>}
      </div>
    </div>
  )
}
