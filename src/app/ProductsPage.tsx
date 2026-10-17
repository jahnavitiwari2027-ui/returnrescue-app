import { Download, FileUp, PackagePlus, Search, Tags, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Textarea } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { productToInput as toInput, skuKey } from '../data/products'
import { useRates } from '../data/rates'
import { downloadBlob } from '../lib/csv'
import { inr } from '../lib/format'
import { parseCsv, parseProductSheet, templateCsv, type ParsedSheet } from '../lib/productImport'
import { PLATFORM_LABEL, saleOf } from '../lib/rates'
import { CATEGORIES, type Category, type ProductInput } from '../lib/types'
import { SaleSetupCard } from './SaleSetupCard'

const blank = (): ProductInput => ({
  sku: '',
  name: '',
  category: 'Topwear',
  mrp: null,
  selling_price: 0,
  sale_setup: null,
  notes: '',
})

export default function ProductsPage() {
  const { products, productsLoading, isOwner, items, mode } = useWorkspace()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<{
    id?: string
    input: ProductInput
  } | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [msg, setMsg] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)

  const stats = useMemo(() => {
    const m = new Map<string, { returns: number; recovered: number }>()
    for (const i of items) {
      if (!i.product_id) continue
      const s = m.get(i.product_id) ?? { returns: 0, recovered: 0 }
      s.returns++
      s.recovered += i.realized_amount ?? 0
      m.set(i.product_id, s)
    }
    return m
  }, [items])
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? products.filter((p) => p.sku.toLowerCase().includes(t) || p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t)) : products
  }, [products, q])

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[36px] leading-none tracking-tight sm:text-[44px]">Products</h1>
          <p className="mt-2 text-sm text-muted">
            {isOwner
              ? 'Your SKUs with their price and selling settings. Returns linked to a product are filled in with one tap.'
              : 'Your brand’s products. Tap one when you log a return. Ask your ops team to add a missing product.'}
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<FileUp className="size-4" />} onClick={() => setImportOpen(true)}>
              Import CSV or Excel
            </Button>
            <Button icon={<PackagePlus className="size-4" />} onClick={() => setEditing({ input: blank() })}>
              Add product
            </Button>
          </div>
        )}
      </div>
      {msg && (
        <Alert tone={msg.tone} className="mt-4">
          {msg.text}
        </Alert>
      )}

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU, name or category" className="pl-9" aria-label="Search products" />
      </div>

      {productsLoading ? (
        <Spinner />
      ) : !products.length ? (
        <Card className="mt-4">
          <EmptyState
            icon={<Tags className="size-6" />}
            title="No products yet"
            body={
              isOwner
                ? 'Add your SKUs one by one, or import them all from a CSV or Excel sheet.'
                : 'Your ops team hasn’t added products yet. You can still log returns by name.'
            }
          />
        </Card>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <ul className="divide-y divide-line">
            {shown.map((p) => {
              const s = stats.get(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper disabled:cursor-default disabled:hover:bg-transparent"
                    disabled={!isOwner}
                    onClick={() => setEditing({ id: p.id, input: toInput(p) })}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.name} {p.is_sample && <span className="ml-1 rounded bg-paper-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">sample</span>}
                      </p>
                      <p className="truncate text-xs text-muted">
                        <span className="font-mono">{p.sku}</span> · {p.category} · {PLATFORM_LABEL[saleOf(p.sale_setup).platform]}
                        {p.sale_setup ? '' : ' (default)'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular">{inr(p.selling_price)}</p>
                      <p className="text-xs text-muted">
                        {p.mrp ? `MRP ${inr(p.mrp)}` : ''}
                        {s ? `${p.mrp ? ' · ' : ''}${s.returns} return${s.returns === 1 ? '' : 's'}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
            {!shown.length && <li className="px-4 py-6 text-center text-sm text-muted">No products match “{q}”.</li>}
          </ul>
        </Card>
      )}
      {products.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          {products.length} product{products.length === 1 ? '' : 's'}
          {mode === 'demo' ? ' · sample products in the demo' : ''}
        </p>
      )}

      {editing && (
        <ProductEditor
          key={editing.id ?? 'new'}
          id={editing.id}
          initial={editing.input}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null)
            setMsg({ tone: 'success', text })
          }}
        />
      )}
      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onDone={(text) => {
            setImportOpen(false)
            setMsg({ tone: 'success', text })
          }}
        />
      )}
    </div>
  )
}

function ProductEditor({ id, initial, onClose, onSaved }: { id?: string; initial: ProductInput; onClose: () => void; onSaved: (msg: string) => void }) {
  const { saveProduct, removeProduct, products, items } = useWorkspace()
  const { rates } = useRates()
  const [p, setP] = useState(initial)
  const [price, setPrice] = useState(initial.selling_price ? String(initial.selling_price) : '')
  const [mrp, setMrp] = useState(initial.mrp ? String(initial.mrp) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const linked = id ? items.filter((i) => i.product_id === id).length : 0

  const save = async () => {
    const e: Record<string, string> = {}
    const sku = skuKey(p.sku)
    if (!/^[A-Z0-9][A-Z0-9\-_./]{0,79}$/.test(sku)) e.sku = 'Use letters, numbers and - _ . / (up to 80).'
    else if (products.some((x) => x.id !== id && skuKey(x.sku) === sku)) e.sku = 'That SKU is already in your list.'
    if (!p.name.trim()) e.name = 'Enter the product name.'
    const sp = Number(price)
    if (!price || !Number.isFinite(sp) || sp <= 0) e.price = 'Enter the selling price (more than ₹0).'
    const m = mrp === '' ? null : Number(mrp)
    if (m != null && (!Number.isFinite(m) || m < 0)) e.mrp = 'MRP must be a number.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    setErr('')
    try {
      await saveProduct(
        {
          ...p,
          sku,
          name: p.name.trim(),
          selling_price: Math.round(sp * 100) / 100,
          mrp: m == null ? null : Math.round(m * 100) / 100,
        },
        id,
      )
      onSaved(id ? `Saved ${sku}. New returns of this product use these settings.` : `Added ${sku} to your products.`)
    } catch (x) {
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        open={!confirmDelete}
        onClose={onClose}
        title={id ? 'Edit product' : 'Add product'}
        footer={
          <>
            {id && (
              <Button variant="ghost" className="mr-auto text-red-700" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={busy} onClick={save}>
              {id ? 'Save product' : 'Add product'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" error={errors.sku} required>
              {(fid, d) => (
                <Input
                  id={fid}
                  aria-describedby={d}
                  value={p.sku}
                  onChange={(e) => setP({ ...p, sku: e.target.value })}
                  invalid={!!errors.sku}
                  className="font-mono uppercase"
                  placeholder="e.g. TEE-WHT-M"
                />
              )}
            </Field>
            <Field label="Category" required>
              {(fid) => (
                <Select id={fid} value={p.category} onChange={(e) => setP({ ...p, category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Product name" error={errors.name} required className="sm:col-span-2">
              {(fid, d) => (
                <Input id={fid} aria-describedby={d} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} invalid={!!errors.name} />
              )}
            </Field>
            <Field label="Selling price" hint="What customers usually pay. Fees, GST and values use this." error={errors.price} required>
              {(fid, d) => (
                <Input
                  id={fid}
                  aria-describedby={d}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  invalid={!!errors.price}
                  placeholder="₹"
                />
              )}
            </Field>
            <Field label="MRP (optional)" hint="Printed on the tag, for reference." error={errors.mrp}>
              {(fid, d) => (
                <Input
                  id={fid}
                  aria-describedby={d}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  invalid={!!errors.mrp}
                  placeholder="₹"
                />
              )}
            </Field>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="mb-3 text-sm font-semibold">Where it sells</p>
            <SaleSetupCard
              bare
              category={p.category}
              price={Number(price) || 0}
              sale={saleOf(p.sale_setup, rates)}
              rates={rates}
              onChange={(s) => setP({ ...p, sale_setup: s })}
            />
            {p.sale_setup && (
              <button type="button" className="mt-3 text-xs font-medium text-brand-700 hover:underline" onClick={() => setP({ ...p, sale_setup: null })}>
                Use my rate-card default instead
              </button>
            )}
          </div>
          <Field label="Notes (optional)">
            {(fid) => <Textarea id={fid} value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value.slice(0, 1000) })} rows={2} />}
          </Field>
          {err && <Alert tone="error">{err}</Alert>}
        </div>
      </Modal>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this product?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await removeProduct(id!)
                  onSaved(`Deleted ${p.sku}.`)
                } catch (x) {
                  setErr((x as Error).message)
                  setConfirmDelete(false)
                } finally {
                  setBusy(false)
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          {linked
            ? `${linked} return${linked === 1 ? ' is' : 's are'} linked to it. They keep their name, price and values; only the link to the product is removed.`
            : 'No returns are linked to it.'}
        </p>
      </Modal>
    </>
  )
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const { importProducts, products } = useWorkspace()
  const { rates } = useRates()
  const file = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const existing = new Set(products.map((p) => skuKey(p.sku)))
  const ok = sheet?.rows.filter((r) => r.input) ?? []
  const bad = sheet?.rows.filter((r) => !r.input) ?? []
  const updates = ok.filter((r) => existing.has(r.input!.sku)).length

  const read = async (f: File) => {
    setErr('')
    setSheet(null)
    setName(f.name)
    try {
      if (f.size > 5_000_000) throw new Error('That file is over 5 MB. Split it into smaller sheets.')
      let table: unknown[][]
      if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsxFile } = await import('read-excel-file')
        try {
          table = await readXlsxFile(f)
        } catch {
          throw new Error('Couldn’t read this Excel file. In Excel or Google Sheets, save or download it as CSV and try again.')
        }
      } else if (/\.(csv|txt)$/i.test(f.name)) {
        table = parseCsv(await f.text())
      } else throw new Error('Use a .csv or .xlsx file. In Excel or Google Sheets, “Save as” or “Download” as one of these.')
      const parsed = parseProductSheet(table, rates.default_sale.platform)
      if (!parsed.missing.length && !parsed.rows.length) throw new Error('The sheet has headers but no product rows.')
      setSheet(parsed)
    } catch (x) {
      setErr((x as Error).message)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Import products"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ok.length}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              setErr('')
              try {
                await importProducts(ok.map((r) => r.input!))
                onDone(
                  `Imported ${ok.length} product${ok.length === 1 ? '' : 's'} (${ok.length - updates} new, ${updates} updated).${bad.length ? ` ${bad.length} row${bad.length === 1 ? ' was' : 's were'} skipped.` : ''}`,
                )
              } catch (x) {
                setErr((x as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            {ok.length ? `Import ${ok.length} product${ok.length === 1 ? '' : 's'}` : 'Import'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-ink-2">
          Columns: <span className="font-medium">SKU, Product name, Category, Selling price</span> (required) and MRP, Platform, GST %, Notes (optional). A SKU
          already in your list is updated.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
          onClick={() =>
            downloadBlob(
              new Blob(['﻿' + templateCsv()], {
                type: 'text/csv;charset=utf-8',
              }),
              'returnrescue-products-template.csv',
            )
          }
        >
          <Download className="size-4" /> Download the template
        </button>
        <div>
          <input
            ref={file}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Choose a CSV or Excel file"
            onChange={(e) => e.target.files?.[0] && read(e.target.files[0])}
          />
          <Button variant="secondary" icon={<FileUp className="size-4" />} onClick={() => file.current?.click()}>
            {name ? 'Choose another file' : 'Choose a CSV or Excel file'}
          </Button>
          {name && <span className="ml-2 text-xs text-muted">{name}</span>}
        </div>
        {err && <Alert tone="error">{err}</Alert>}
        {sheet && sheet.missing.length > 0 && (
          <Alert tone="error" title="Some required columns are missing">
            Add a column for: {sheet.missing.join(', ')}.
          </Alert>
        )}
        {sheet && !sheet.missing.length && (
          <>
            <Alert tone={bad.length ? 'warning' : 'success'}>
              {ok.length} ready to import ({ok.length - updates} new, {updates} update{updates === 1 ? '' : 's'})
              {bad.length ? ` · ${bad.length} with problems (skipped)` : ''}.
              {sheet.ignored.length > 0 && <span className="block text-xs">Ignored columns: {sheet.ignored.join(', ')}.</span>}
            </Alert>
            {bad.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-auto rounded-xl bg-paper p-3 text-xs">
                {bad.slice(0, 50).map((r) => (
                  <li key={r.line}>
                    <span className="font-medium">Row {r.line}:</span> {r.errors.join('; ')}
                  </li>
                ))}
              </ul>
            )}
            {ok.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead className="bg-paper text-left text-muted">
                    <tr>
                      <th className="px-3 py-1.5">SKU</th>
                      <th className="px-3 py-1.5">Name</th>
                      <th className="px-3 py-1.5">Category</th>
                      <th className="px-3 py-1.5 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ok.slice(0, 100).map((r) => (
                      <tr key={r.line}>
                        <td className="px-3 py-1.5 font-mono">{r.input!.sku}</td>
                        <td className="px-3 py-1.5">{r.input!.name}</td>
                        <td className="px-3 py-1.5">{r.input!.category}</td>
                        <td className="px-3 py-1.5 text-right tabular">{inr(r.input!.selling_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
