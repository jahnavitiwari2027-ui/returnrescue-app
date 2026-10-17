import { Flag, Link2, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Textarea } from '../../components/ui'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useRates } from '../../data/rates'
import { dateTime } from '../../lib/format'
import { estimateFromRates, estimateInputFor, ratesPatch } from '../../lib/rates'
import type { Product, ReturnItem } from '../../lib/types'

const AUTO_UNLISTED = 'Not in the product list'

/** "Flag for ops": a team member asks the owner or ops to look at a return. */
export function FlagButton({ item, primary }: { item: ReturnItem; primary?: boolean }) {
  const { update } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (item.flagged_at && item.flag_note) return null
  if (!open)
    return primary ? (
      <Button className="mt-3" variant="dark" icon={<Flag className="size-4" />} onClick={() => setOpen(true)}>Flag for ops</Button>
    ) : (
      <button className="font-medium text-brand-700 hover:underline" onClick={() => setOpen(true)}>Flag for ops</button>
    )
  return (
    <div className="mt-3 w-full text-left">
      <label htmlFor={`flag-${item.id}`} className="text-sm font-medium">What should ops check?</label>
      <Textarea id={`flag-${item.id}`} className="mt-1 min-h-16" value={note} onChange={(e) => { setNote(e.target.value.slice(0, 1000)); setErr('') }} placeholder="e.g. Grade looks wrong — there’s a tear on the back the photo doesn’t show." />
      {err && <p className="mt-1 text-xs font-medium text-red-700">{err}</p>}
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          loading={busy}
          onClick={async () => {
            if (note.trim().length < 3) return setErr('Add a short note for ops.')
            setBusy(true)
            try {
              await update(item.id, { flag_note: note.trim(), flagged_at: new Date().toISOString() })
              setOpen(false)
            } catch (e) {
              setErr((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          Send to ops
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}

/** Shown on a flagged return. The owner or ops can mark it resolved. */
export function FlagBanner({ item }: { item: ReturnItem }) {
  const { update, isOwner } = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!item.flagged_at || !item.flag_note) return null
  return (
    <Alert tone="warning" icon={<Flag className="size-4" />} title="Flagged for ops">
      “{item.flag_note}” · {item.logged_by_name || 'Team'} · {dateTime(item.flagged_at)}
      {isOwner && (
        <div className="mt-2">
          <Button
            size="sm"
            variant="secondary"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await update(item.id, { flag_note: '', flagged_at: null })
              } catch (e) {
                setErr((e as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            Mark resolved
          </Button>
          {err && <p className="mt-1 text-xs font-medium text-red-700">{err}</p>}
        </div>
      )}
    </Alert>
  )
}

/** The AI thinks an unlinked return is one of the brand's products: link it with one tap. */
export function ProductSuggestion({ item }: { item: ReturnItem }) {
  const { products, update } = useWorkspace()
  const { rates } = useRates()
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const sku = item.ai_inspection?.matched_sku
  const product = sku ? products.find((p) => p.sku.toUpperCase() === sku.toUpperCase()) : undefined
  if (hidden || item.product_id || !product) return null

  const link = async (p: Product) => {
    setBusy(true)
    setErr('')
    try {
      const next = { ...item, product_id: p.id, sku: p.sku, name: p.name, category: p.category, sale_setup: p.sale_setup ?? item.sale_setup }
      const est = estimateFromRates(estimateInputFor(next), rates)
      await update(item.id, {
        product_id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        sale_setup: next.sale_setup,
        ...ratesPatch(next, est),
        // The "not in the product list" flag is answered by linking it.
        ...(item.flag_note.startsWith(AUTO_UNLISTED) ? { flag_note: '', flagged_at: null } : {}),
      })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-800">Looks like one of your products</p>
      <p className="mt-1 text-sm">
        <span className="font-medium">{product.name}</span> <span className="font-mono text-xs text-muted">{product.sku}</span>
      </p>
      {item.ai_inspection?.match_reason && <p className="mt-0.5 text-xs text-muted">{item.ai_inspection.match_reason}</p>}
      <p className="mt-1 text-xs text-muted">A suggestion from the photos — check it’s the same product before linking. Linking uses the product’s name, category and selling settings.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" loading={busy} icon={<Link2 className="size-3.5" />} onClick={() => link(product)}>Link to {product.sku}</Button>
        <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={() => setHidden(true)}>Not this one</Button>
      </div>
      {err && <p className="mt-2 text-xs font-medium text-red-700">{err}</p>}
    </div>
  )
}
