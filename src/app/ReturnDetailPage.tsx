import { ArrowLeft, ImageOff, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, EmptyState, LinkButton, Modal, SampleBadge, Spinner, StatusBadge } from '../components/ui'
import { usePhotoUrls, useWorkspace } from '../context/WorkspaceContext'
import { inr, shortDate } from '../lib/format'
import InspectionPanel from './InspectionPanel'
import RecoveryPanel from './RecoveryPanel'

export default function ReturnDetailPage() {
  const { id } = useParams()
  const { items, loading, base, remove } = useWorkspace()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const item = items.find((i) => i.id === id)
  const urls = usePhotoUrls(item?.photos ?? [])
  const [active, setActive] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => setActive(0), [id])

  if (loading) return <Spinner />
  if (!item)
    return (
      <Card>
        <EmptyState
          icon={<ImageOff className="size-6" />}
          title="Return not found"
          body="It may have been deleted, or the link is from another workspace."
          action={<LinkButton to={`${base}/returns`}>Back to inventory</LinkButton>}
        />
      </Card>
    )

  const photo = item.photos[active] ? urls[item.photos[active]] : undefined
  const facts = [
    ['Category', item.category],
    ['Original price', inr(item.original_price)],
    ['Return reason', item.return_reason],
    ['Return shipping (sunk)', inr(item.return_shipping_cost)],
    ['Added', shortDate(item.created_at)],
  ]

  return (
    <>
      <Link to={`${base}/returns`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Inventory
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.is_sample && <SampleBadge />}
          </div>
          <h1 className="font-display text-[32px] leading-tight tracking-tight sm:text-[40px]">{item.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{item.sku}</p>
        </div>
        <div className="flex gap-2">
          <LinkButton to={`${base}/returns/${item.id}/edit`} variant="secondary" icon={<Pencil className="size-4" />}>Edit</LinkButton>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>Delete</Button>
        </div>
      </div>

      {params.get('new') && !item.ai_inspection && !item.grade && (
        <Alert tone="success" icon={<Sparkles className="size-4" />} className="mb-4" title="Return saved">
          Next, run the AI inspection on its photos (or grade it manually), then compare recovery routes below.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="aspect-square bg-paper-2">
              {photo ? (
                <img src={photo} alt={`${item.name} — photo ${active + 1}`} className="size-full object-contain" />
              ) : (
                <div className="grid size-full place-items-center text-muted">
                  {item.photos.length ? <Spinner label="" /> : <span className="flex flex-col items-center gap-2 text-sm"><ImageOff className="size-6" />No photos</span>}
                </div>
              )}
            </div>
            {item.photos.length > 1 && (
              <div className="flex gap-2 border-t border-line p-2">
                {item.photos.map((ref, i) => (
                  <button
                    key={ref}
                    onClick={() => setActive(i)}
                    className={`size-14 overflow-hidden rounded-lg border-2 ${i === active ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    aria-label={`Show photo ${i + 1}`}
                  >
                    {urls[ref] && <img src={urls[ref]} alt="" className="size-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
            {item.is_sample && item.photos[0]?.startsWith('/demo/') && (
              <p className="border-t border-line px-3 py-2 text-xs text-muted">Illustration for a fictional sample product.</p>
            )}
          </Card>
          <Card>
            <dl className="divide-y divide-line text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {item.condition_notes && (
              <div className="border-t border-line px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Condition notes</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{item.condition_notes}</p>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <InspectionPanel item={item} />
          <RecoveryPanel key={`${item.grade}-${item.decision_route}`} item={item} />
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this return?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                setDeleting(true)
                await remove(item.id)
                navigate(`${base}/returns`)
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">This removes the record, its photos, inspection and decision. It can’t be undone.</p>
      </Modal>
    </>
  )
}
