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
  RANGE_POLICY,
  RATE_SOURCES,
  RATES_CHECKED_ON,
  PLATFORM_LABEL,
  PLATFORMS,
  ratesPatch,
  type PlatformKey,
  type RateCard,
  type SourceKey,
} from '../lib/rates'
import { learnFromResults, MIN_RESULTS } from '../lib/learn'
import { CATEGORIES, type Category } from '../lib/types'

const PLATFORM_HINT: Record<PlatformKey, string> = {
  amazon: 'Referral + closing fee, Easy Ship',
  flipkart: '0% fashion commission + fixed fee',
  meesho: '0% commission, shipping deducted',
  own_site: 'Payment gateway + courier',
}

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

  const learned = useMemo(() => learnFromResults(items, draft), [items, draft])
  const ds = draft.default_sale
  const savedChoices = [
    ds.gst_pct !== undefined && `GST ${ds.gst_pct}%`,
    ds.commission_pct !== undefined && `fee ${ds.commission_pct}%`,
    ds.fixed_fee !== undefined && `fixed fee ₹${ds.fixed_fee}`,
    ds.delivery_custom !== undefined ? `delivery ₹${ds.delivery_custom}` : ds.delivery && 'a delivery option',
  ].filter(Boolean) as string[]

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
      setMsg({ tone: 'success', text: `Updated ${open.length} open return${open.length === 1 ? '' : 's'}. Saved decisions were left as they are.` })
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

      <Group title="Where you usually sell" open>
        <p className="pt-2 text-xs text-muted">New returns start with this platform. You can pick a different one on each return.</p>
        <div className="grid grid-cols-2 gap-2 py-2" role="radiogroup" aria-label="Default platform">
          {PLATFORMS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={ds.platform === v}
              onClick={() => setDraft((x) => ({ ...x, default_sale: x.default_sale.platform === v ? x.default_sale : { platform: v } }))}
              className={clsx('rounded-xl border px-3 py-2.5 text-left', ds.platform === v ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line')}
            >
              <span className="block text-sm font-medium">{PLATFORM_LABEL[v]}</span>
              <span className="block text-xs text-muted">{PLATFORM_HINT[v]}</span>
            </button>
          ))}
        </div>
        {savedChoices.length > 0 && (
          <div className="flex items-center justify-between gap-3 py-2.5 text-xs">
            <span className="text-ink-2">Saved with it: {savedChoices.join(', ')}.</span>
            <button type="button" className="shrink-0 font-medium text-brand-700 hover:underline" onClick={() => setDraft((x) => ({ ...x, default_sale: { platform: x.default_sale.platform } }))}>
              Clear
            </button>
          </div>
        )}
        {row('GST on fees', ['gst_on_fees_pct'], '%', 'amazon_fees', 'Charged by every platform and courier')}
      </Group>

      <Group title="Amazon.in fees">
        {row('No referral fee up to', ['fee_free_up_to'], '₹', 'amazon_fees')}
        {CATEGORIES.map((c) => row(`${c} referral fee`, ['referral_pct', c], '%', 'amazon_fees'))}
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Easy Ship closing fee, by price</p>
        {row('Up to ₹300', ['amazon_closing_fee', 'up_to_300'], '₹', 'amazon_2026')}
        {row('₹301 – 500', ['amazon_closing_fee', 'up_to_500'], '₹', 'amazon_2026')}
        {row('₹501 – 1,000', ['amazon_closing_fee', 'up_to_1000'], '₹', 'amazon_2026')}
        {row('Above ₹1,000', ['amazon_closing_fee', 'above_1000'], '₹', 'amazon_2026')}
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Easy Ship weight handling</p>
        {row('Up to 500 g', ['amazon_weight_handling', 'up_to_500g'], '₹', 'amazon_2026')}
        {row('500 g – 1 kg', ['amazon_weight_handling', 'up_to_1kg'], '₹', 'amazon_2026')}
        {row('1 – 2 kg', ['amazon_weight_handling', 'up_to_2kg'], '₹', 'amazon_2026')}
        {row('Each extra kg', ['amazon_weight_handling', 'per_extra_kg'], '₹', 'amazon_2026')}
      </Group>

      <Group title="Flipkart fees">
        {row('Commission on fashion', ['flipkart_commission_pct'], '%', 'flipkart')}
        {row('Fixed fee per order', ['flipkart_fixed_fee'], '₹', 'flipkart_fixed', 'Midpoint of ₹8–35 · assumption')}
        {row('Shipping, local or zonal, under 500 g', ['flipkart_shipping', 'local_zonal_500g'], '₹', 'flipkart')}
        {row('Shipping, national, under 500 g', ['flipkart_shipping', 'national_500g'], '₹', 'flipkart_ship')}
        <p className="py-2.5 text-xs text-muted">Flipkart shows your exact fixed and shipping fees in Seller Hub; copy them here. Parcels over 500 g use the courier rate below.</p>
      </Group>

      <Group title="Meesho fees">
        {row('Commission', ['meesho_commission_pct'], '%', 'meesho')}
        <p className="pb-1 pt-3 text-xs font-medium text-muted">Shipping deducted from your payout (midpoints of seller-reported ranges)</p>
        {(['500g', '1kg', '2kg'] as const).flatMap((b) =>
          (['local', 'regional', 'national'] as const).map((z) =>
            row(`${z[0].toUpperCase()}${z.slice(1)}, ${b === '500g' ? 'under 500 g' : b === '1kg' ? '500 g – 1 kg' : '1 – 2 kg'}`, ['meesho_shipping', `${z}_${b}`], '₹', 'meesho'),
          ),
        )}
      </Group>

      <Group title="Your own website">
        {row('Payment gateway fee', ['payment_gateway_pct'], '%', 'gateway')}
        {row('Courier, first 500 g', ['courier_first_500g'], '₹', 'courier', 'Shiprocket free-plan average')}
        {row('Courier, each extra 500 g', ['courier_extra_500g'], '₹', undefined, 'Assumption')}
      </Group>

      <Group title="GST">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm">GST-registered business</p>
            <p className="text-xs text-muted">Registered: GST on the sale is deducted and GST on fees is claimed back. Not registered: GST on fees is a cost.</p>
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
        {row('Clothing & footwear GST up to the threshold', ['goods_gst_low_pct'], '%', 'gst_goods')}
        {row('Threshold per piece or pair', ['goods_gst_threshold'], '₹', 'gst_goods')}
        {row('Clothing & footwear GST above it', ['goods_gst_high_pct'], '%', 'gst_goods')}
        {row('Bags & accessories GST', ['bags_gst_pct'], '%', undefined, 'Assumption: check your HSN code')}
      </Group>

      <Group title="Packing & labour">
        {row('Packing materials per unit', ['packing_materials'], '₹', undefined, 'Assumption')}
        {row('Labour per hour', ['labour_per_hour'], '₹', 'wage', '₹710/day ÷ 8 h + 16.25% employer PF & ESI')}
      </Group>

      <Group title="Resale & liquidation">
        {row('Repaired items resell at', ['refurb_resale_pct'], '%', 'bgrade', '% of the original price')}
        {row('Liquidation, Grade A', ['liquidation_pct', 'A'], '%', 'surplus', '% of the original price, before GST')}
        {row('Liquidation, Grade B', ['liquidation_pct', 'B'], '%', undefined, 'Assumption')}
        {row('Liquidation, Grade C', ['liquidation_pct', 'C'], '%', undefined, 'Assumption: damaged stock')}
        {row('Liquidation, not graded yet', ['liquidation_pct', 'ungraded'], '%', undefined, 'Assumption')}
        {row('Liquidation commission', ['liquidation_commission_pct'], '%', undefined, 'Assumption')}
        {row('Bulk freight per unit', ['liquidation_freight'], '₹', undefined, 'Assumption')}
        <p className="py-2.5 text-xs text-muted">
          Market check: Delhi surplus-clothing listings ask ₹50–490 a piece (median ₹109).{' '}
          <a href={RATE_SOURCES.surplus_delhi.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">IndiaMART</a>
        </p>
      </Group>

      <Group title="From your own results" open={learned.some((l) => l.suggested != null)}>
        {learned.length === 0 ? (
          <p className="py-2.5 text-xs text-muted">
            Once {MIN_RESULTS} returns on a route are marked sold with the amount received, the median of what you actually got appears here as a suggested rate. Sample returns don’t count.
          </p>
        ) : (
          learned.map((l) => (
            <div key={l.path.join('.')} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm">{l.label}</p>
                <p className="text-xs text-muted">
                  {l.suggested != null
                    ? `Median of your ${l.n} completed sales: ${l.suggested}% of the original price (now ${l.current}%).`
                    : `${l.n} of ${MIN_RESULTS} completed sales needed before suggesting a rate.`}
                </p>
              </div>
              {l.suggested != null && l.suggested !== l.current && (
                <Button size="sm" variant="secondary" onClick={() => setDraft((d) => setAt(d, l.path, l.suggested!))}>
                  Use {l.suggested}%
                </Button>
              )}
            </div>
          ))
        )}
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
        {row('Small tear or damage repair', ['services', 'tailor_small_repair'], '₹', 'tailor_delhi', 'Starting price in Delhi')}
        {row('Larger darn or re-stitch', ['services', 'tailor_repair'], '₹', 'tailor_delhi', 'Starting price in Delhi')}
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
                {RATE_SOURCES[k].publisher} — {RATE_SOURCES[k].title} <ExternalLink className="size-3" />
              </a>
              <p className="text-xs text-muted">{RATE_SOURCES[k].used_for} {RATE_SOURCES[k].effective}.</p>
            </li>
          ))}
        </ul>
        <p className="pt-2 text-xs font-medium">Assumptions (no public source — change them to your own figures)</p>
        <ul className="list-disc space-y-0.5 py-2 pl-4 text-xs text-muted">
          {ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
        </ul>
        <p className="pb-2 text-xs text-muted">{RANGE_POLICY} Fee and GST bands are set by the original price.</p>
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
