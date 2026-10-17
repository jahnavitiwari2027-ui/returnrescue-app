import { ArrowLeft, Camera, ChevronDown, ImageUp, Info, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CameraCapture, cameraSupported } from '../components/CameraCapture'
import { Alert, Button, Card, CardHeader, Field, Input, MoneyInput, PageHeader, Select, Spinner, Textarea } from '../components/ui'
import { LIMITS } from '../config'
import { usePhotoUrls, useWorkspace } from '../context/WorkspaceContext'
import { RepoError } from '../data/repo'
import { useRates } from '../data/rates'
import { validateImageFile } from '../lib/image'
import { estimateFromRates, estimateInputFor, isLocked, ratesPatch, saleOf, type SaleSetup } from '../lib/rates'
import { SaleSetupCard } from './SaleSetupCard'
import { ProductPicker } from './ProductPicker'
import { productToInput, skuKey } from '../data/products'
import {
  CATEGORIES,
  HYGIENE_SENSITIVE,
  RETURN_REASONS,
  emptyReturnInput,
  type Category,
  type ReturnInput,
  type RouteKey,
  type ValueBasis,
} from '../lib/types'

type NumKey =
  | 'original_price'
  | 'resale_price'
  | 'refurb_resale_price'
  | 'selling_fee_pct'
  | 'refurb_cost'
  | 'handling_cost'
  | 'liquidation_price'
  | 'liquidation_fee'
  | 'recycling_value'
  | 'recycling_cost'
  | 'return_shipping_cost'

type FormState = Omit<ReturnInput, NumKey> & Record<NumKey, string>

const NUM_KEYS: NumKey[] = [
  'original_price',
  'resale_price',
  'refurb_resale_price',
  'selling_fee_pct',
  'refurb_cost',
  'handling_cost',
  'liquidation_price',
  'liquidation_fee',
  'recycling_value',
  'recycling_cost',
  'return_shipping_cost',
]

function toForm(input: ReturnInput): FormState {
  const f = { ...input } as unknown as FormState
  for (const k of NUM_KEYS) f[k] = input[k] ? String(input[k]) : ''
  return f
}

const FIELD_ROUTE: Record<string, RouteKey> = {
  resale_price: 'restock',
  refurb_resale_price: 'refurbish',
  refurb_cost: 'refurbish',
  liquidation_price: 'liquidate',
  liquidation_fee: 'liquidate',
  recycling_value: 'recycle',
  recycling_cost: 'recycle',
}

const autoSku = () => `RR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

interface PendingPhoto {
  file: File
  preview: string
}

export default function ReturnFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const { repo, base, create, update, mode, isOwner, products, saveProduct, items } = useWorkspace()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(() => toForm(emptyReturnInput()))
  const [loaded, setLoaded] = useState(!editing)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [pending, setPending] = useState<PendingPhoto[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<{ text: string; limit?: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const existingUrls = usePhotoUrls(form.photos)
  const { rates, save: saveRates } = useRates()
  // The platform card: null until the seller changes something, so the saved or default setup shows.
  const [sale, setSale] = useState<SaleSetup | null>(null)
  const [saveDefault, setSaveDefault] = useState(false)
  const [saveAsProduct, setSaveAsProduct] = useState(false)
  const [updateProduct, setUpdateProduct] = useState(false)

  useEffect(() => {
    if (!id) return
    repo.get(id).then((item) => {
      if (item) setForm(toForm(item))
      else setSubmitError({ text: 'This return could not be found.' })
      setLoaded(true)
    })
  }, [id, repo])

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v }
      // Typing over a rate-card (or older AI) value makes it the user's own estimate.
      const key = FIELD_ROUTE[k as string] ?? (k === 'selling_fee_pct' || k === 'handling_cost' ? 'costs' : null)
      const b = key ? f.value_basis[key] : null
      if (key && b !== 'estimate' && b !== 'quote') next.value_basis = { ...f.value_basis, [key]: 'estimate' }
      return next
    })
    setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const setBasis = (route: RouteKey | 'costs', b: ValueBasis) => setForm((f) => ({ ...f, value_basis: { ...f.value_basis, [route]: b } }))

  const locked = isLocked(form)
  const shownSale = sale ?? saleOf(form.sale_setup, rates)
  const selected = products.find((p) => p.id === form.product_id) ?? null
  const skuMatch = !selected && form.sku.trim() ? products.find((p) => skuKey(p.sku) === skuKey(form.sku)) ?? null : null
  const pick = (p: (typeof products)[number] | null) => {
    if (!p) {
      setForm((f) => ({ ...f, product_id: null }))
      return
    }
    setForm((f) => ({ ...f, product_id: p.id, name: p.name, sku: p.sku, category: p.category, original_price: String(p.selling_price) }))
    setSale(p.sale_setup ?? rates.default_sale)
    setErrors((e) => ({ ...e, name: undefined, original_price: undefined, sku: undefined }))
  }
  // Another return already logged for the same order: worth a second look, never blocked.
  const orderClash = form.order_id?.trim()
    ? items.find((i) => i.id !== id && i.order_id && i.order_id.trim().toUpperCase() === form.order_id!.trim().toUpperCase())
    : undefined
  const photoCount = form.photos.length + pending.length
  const hygiene = HYGIENE_SENSITIVE.includes(form.category as Category)

  const softWarnings = useMemo(() => {
    const w: string[] = []
    const op = Number(form.original_price)
    if (op && Number(form.resale_price) > op) w.push('Resale estimate is higher than the original selling price.')
    if (Number(form.refurb_resale_price) && Number(form.resale_price) && Number(form.refurb_resale_price) > Number(form.resale_price))
      w.push('Price after refurbishment is higher than the as-is resale price — double-check.')
    return w
  }, [form.original_price, form.resale_price, form.refurb_resale_price])

  const openCamera = () => (cameraSupported() ? setCameraOpen(true) : cameraInput.current?.click())

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const errs: string[] = []
    const next: PendingPhoto[] = []
    for (const file of Array.from(files)) {
      if (photoCount + next.length >= LIMITS.maxPhotos) {
        errs.push(`Up to ${LIMITS.maxPhotos} photos per return.`)
        break
      }
      const err = validateImageFile(file)
      if (err) errs.push(err)
      else next.push({ file, preview: URL.createObjectURL(file) })
    }
    setPending((p) => [...p, ...next])
    setErrors((e) => ({ ...e, photos: errs.join(' ') || undefined }))
    if (fileInput.current) fileInput.current.value = ''
    if (cameraInput.current) cameraInput.current.value = ''
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Enter the product name.'
    else if (form.name.length > 200) e.name = 'Keep the name under 200 characters.'
    if (form.sku.trim() && !/^[A-Za-z0-9][A-Za-z0-9\-_./]{0,79}$/.test(form.sku.trim())) e.sku = 'Use letters, numbers, - _ . / only.'
    const op = Number(form.original_price)
    if (!form.original_price || !Number.isFinite(op) || op <= 0) e.original_price = 'Enter the original selling price (more than ₹0).'
    for (const k of NUM_KEYS) {
      if (k === 'original_price') continue
      const v = form[k]
      if (v === '') continue
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0) e[k] = 'Must be zero or more.'
      else if (n > 10_000_000) e[k] = 'That looks too large.'
    }
    if (Number(form.selling_fee_pct) > 100) e.selling_fee_pct = 'A fee can’t exceed 100%.'
    if (form.condition_notes.length > 2000) e.condition_notes = 'Keep notes under 2,000 characters.'
    if ((form.order_id ?? '').trim().length > 80) e.order_id = 'Keep the order ID under 80 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitError(null)
    if (!validate()) {
      setSubmitError({ text: 'Please fix the highlighted fields.' })
      return
    }
    setSaving(true)
    try {
      if (saveDefault && !locked && isOwner) await saveRates({ ...rates, default_sale: shownSale })
      // Link to the product list: a typed SKU that's already there, or a new product saved from this return.
      let productId = form.product_id ?? skuMatch?.id ?? null
      const sku = (form.sku.trim() || autoSku()).toUpperCase()
      if (isOwner && !productId && saveAsProduct) {
        const created = await saveProduct({ sku, name: form.name.trim(), category: form.category, selling_price: Math.round(Number(form.original_price) * 100) / 100, mrp: null, sale_setup: shownSale, notes: '' })
        productId = created.id
        // If saving the return fails below, a retry links to this product instead of adding it twice.
        setForm((f) => ({ ...f, product_id: created.id, sku: created.sku }))
        setSaveAsProduct(false)
      }
      if (isOwner && selected && updateProduct) await saveProduct({ ...productToInput(selected), sale_setup: shownSale }, selected.id)
      const uploaded: string[] = []
      for (const p of pending) uploaded.push(await repo.uploadPhoto(p.file))
      const payload: ReturnInput = {
        ...(form as unknown as ReturnInput),
        name: form.name.trim(),
        sku,
        product_id: productId,
        order_id: form.order_id?.trim() || null,
        seal_intact: hygiene ? form.seal_intact : false,
        photos: [...form.photos, ...uploaded],
        // New returns always record their platform; edits only when the seller changed it.
        sale_setup: locked ? form.sale_setup : editing && !sale ? form.sale_setup : shownSale,
      }
      for (const k of NUM_KEYS) payload[k] = form[k] === '' ? 0 : Math.round(Number(form[k]) * 100) / 100
      // Staff logging a product that isn't in the list: ask ops to add it.
      if (!editing && !isOwner && !productId && products.length) {
        payload.flag_note = `Not in the product list — please add SKU ${sku} or link the right product.`
        payload.flagged_at = new Date().toISOString()
      }
      // Routes on the rate card (and blank ones) are priced from the rates, using the
      // current category, price, grade and defects. User estimates and quotes stay as entered.
      Object.assign(payload, ratesPatch(payload, estimateFromRates(estimateInputFor(payload), rates)))
      let savedId = id
      if (editing && id) {
        const { photos, ...rest } = payload
        const patch: Partial<ReturnInput> = { photos }
        for (const k of [
          'name', 'sku', 'category', 'original_price', 'return_reason', 'condition_notes', 'seal_intact', 'product_id', 'order_id',
          ...NUM_KEYS, 'value_basis', ...(sale && !locked ? (['sale_setup'] as const) : []),
        ] as const) {
          ;(patch as Record<string, unknown>)[k] = (rest as Record<string, unknown>)[k]
        }
        await update(id, patch)
        if (removed.length) await repo.removePhotos(removed).catch(() => undefined)
      } else {
        const created = await create(payload)
        savedId = created.id
      }
      navigate(`${base}/returns/${savedId}${editing ? '' : '?new=1'}`)
    } catch (e) {
      const limit = e instanceof RepoError && e.code === 'FREE_PLAN_LIMIT'
      setSubmitError({ text: (e as Error).message, limit })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <Spinner />
  if (!isOwner && editing && locked) {
    return (
      <Alert tone="info" title="This return has a saved decision">
        Only your brand’s owner or ops team can change it now. <Link to={`${base}/returns/${id}`} className="font-medium underline">Back to the return</Link>
      </Alert>
    )
  }

  const num = (k: NumKey, label: string, hint?: string, money = true) => (
    <Field label={label} hint={hint} error={errors[k]} required={k === 'original_price'}>
      {(fid, desc) =>
        money ? (
          <MoneyInput id={fid} aria-describedby={desc} value={form[k]} onChange={(e) => set(k, e.target.value)} invalid={!!errors[k]} placeholder="0" />
        ) : (
          <div className="relative">
            <Input id={fid} aria-describedby={desc} type="number" inputMode="decimal" min={0} max={100} step="0.5" value={form[k]} onChange={(e) => set(k, e.target.value)} invalid={!!errors[k]} placeholder="0" className="pr-8 tabular" />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">%</span>
          </div>
        )
      }
    </Field>
  )

  const basisToggle = (route: RouteKey | 'costs') => {
    const current: ValueBasis = form.value_basis[route] ?? 'rates'
    const options: ValueBasis[] = route === 'costs' ? ['rates', 'estimate'] : ['rates', 'estimate', 'quote']
    if (current === 'ai') options.unshift('ai')
    return (
      <div className="flex rounded-lg bg-paper-2 p-0.5 text-xs" role="radiogroup" aria-label="Where this value comes from">
        {options.map((b) => (
          <button
            type="button"
            key={b}
            role="radio"
            aria-checked={current === b}
            onClick={() => setBasis(route, b)}
            className={`rounded-md px-2 py-1 font-medium transition ${current === b ? 'bg-white shadow-sm' : 'text-muted'}`}
          >
            {b === 'rates' ? 'Rate card' : b === 'estimate' ? 'My price' : b === 'quote' ? 'Quote' : 'Old AI value'}
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <Link to={editing ? `${base}/returns/${id}` : `${base}/returns`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {editing ? 'Back to return' : 'Back to returns'}
      </Link>
      <PageHeader
        title={editing ? 'Edit return' : 'Add a return'}
        subtitle={editing ? 'Update product details, photos or recovery estimates.' : 'Just a photo, name, category and price. The AI finds the defects and your rate card prices each option.'}
      />

      <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Product" subtitle={products.length ? 'Pick it from your products, or type the details.' : undefined} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {products.length > 0 && (
                <div className="sm:col-span-2">
                  <ProductPicker products={products} selected={selected} onPick={pick} />
                  {skuMatch && <p className="mt-2 text-xs text-brand-800">SKU {skuMatch.sku} is in your products ({skuMatch.name}) — this return will be linked to it.</p>}
                </div>
              )}
              <Field label="Product name" error={errors.name} required className="sm:col-span-2">
                {(fid, d) => <Input id={fid} aria-describedby={d} value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="e.g. Classic white cotton shirt" />}
              </Field>
              <Field label="Category" required>
                {(fid) => (
                  <Select id={fid} value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                )}
              </Field>
              {num('original_price', 'Original selling price', selected ? 'From the product. Change it if this customer paid a different price.' : 'What the customer paid (per unit).')}
              <Field label="SKU" error={errors.sku} hint={selected ? 'From the product.' : 'Leave blank to auto-generate one.'}>
                {(fid, d) => <Input id={fid} aria-describedby={d} value={form.sku} onChange={(e) => set('sku', e.target.value)} invalid={!!errors.sku} placeholder="e.g. TOP-WHT-M-001" className="font-mono uppercase" />}
              </Field>
              <Field label="Order ID (optional)" error={errors.order_id} hint={orderClash ? undefined : 'Date, time and who logged it are recorded automatically.'}>
                {(fid, d) => <Input id={fid} aria-describedby={d} value={form.order_id ?? ''} onChange={(e) => set('order_id', e.target.value)} invalid={!!errors.order_id} placeholder="e.g. 408-1234567-1234567" className="font-mono" />}
              </Field>
              {orderClash && (
                <p className="text-xs text-amber-800 sm:col-span-2" role="status">
                  Order {orderClash.order_id} already has a return logged ({orderClash.name}). Check this isn’t a duplicate.
                </p>
              )}
              {isOwner && !selected && !skuMatch && !editing && (
                <label className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-2.5 text-sm sm:col-span-2">
                  <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={saveAsProduct} onChange={(e) => setSaveAsProduct(e.target.checked)} />
                  <span>
                    Save to my product list with these settings
                    <span className="block text-xs text-muted">Next time, pick it from your products and the name, price, platform, GST and delivery fill in with one tap.</span>
                  </span>
                </label>
              )}
              {!isOwner && !selected && !skuMatch && products.length > 0 && !editing && (
                <p className="text-xs text-muted sm:col-span-2">Can’t find the product? Type the details — the return is flagged so ops can add it to the list.</p>
              )}
            </div>
          </Card>

          {!locked && (
            <SaleSetupCard
              category={form.category}
              price={Number(form.original_price) || 0}
              sale={shownSale}
              rates={rates}
              onChange={setSale}
              saveDefault={saveDefault}
              onSaveDefault={isOwner ? setSaveDefault : undefined}
              ownCosts={form.value_basis.costs === 'estimate'}
              locked={!isOwner}
              extra={
                isOwner && selected ? (
                  <label className="flex items-start gap-2.5 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={updateProduct} onChange={(e) => setUpdateProduct(e.target.checked)} />
                    <span>
                      Save these settings to {selected.sku}
                      <span className="block text-xs text-muted">Future returns of this product start with this platform, GST and delivery.</span>
                    </span>
                  </label>
                ) : undefined
              }
            />
          )}

          <Card>
            <details open={editing} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-[15px] font-semibold">More details <span className="font-normal text-muted">(optional)</span></span>
                <span className="block text-sm text-muted">Return reason, notes for the AI, return shipping.</span>
              </span>
              <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
              <Field label="Return reason" required>
                {(fid) => (
                  <Select id={fid} value={form.return_reason} onChange={(e) => set('return_reason', e.target.value)}>
                    {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </Select>
                )}
              </Field>
              {hygiene && (
                <div className="flex items-end">
                  <label className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={form.seal_intact} onChange={(e) => set('seal_intact', e.target.checked)} />
                    <span>
                      Hygiene seal confirmed intact
                      <span className="block text-xs text-muted">Required before restock or refurbish for this category.</span>
                    </span>
                  </label>
                </div>
              )}
              <Field label="Condition notes" hint="What the customer said and what your team noticed. The AI reads this alongside the photos." error={errors.condition_notes} className="sm:col-span-2">
                {(fid, d) => <Textarea id={fid} aria-describedby={d} value={form.condition_notes} onChange={(e) => set('condition_notes', e.target.value)} invalid={!!errors.condition_notes} placeholder="e.g. Tags attached, small mark near the cuff, box slightly dented." />}
              </Field>
              {num('return_shipping_cost', 'Return shipping already paid', 'Sunk cost — shown for P&L, excluded from the decision.')}
            </div>
            </details>
          </Card>

          {isOwner && (
          <Card>
            <details open={editing} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-[15px] font-semibold">Recovery estimates <span className="font-normal text-muted">(optional)</span></span>
                <span className="block text-sm text-muted">Filled from <Link to={`${base}/rates`} className="text-brand-700 underline">your rate card</Link> using the grade and defects found. Type your own price or a quote to override any of them.</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-line p-5">
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-semibold sm:col-span-2">
                  Selling costs (restock and refurbish) {basisToggle('costs')}
                </legend>
                {num('selling_fee_pct', 'Fees & GST on the sale', 'Marketplace or gateway fees plus the GST share of the price, as % of what the customer pays.', false)}
                {num('handling_cost', 'Handling & shipping per order', 'Shipping, closing fee, pick & pack and packing materials.')}
              </fieldset>
              <hr className="border-line" />
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-semibold sm:col-span-2">
                  Restock & resell as-is {basisToggle('restock')}
                </legend>
                {num('resale_price', 'Resale price')}
              </fieldset>
              <hr className="border-line" />
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-semibold sm:col-span-2">
                  Repackage / refurbish {basisToggle('refurbish')}
                </legend>
                {num('refurb_resale_price', 'Resale price after repair')}
                {num('refurb_cost', 'Repair & repackaging cost')}
              </fieldset>
              <hr className="border-line" />
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-semibold sm:col-span-2">
                  Liquidate {basisToggle('liquidate')}
                </legend>
                {num('liquidation_price', 'Liquidation price', 'What a liquidator / off-price buyer pays.')}
                {num('liquidation_fee', 'Commission & bulk freight', 'Sold in bulk, so no per-order shipping.')}
              </fieldset>
              <hr className="border-line" />
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-semibold sm:col-span-2">
                  Recycle / dispose {basisToggle('recycle')}
                </legend>
                {num('recycling_value', 'Scrap value')}
                {num('recycling_cost', 'Sorting & transport', 'All-in, including pickup.')}
              </fieldset>
              {softWarnings.map((w) => (
                <Alert key={w} tone="warning" icon={<Info className="size-4" />}>{w}</Alert>
              ))}
            </div>
            </details>
          </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-6">
            <CardHeader title="Photos" subtitle={`Up to ${LIMITS.maxPhotos}. Good light, each side, labels and any damage. For shoes, show the pair and the soles.`} />
            <div className="p-5">
              <div className="grid grid-cols-2 gap-2">
                {form.photos.map((ref) => (
                  <PhotoTile
                    key={ref}
                    src={existingUrls[ref]}
                    onRemove={() => {
                      set('photos', form.photos.filter((p) => p !== ref))
                      if (mode === 'account') setRemoved((r) => [...r, ref])
                    }}
                  />
                ))}
                {pending.map((p) => (
                  <PhotoTile
                    key={p.preview}
                    src={p.preview}
                    pending
                    onRemove={() => {
                      URL.revokeObjectURL(p.preview)
                      setPending((xs) => xs.filter((x) => x !== p))
                    }}
                  />
                ))}
                {photoCount < LIMITS.maxPhotos && (
                  <div className="grid aspect-square grid-rows-2 overflow-hidden rounded-xl border-2 border-dashed border-line text-sm">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex items-center justify-center gap-2 font-medium text-brand-800 transition hover:bg-brand-50"
                    >
                      <Camera className="size-4" /> Take photo
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="flex items-center justify-center gap-2 border-t-2 border-dashed border-line text-muted transition hover:bg-paper hover:text-ink"
                    >
                      <ImageUp className="size-4" /> Upload
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                aria-label="Upload product photos"
                onChange={(e) => addFiles(e.target.files)}
              />
              <input
                ref={cameraInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => addFiles(e.target.files)}
              />
              <CameraCapture
                open={cameraOpen}
                remaining={LIMITS.maxPhotos - photoCount}
                onCapture={(file) => addFiles([file])}
                onClose={() => setCameraOpen(false)}
                onFallback={(kind) => {
                  setCameraOpen(false)
                  ;(kind === 'camera' ? cameraInput : fileInput).current?.click()
                }}
              />
              {errors.photos && <p className="mt-2 text-xs font-medium text-red-700" role="alert">{errors.photos}</p>}
              <p className="mt-3 text-xs text-muted">
                {mode === 'demo'
                  ? 'Demo photos are downscaled and kept in this browser only.'
                  : 'Photos are stored privately in your workspace.'}
              </p>
            </div>
            <div className="space-y-3 border-t border-line p-5">
              {submitError && (
                <Alert tone="error">
                  {submitError.text}{' '}
                  {submitError.limit && <Link to={`${base}/billing`} className="font-semibold underline">Upgrade to Pro</Link>}
                </Alert>
              )}
              <Button type="submit" size="lg" className="w-full" loading={saving}>
                {editing ? 'Save changes' : 'Save return'}
              </Button>
              <p className="text-center text-xs text-muted">{editing ? 'Recorded decisions keep the values they were made with.' : 'AI inspection starts automatically after saving.'}</p>
            </div>
          </Card>
        </div>
      </form>
    </>
  )
}

function PhotoTile({ src, onRemove, pending }: { src?: string; onRemove: () => void; pending?: boolean }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-paper-2">
      {src ? <img src={src} alt="Return photo" className="size-full object-cover" /> : <Spinner label="" className="m-auto mt-10" />}
      {pending && <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white">New</span>}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-ink shadow-sm hover:bg-white hover:text-red-700"
        aria-label="Remove photo"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}
