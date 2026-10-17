import clsx from 'clsx'
import { ExternalLink, Info } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Card, CardHeader } from '../components/ui'
import { inr } from '../lib/format'
import {
  feeSummary,
  GST_CHOICES,
  PLATFORM_LABEL,
  PLATFORMS,
  platformFees,
  RATE_SOURCES,
  type InputKind,
  type PlatformKey,
  type RateCard,
  type SaleSetup,
  type SourceKey,
} from '../lib/rates'
import type { Category } from '../lib/types'

const CUSTOM = 'custom'

/** Short fee text for a platform when there's no price yet. */
function genericHint(p: PlatformKey, r: RateCard, category: Category) {
  if (p === 'amazon') {
    const c = r.amazon_closing_fee
    return `Referral ${r.referral_pct[category]}% above ₹${r.fee_free_up_to.toLocaleString('en-IN')} · closing ₹${c.up_to_300}–${c.above_1000} · shipping from ₹${r.amazon_weight_handling.up_to_500g}`
  }
  if (p === 'flipkart') return `${r.flipkart_commission_pct}% fashion commission · fixed fee ~₹${r.flipkart_fixed_fee} · shipping from ₹${r.flipkart_shipping.local_zonal_500g}`
  if (p === 'meesho') return `${r.meesho_commission_pct}% commission · shipping ₹${r.meesho_shipping.local_500g}–${r.meesho_shipping.national_2kg} deducted`
  return `${r.payment_gateway_pct}% payment gateway · courier from ₹${r.courier_first_500g}`
}

/** "Where it will sell" on the add/edit return form. */
export function SaleSetupCard({
  category,
  price,
  sale,
  rates,
  onChange,
  saveDefault,
  onSaveDefault,
  ownCosts,
  locked,
  bare,
  extra,
}: {
  category: Category
  price: number
  sale: SaleSetup
  rates: RateCard
  onChange: (s: SaleSetup) => void
  saveDefault?: boolean
  /** Shows "Save as my default" when given. */
  onSaveDefault?: (v: boolean) => void
  /** The seller typed their own selling costs, which take priority over these fees. */
  ownCosts?: boolean
  /** Warehouse staff: pick the platform only; GST, fees and delivery are set by ops. */
  locked?: boolean
  /** Without the card frame (inside a dialog). */
  bare?: boolean
  /** Extra controls shown before "Save as my default". */
  extra?: ReactNode
}) {
  const op = price > 0 ? price : 0
  const f = platformFees(category, op, sale, rates)
  const feesSet = sale.commission_pct !== undefined || sale.fixed_fee !== undefined
  const set = (patch: Partial<SaleSetup>, drop: (keyof SaleSetup)[] = []) => {
    const next = { ...sale, ...patch }
    for (const k of drop) delete next[k]
    onChange(next)
  }

  const body = (
      <div className={bare ? 'space-y-5' : 'space-y-5 p-5'}>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Platform">
          {PLATFORMS.map((p) => {
            const on = sale.platform === p
            const s = op ? feeSummary(category, op, p === sale.platform ? sale : { platform: p }, rates) : null
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => !on && onChange({ platform: p, ...(sale.gst_pct !== undefined ? { gst_pct: sale.gst_pct } : {}) })}
                className={clsx('rounded-xl border px-3 py-2.5 text-left transition', on ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line hover:border-ink/25')}
              >
                <span className="block text-sm font-medium">{PLATFORM_LABEL[p]}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                  {s ? `≈ ${inr(s.fees)} fees + ${inr(s.delivery)} delivery on this item` : genericHint(p, rates, category)}
                </span>
              </button>
            )
          })}
        </div>

        <Row
          title="GST on the sale"
          value={`${f.gst.pct}%`}
          detail={
            f.gst.set
              ? `Set by you (automatic: ${f.gst.auto}%)`
              : !rates.gst_registered
                ? 'Not GST-registered (change this on your rate card)'
                : category === 'Bags & accessories'
                  ? 'Bags & accessories rate — check your HSN code'
                  : `Clothing & footwear: ${rates.goods_gst_low_pct}% up to ₹${rates.goods_gst_threshold.toLocaleString('en-IN')}, ${rates.goods_gst_high_pct}% above`
          }
          meta={f.gst.set ? undefined : f.gst.meta}
          check={locked ? undefined : { label: 'Set GST myself', checked: f.gst.set, onChange: (v) => (v ? set({ gst_pct: f.gst.auto }) : set({}, ['gst_pct'])) }}
        >
          {f.gst.set && !locked && (
            <div className="flex gap-1.5" role="radiogroup" aria-label="GST rate">
              {GST_CHOICES.map((g) => (
                <Chip key={g} on={sale.gst_pct === g} onClick={() => set({ gst_pct: g })}>{g}%</Chip>
              ))}
            </div>
          )}
        </Row>

        <Row
          title={sale.platform === 'own_site' ? 'Payment fees' : 'Commission & fixed fee'}
          value={`${f.commission.pct}%${f.fixed ? ` + ${inr(f.fixed.amount)}` : ''}`}
          detail={op ? `${f.commission.label}${f.fixed ? ` · ${f.fixed.label}` : ''}` : 'Enter the price to work these out'}
          meta={feesSet ? undefined : f.fixed && f.fixed.meta.kind === 'assumption' ? f.fixed.meta : f.commission.meta}
          check={
            locked
              ? undefined
              : {
                  label: 'Enter fees myself',
                  checked: feesSet,
                  onChange: (v) => (v ? set({ commission_pct: f.commission.auto, fixed_fee: f.fixed?.auto ?? 0 }) : set({}, ['commission_pct', 'fixed_fee'])),
                }
          }
        >
          {feesSet && !locked && (
            <div className="grid grid-cols-2 gap-3">
              <NumBox label={sale.platform === 'own_site' ? 'Gateway fee' : 'Commission'} unit="%" max={100} value={sale.commission_pct ?? 0} onChange={(n) => set({ commission_pct: n })} />
              <NumBox label={sale.platform === 'amazon' ? 'Closing fee' : 'Fixed fee per order'} unit="₹" max={100_000} value={sale.fixed_fee ?? 0} onChange={(n) => set({ fixed_fee: n })} />
            </div>
          )}
        </Row>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">Delivery</p>
            <p className="whitespace-nowrap text-sm font-semibold tabular">{inr(f.delivery.amount)}</p>
          </div>
          {locked ? (
            <p className="mt-0.5 text-xs text-muted">{f.delivery.label}</p>
          ) : (
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Delivery charge">
            {f.delivery.presets.map((d) => (
              <Chip key={d.id} on={f.delivery.chosen === d.id} onClick={() => set({ delivery: d.id }, ['delivery_custom'])}>
                {d.label} · {inr(d.amount)}
                {d.id === f.delivery.auto && <span className="ml-1 text-muted">(by weight)</span>}
              </Chip>
            ))}
            <Chip on={f.delivery.chosen === CUSTOM} onClick={() => set({ delivery_custom: f.delivery.amount }, ['delivery'])}>
              Custom
            </Chip>
          </div>
          )}
          {f.delivery.chosen === CUSTOM && !locked && (
            <div className="mt-2 w-40">
              <NumBox label="Your delivery charge" unit="₹" max={100_000} value={sale.delivery_custom ?? 0} onChange={(n) => set({ delivery_custom: n })} />
            </div>
          )}
          <Meta meta={f.delivery.chosen === CUSTOM ? undefined : f.delivery.meta} className="mt-1.5" />
        </div>

        {ownCosts && (
          <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            <Info className="mt-0.5 size-3.5 shrink-0" /> You typed your own selling costs under Recovery estimates, so those are used instead. Switch them back to “Rate card” to use these fees.
          </p>
        )}

        {extra}

        {onSaveDefault && !locked && (
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={!!saveDefault} onChange={(e) => onSaveDefault(e.target.checked)} />
            <span>
              Save as my default for new returns
              <span className="block text-xs text-muted">Keeps this platform and anything you set above. Change it any time on your rate card.</span>
            </span>
          </label>
        )}
      </div>
  )
  if (bare) return body
  return (
    <Card>
      <CardHeader
        title="Where it will sell"
        subtitle={locked ? 'Pick the platform this order came from. GST, fees and delivery are set by your ops team.' : 'Fees, GST and delivery are worked out for this platform. Tick a box to set any of them yourself.'}
      />
      {body}
    </Card>
  )
}

function Row({ title, value, detail, meta, check, children }: { title: string; value: string; detail: string; meta?: { kind: InputKind; source?: SourceKey }; check?: { label: string; checked: boolean; onChange: (v: boolean) => void }; children?: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="whitespace-nowrap text-sm font-semibold tabular">{value}</p>
      </div>
      <p className="mt-0.5 text-xs text-muted">{detail}</p>
      <Meta meta={meta} />
      {check && (
        <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-ink-2">
          <input type="checkbox" className="size-3.5 accent-brand-700" checked={check.checked} onChange={(e) => check.onChange(e.target.checked)} />
          {check.label}
        </label>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}

function Meta({ meta, className }: { meta?: { kind: InputKind; source?: SourceKey }; className?: string }) {
  if (!meta || (!meta.source && meta.kind !== 'assumption')) return null
  return (
    <p className={clsx('text-[11px] text-muted', className)}>
      {meta.source && (
        <a href={RATE_SOURCES[meta.source].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand-700 hover:underline">
          {RATE_SOURCES[meta.source].publisher.replace(/ \(.*\)$/, '')} <ExternalLink className="size-2.5" />
        </a>
      )}
      {meta.kind === 'assumption' && <span className={clsx('rounded bg-paper-2 px-1 text-[10px]', meta.source && 'ml-1')}>assumption</span>}
      {meta.kind === 'business' && <span className="rounded bg-brand-50 px-1 text-[10px] text-brand-800">your rate card</span>}
    </p>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={clsx('rounded-lg border px-2.5 py-1.5 text-left text-xs transition', on ? 'border-brand-600 bg-brand-50 font-medium text-brand-900' : 'border-line text-ink-2 hover:border-ink/25')}
    >
      {children}
    </button>
  )
}

function NumBox({ label, unit, value, max, onChange }: { label: string; unit: '₹' | '%'; value: number; max: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText((t) => (Number(t) === value ? t : String(value))), [value])
  const id = `sale-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">{label}</label>
      <div className="relative">
        {unit === '₹' && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">₹</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step="any"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value === '') onChange(0)
            else if (Number.isFinite(n) && n >= 0 && n <= max) onChange(Math.round(n * 100) / 100)
          }}
          onBlur={() => setText(String(value))}
          className={clsx('h-10 w-full rounded-xl border border-line bg-white text-right text-sm tabular outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20', unit === '₹' ? 'pl-7 pr-3' : 'pl-3 pr-8')}
        />
        {unit === '%' && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">%</span>}
      </div>
    </div>
  )
}
