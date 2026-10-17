import clsx from 'clsx'
import { ChevronDown, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, Button, Card } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { useRates } from '../data/rates'
import {
  ASSUMPTIONS,
  DEFAULT_RATES,
  estimateFromRates,
  estimateInputFor,
  RATE_SOURCES,
  RATES_CHECKED_ON,
  ratesPatch,
  type Channel,
  type RateCard,
  type SourceKey,
} from '../lib/rates'
import { CATEGORIES, type Category } from '../lib/types'

type Unit = '₹' | '%' | 'kg'

/** Read/write a nested value by path, e.g. ['services', 'dry_clean', 'Topwear']. */
const getAt = (o: unknown, path: string[]): number => path.reduce<unknown>((v, k) => (v as Record<string, unknown>)[k], o) as number
function setAt(o: RateCard, path: string[], value: number): RateCard {
  const next = JSON.parse(JSON.stringify(o)) as RateCard
  let cur = next as unknown as Record<string, unknown>
  for (const k of path.slice(0, -1)) cur = cur[k] as Record<string, unknown>
  cur[path[path.length - 1]] = value
  return next
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
  // Undecided returns whose rate-card values differ from what the current rates give.
  const open = useMemo(
    () =>
      items.filter((i) => {
        if (i.decision_route || i.status === 'completed' || !Object.values(i.value_basis).includes('rates')) return false
        const patch = ratesPatch(i, estimateFromRates(estimateInputFor(i), rates)) as Record<string, unknown>
        return Object.entries(patch).some(([k, v]) => k !== 'value_basis' && (i as unknown as Record<string, unknown>)[k] !== v)
      }),
    [items, rates],
  )

  const row = (label: string, path: string[], unit: Unit, source?: SourceKey, hint?: string) => (
    <NumRow
      key={path.join('.')}
      label={label}
      hint={hint}
      unit={unit}
      value={getAt(draft, path)}
      def={getAt(DEFAULT_RATES, path)}
      source={source}
      onChange={(v) => setDraft((d) => setAt(d, path, v))}
    />
  )

  const doSave = async (next: RateCard | null) => {
    setSaving(true)
    setMsg(null)
    try {
      await save(next)
      setMsg({ tone: 'success', text: next ? 'Rates saved. New inspections and grades use them.' : 'Back to the published defaults.' })
    } catch (e) {
      setMsg({ tone: 'error', text: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const applyToOpen = async () => {
    setApplying(true)
    try {
      for (const i of open) await update(i.id, ratesPatch(i, estimateFromRates(estimateInputFor(i), rates)))
      setMsg({ tone: 'success', text: `Updated ${open.length} open return${open.length === 1 ? '' : 's'}.` })
    } catch (e) {
      setMsg({ tone: 'error', text: (e as Error).message })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="font-display text-[36px] leading-none tracking-tight sm:text-[44px]">Your rates</h1>
      <p className="mt-2 text-sm text-muted">
        Every rupee estimate comes from these numbers — the AI only spots the damage. Defaults use public Indian prices, checked {RATES_CHECKED_ON}. Change anything to match your real costs.
        {mode === 'demo' && ' In the demo, changes stay in this browser.'}
      </p>

      {msg && <Alert tone={msg.tone} className="mt-4">{msg.text}</Alert>}
      {!dirty && open.length > 0 && customised && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">{open.length} undecided return{open.length === 1 ? '' : 's'} still use{open.length === 1 ? 's' : ''} earlier values.</p>
          <Button size="sm" variant="secondary" loading={applying} onClick={applyToOpen} icon={<RefreshCw className="size-3.5" />}>Update them</Button>
        </Card>
      )}

      <Group title="Where you sell" open>
        <div className="flex gap-2 py-2" role="radiogroup" aria-label="Sales channel">
          {(
            [
              ['marketplace', 'Marketplace', 'Amazon.in fees'],
              ['own_site', 'Own website', 'Payment gateway + courier'],
            ] as [Channel, string, string][]
          ).map(([v, l, d]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={draft.channel === v}
              onClick={() => setDraft((x) => ({ ...x, channel: v }))}
              className={clsx('flex-1 rounded-xl border px-3 py-2.5 text-left', draft.channel === v ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line')}
            >
              <span className="block text-sm font-medium">{l}</span>
              <span className="block text-xs text-muted">{d}</span>
            </button>
          ))}
        </div>
        {draft.channel === 'marketplace' ? (
          <>
            {row('No referral fee up to', ['fee_free_up_to'], '₹', 'amazon_fees')}
            {CATEGORIES.map((c) => row(`${c} referral fee`, ['referral_pct', c], '%', 'amazon_fees'))}
            {row('GST on fees', ['gst_on_fees_pct'], '%', 'amazon_fees')}
          </>
        ) : (
          <>
            {row('Payment gateway fee', ['payment_gateway_pct'], '%', undefined, 'Assumption')}
            {row('GST on fees', ['gst_on_fees_pct'], '%')}
          </>
        )}
      </Group>

      <Group title="Shipping, packing & labour">
        {row(draft.channel === 'marketplace' ? 'Weight handling, first 500 g' : 'Courier, first 500 g', ['ship_first_500g', draft.channel], '₹', draft.channel === 'marketplace' ? 'amazon_fees' : 'courier')}
        {row('Each extra 500 g', ['ship_extra_500g'], '₹', 'amazon_fees')}
        {row('Packing materials per unit', ['packing_materials'], '₹', undefined, 'Assumption')}
        {row('Labour per hour', ['labour_per_hour'], '₹', 'wage', 'Used for in-house steaming, cleaning, re-tagging and packing')}
      </Group>

      <Group title="Resale & liquidation">
        {row('Repaired items resell at', ['refurb_resale_pct'], '%', undefined, '% of the original price · assumption')}
        {row('Liquidation, Grade A', ['liquidation_pct', 'A'], '%', 'surplus', '% of the original price')}
        {row('Liquidation, Grade B', ['liquidation_pct', 'B'], '%', 'surplus')}
        {row('Liquidation, Grade C', ['liquidation_pct', 'C'], '%', undefined, 'Assumption: damaged stock')}
        {row('Liquidation, not graded yet', ['liquidation_pct', 'ungraded'], '%', 'surplus')}
        {row('Liquidation commission', ['liquidation_commission_pct'], '%', undefined, 'Assumption')}
        {row('Bulk freight per unit', ['liquidation_freight'], '₹', undefined, 'Assumption')}
      </Group>

      <Group title="Cleaning & repair prices">
        <p className="pb-1 pt-2 text-xs font-medium text-muted">Professional cleaning, per item</p>
        {CATEGORIES.filter((c) => c !== 'Footwear' && c !== 'Bags & accessories').map((c) => row(c, ['services', 'dry_clean', c], '₹', 'dryclean'))}
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Cobbler (shoes and bags)</p>
        {row('Cleaning & polish', ['services', 'shoe_clean'], '₹', 'shoe')}
        {row('Hard-stain removal (extra)', ['services', 'shoe_hard_stain'], '₹', 'shoe')}
        {row('Sole pasting', ['services', 'shoe_sole_paste'], '₹', 'shoe')}
        {row('Sole replacement', ['services', 'shoe_sole_replace'], '₹', 'shoe')}
        {row('Stitching work', ['services', 'shoe_stitch'], '₹', 'shoe')}
        {row('Patch work', ['services', 'shoe_patch'], '₹', 'shoe')}
        {row('Heel replacement', ['services', 'shoe_heel'], '₹', 'shoe')}
        {row('Colour change / restoration', ['services', 'shoe_colour'], '₹', 'shoe')}
        {row('Leather / upper replacement', ['services', 'shoe_leather_replace'], '₹', 'shoe')}
        {row('Replacement shoebox', ['services', 'shoe_box'], '₹', undefined, 'Assumption')}
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Tailor</p>
        {row('Small darn or patch', ['services', 'tailor_small_repair'], '₹', undefined, 'Assumption')}
        {row('Larger darn, patch or stitch repair', ['services', 'tailor_repair'], '₹', undefined, 'Assumption')}
        {row('Seam repair', ['services', 'seam_repair'], '₹', 'tailor')}
        {row('Zip replacement', ['services', 'zip_replace'], '₹', 'tailor')}
        {row('Zip & hardware replacement (major)', ['services', 'zip_replace_major'], '₹', 'tailor')}
      </Group>

      <Group title="Recycling">
        {row('Scrap value per kg', ['scrap_per_kg'], '₹', 'scrap')}
        {row('Transport per unit', ['recycle_transport'], '₹', undefined, 'Assumption')}
      </Group>

      <Group title="Packed weight per item">
        {CATEGORIES.map((c: Category) => row(c, ['weight_kg', c], 'kg', undefined, 'Assumption'))}
      </Group>

      <Group title="Sources and assumptions">
        <ul className="space-y-2 py-2 text-sm">
          {(Object.keys(RATE_SOURCES) as SourceKey[]).map((k) => (
            <li key={k}>
              <a href={RATE_SOURCES[k].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                {RATE_SOURCES[k].title} <ExternalLink className="size-3" />
              </a>
              <p className="text-xs text-muted">{RATE_SOURCES[k].used_for}</p>
            </li>
          ))}
        </ul>
        <p className="pt-2 text-xs font-medium">Assumptions (no public source — change them to your own figures)</p>
        <ul className="list-disc space-y-0.5 py-2 pl-4 text-xs text-muted">
          {ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
        </ul>
        <p className="pb-2 text-xs text-muted">Where a source gives a range, we use the cautious end (higher cost or lower price). Marketplace fees are set by the original price band.</p>
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

function NumRow({ label, hint, unit, value, def, source, onChange }: { label: string; hint?: string; unit: Unit; value: number; def: number; source?: SourceKey; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const changed = value !== def
  const id = `rate-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm">{label}</label>
        <p className="text-xs text-muted">
          {changed ? <>Default {unit === '₹' ? `₹${def}` : `${def}${unit === '%' ? '%' : ' kg'}`}</> : hint}
          {source && (
            <a href={RATE_SOURCES[source].url} target="_blank" rel="noreferrer" title={RATE_SOURCES[source].title} className={clsx('inline-flex items-center gap-0.5 text-brand-700 hover:underline', (changed || hint) && 'ml-1.5')}>
              source <ExternalLink className="size-2.5" />
            </a>
          )}
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
            unit === '₹' ? 'pl-7 pr-3' : 'pl-3 pr-8',
            changed ? 'border-brand-400' : 'border-line',
          )}
        />
        {unit !== '₹' && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{unit}</span>}
      </div>
    </div>
  )
}
