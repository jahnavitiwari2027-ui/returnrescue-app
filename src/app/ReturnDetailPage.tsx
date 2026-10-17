import clsx from 'clsx'
import { ArrowLeft, ChevronDown, ImageOff, Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, EmptyState, LinkButton, Modal, SampleBadge, Spinner, StatusBadge } from '../components/ui'
import { usePhotoUrls, useWorkspace } from '../context/WorkspaceContext'
import { inr, shortDate } from '../lib/format'
import { DEFECT_LABEL, GRADE_LABEL, type ReturnItem } from '../lib/types'
import NextSteps from './detail/NextSteps'
import OptionsMaths from './detail/OptionsMaths'
import VerdictCard, { SupportNote } from './detail/VerdictCard'

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

  if (loading) return <Spinner />
  if (!item)
    return (
      <Card>
        <EmptyState
          icon={<ImageOff className="size-6" />}
          title="Return not found"
          body="It may have been deleted."
          action={<LinkButton to={`${base}/returns`}>Back to inventory</LinkButton>}
        />
      </Card>
    )

  const photo = item.photos[active] ? urls[item.photos[active]] : undefined

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to={`${base}/returns`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Inventory
        </Link>
        <div className="flex gap-1">
          <Link to={`${base}/returns/${item.id}/edit`} className="rounded-lg p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Edit">
            <Pencil className="size-4" />
          </Link>
          <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700" aria-label="Delete">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-paper-2 sm:size-28">
          {photo ? (
            <img src={photo} alt={item.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted">{item.photos.length ? <Spinner label="" /> : <ImageOff className="size-5" />}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] leading-tight tracking-tight sm:text-[34px]">{item.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {item.category} · {inr(item.original_price)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={item.status} />
            {item.is_sample && <SampleBadge />}
          </div>
          {item.photos.length > 1 && (
            <div className="mt-2 flex gap-1.5">
              {item.photos.map((ref, i) => (
                <button key={ref} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} className={clsx('size-8 overflow-hidden rounded-md border-2', i === active ? 'border-brand-600' : 'border-transparent opacity-60')}>
                  {urls[ref] && <img src={urls[ref]} alt="" className="size-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <VerdictCard item={item} autoRun={!!params.get('new')} />
      {item.decision_route && <NextSteps item={item} route={item.decision_route} />}

      <div className="mt-4 space-y-2">
        {item.ai_inspection && (
          <Section title="What the AI saw" hint={`${item.ai_inspection.defects.length} issue${item.ai_inspection.defects.length === 1 ? '' : 's'} found`}>
            <AIFindings item={item} />
          </Section>
        )}
        <Section title="All options and the maths" hint="Net value of each route">
          <OptionsMaths item={item} />
        </Section>
        <Section title="Product details">
          <dl className="space-y-2 text-sm">
            {[
              ['SKU', item.sku],
              ['Return reason', item.return_reason],
              ['Notes', item.condition_notes || '—'],
              ['Return shipping paid', `${inr(item.return_shipping_cost)} (not counted — already spent)`],
              ['Added', shortDate(item.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <LinkButton to={`${base}/returns/${item.id}/edit`} variant="secondary" size="sm" className="mt-4" icon={<Pencil className="size-3.5" />}>
            Edit details or values
          </LinkButton>
        </Section>
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
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">This removes the record and its photos. It can’t be undone.</p>
      </Modal>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-medium">{title}</span>
          {hint && <span className="block text-xs text-muted">{hint}</span>}
        </span>
        <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  )
}

function AIFindings({ item }: { item: ReturnItem }) {
  const ai = item.ai_inspection!
  return (
    <div className="space-y-4 text-sm">
      {ai.defects.length ? (
        <ul className="space-y-1.5">
          {ai.defects.map((d, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                <span className="font-medium">{DEFECT_LABEL[d.type] ?? d.type}</span>
                <span className="text-muted"> — {d.description}{d.location ? `, ${d.location}` : ''}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{d.severity}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2">No visible defects.</p>
      )}
      <div>
        <p className="font-medium">Why this grade</p>
        <p className="mt-0.5 text-ink-2">{ai.grade_rationale}</p>
      </div>
      {ai.guardrail_notes && ai.guardrail_notes.length > 0 && (
        <div className="rounded-lg bg-paper p-3">
          <p className="font-medium">Rule checks{ai.ai_proposed_grade ? ` · AI said ${GRADE_LABEL[ai.ai_proposed_grade]}` : ''}</p>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-ink-2">
            {ai.guardrail_notes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      <div>
        <p className="font-medium">Check by hand</p>
        <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-ink-2">
          {ai.recommended_physical_checks.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>
      <div>
        <p className="font-medium">What photos can’t show</p>
        <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-ink-2">
          {ai.limitations.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>
      <p className="text-xs text-muted">{ai.model} · {shortDate(ai.created_at)} · AI results are provisional — a person confirms the grade.</p>
      <SupportNote id={item.id} />
    </div>
  )
}
