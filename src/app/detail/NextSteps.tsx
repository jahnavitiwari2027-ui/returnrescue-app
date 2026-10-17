import clsx from 'clsx'
import { Check, ExternalLink, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DirectoryCard, DirectoryDisclaimer, entryToPartner } from '../../components/directory'
import { PartnerActions, PartnerModal } from '../../components/partners'
import { Card } from '../../components/ui'
import { useWorkspace } from '../../context/WorkspaceContext'
import { DIRECTORY_REGION, directoryFor } from '../../data/directory'
import { newPartner, PARTNER_KIND_LABEL, usePartners } from '../../data/partners'
import { mapsUrl, pathwayFor } from '../../lib/pathways'
import type { ReturnItem, RouteKey } from '../../lib/types'

function useChecklist(itemId: string, count: number) {
  const key = `returnrescue.steps.${itemId}`
  const [done, setDone] = useState<boolean[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  })
  const toggle = (i: number) => {
    const next = Array.from({ length: count }, (_, j) => (j === i ? !done[j] : !!done[j]))
    setDone(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* per-device convenience only */
    }
  }
  return { done, toggle }
}

export default function NextSteps({ item, route }: { item: ReturnItem; route: RouteKey }) {
  const { mode, base } = useWorkspace()
  const { partners, upsert } = usePartners(mode)
  const path = pathwayFor(route, item.category)
  const { done, toggle } = useChecklist(item.id, path.steps.length)
  const [adding, setAdding] = useState(false)
  const mine = partners.filter((p) => p.kind === route)
  const completed = done.filter(Boolean).length
  const savedNames = new Set(partners.map((p) => p.name.toLowerCase()))
  const local = directoryFor(route, item.category)
  const localNames = new Set(local.map((d) => d.name.toLowerCase()))
  const channels = path.channels.filter((c) => !localNames.has(c.name.toLowerCase()))

  return (
    <Card className="mt-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Next steps · {path.title}</h2>
        <span className="text-xs text-muted tabular">{completed}/{path.steps.length}</span>
      </div>

      <ol className="mt-3 space-y-1">
        {path.steps.map((s, i) => (
          <li key={s}>
            <button onClick={() => toggle(i)} className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left text-sm hover:bg-paper" aria-pressed={!!done[i]}>
              <span className={clsx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border', done[i] ? 'border-brand-700 bg-brand-700 text-white' : 'border-line')}>
                {done[i] && <Check className="size-3" />}
              </span>
              <span className={clsx(done[i] && 'text-muted line-through')}>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Your partners</h3>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            <Plus className="size-3.5" /> Add
          </button>
        </div>
        {mine.length ? (
          <ul className="mt-2 space-y-3">
            {mine.map((p) => (
              <li key={p.id}>
                <p className="text-sm font-medium">{p.name}{p.city && <span className="font-normal text-muted"> · {p.city}</span>}</p>
                {p.note && <p className="text-xs text-muted">{p.note}</p>}
                <div className="mt-1.5"><PartnerActions partner={p} /></div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">Save your go-to {PARTNER_KIND_LABEL[route].toLowerCase()} contacts to reach them in one tap.</p>
        )}
      </div>

      {local.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium">In {DIRECTORY_REGION}</h3>
            <Link to={`${base}/partners`} className="text-xs font-medium text-brand-700 hover:underline">Full directory</Link>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {local.slice(0, 4).map((e) => (
              <li key={e.id} className="py-3 first:pt-1">
                <DirectoryCard compact entry={e} saved={savedNames.has(e.name.toLowerCase())} onSave={async (x) => { await upsert(entryToPartner(x)) }} />
              </li>
            ))}
          </ul>
          <DirectoryDisclaimer />
        </div>
      )}

      {path.nearby.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-medium">Find nearby</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {path.nearby.map((n) => (
              <a key={n.label} href={mapsUrl(n.query)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:border-ink/25">
                <MapPin className="size-3.5 text-brand-700" /> {n.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {channels.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-medium">Options in India</h3>
          <ul className="mt-2 space-y-2">
            {channels.map((c) => (
              <li key={c.name}>
                <a href={c.url} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-3 rounded-lg px-1 py-1 hover:bg-paper">
                  <span>
                    <span className="block text-sm font-medium group-hover:underline">{c.name}</span>
                    <span className="block text-xs text-muted">{c.bestFor}</span>
                  </span>
                  <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
          {path.ideas && <p className="mt-2 text-xs text-muted">Also try: {path.ideas.join(' · ')}.</p>}
          <p className="mt-2 text-xs text-muted">Independent suggestions — we have no commercial ties with these organisations.</p>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Manage all contacts in <Link to={`${base}/partners`} className="underline">Partners</Link>.
      </p>

      {adding && (
        <PartnerModal
          initial={{ ...newPartner(route) }}
          onClose={() => setAdding(false)}
          onSave={async (p) => {
            await upsert(p)
            setAdding(false)
          }}
        />
      )}
    </Card>
  )
}
