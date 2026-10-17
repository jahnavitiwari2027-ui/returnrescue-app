import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '../components/ui'
import { inr } from '../lib/format'
import type { Product } from '../lib/types'

/** "Which product is this?" — search the brand's SKUs and pick one with a tap. */
export function ProductPicker({
  products,
  selected,
  onPick,
}: {
  products: Product[]
  selected: Product | null
  onPick: (p: Product | null) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = t ? products.filter((p) => p.sku.toLowerCase().includes(t) || p.name.toLowerCase().includes(t)) : products
    return list.slice(0, 8)
  }, [products, q])

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-300 bg-brand-50/60 px-3 py-2.5">
        <Check className="size-4 shrink-0 text-brand-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{selected.name}</p>
          <p className="truncate text-xs text-muted"><span className="font-mono">{selected.sku}</span> · {selected.category} · {inr(selected.selling_price)}</p>
        </div>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-800 hover:bg-white" onClick={() => onPick(null)} aria-label="Change product">
          <X className="size-3.5" /> Change
        </button>
      </div>
    )
  }

  return (
    <div>
      {products.length > 0 && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onFocus={() => setOpen(true)} onChange={(e) => setQ(e.target.value)} placeholder="Find the product: search SKU or name" className="pl-9" aria-label="Search your products" />
          </div>
          {(open || q) && (
          <ul className="mt-2 max-h-72 divide-y divide-line overflow-auto rounded-xl border border-line" role="listbox" aria-label="Your products">
            {matches.map((p) => (
              <li key={p.id}>
                <button type="button" role="option" aria-selected={false} onClick={() => onPick(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted"><span className="font-mono">{p.sku}</span> · {p.category}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular text-ink-2">{inr(p.selling_price)}</span>
                </button>
              </li>
            ))}
            {!matches.length && <li className="px-3 py-3 text-sm text-muted">No product matches “{q}”. Type the details below.</li>}
          </ul>
          )}
        </>
      )}
    </div>
  )
}
