import { ExternalLink, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DirectoryCard, DirectoryDisclaimer, entryToPartner } from '../../components/directory'
import { PartnerActions, PartnerModal } from '../../components/partners'
import { Card } from '../../components/ui'
import { useWorkspace } from '../../context/WorkspaceContext'
import { directoryFor } from '../../data/directory'
import { newPartner, PARTNER_KIND_LABEL, usePartners } from '../../data/partners'
import { mapsUrl, pathwayFor } from '../../lib/pathways'
import type { ReturnItem, RouteKey } from '../../lib/types'

/** What to do with the item now, and who can help: saved contacts first, then suggestions. */
export default function NextSteps({ item, route }: { item: ReturnItem; route: RouteKey }) {
  const { mode, base } = useWorkspace()
  const { partners, upsert } = usePartners(mode)
  const path = pathwayFor(route, item.category)
  const [adding, setAdding] = useState(false)
  const mine = partners.filter((p) => p.kind === route)
  const savedNames = new Set(partners.map((p) => p.name.toLowerCase()))
  const local = directoryFor(route, item.category).slice(0, 3)
  const localNames = new Set(local.map((d) => d.name.toLowerCase()))
  const channels = path.channels.filter((c) => !localNames.has(c.name.toLowerCase()))

  return (
    <Card className="mt-4 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Next steps</p>
      <h2 className="mt-1 font-semibold">{path.title}</h2>
      <ol className="mt-3 space-y-2 text-sm text-ink-2">
        {path.steps.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-800 tabular">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Who can help</h3>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            <Plus className="size-3.5" /> Add contact
          </button>
        </div>

        <ul className="mt-2 divide-y divide-line">
          {mine.map((p) => (
            <li key={p.id} className="py-3">
              <p className="text-sm font-semibold">{p.name}{p.city && <span className="font-normal text-muted"> · {p.city}</span>}</p>
              {p.note && <p className="text-xs text-muted">{p.note}</p>}
              <div className="mt-1.5"><PartnerActions partner={p} /></div>
            </li>
          ))}
          {local.map((e) => (
            <li key={e.id} className="py-3">
              <DirectoryCard compact entry={e} saved={savedNames.has(e.name.toLowerCase())} onSave={async (x) => { await upsert(entryToPartner(x)) }} />
            </li>
          ))}
          {channels.map((c) => (
            <li key={c.name}>
              <a href={c.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold group-hover:underline">{c.name}</span>
                  <span className="block text-xs text-muted">{c.bestFor}</span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-muted" />
              </a>
            </li>
          ))}
        </ul>
        {!mine.length && !local.length && !channels.length && (
          <p className="mt-1 text-sm text-muted">Save your go-to {PARTNER_KIND_LABEL[route].toLowerCase()} contacts to reach them in one tap.</p>
        )}

        {path.nearby.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Find nearby:</span>
            {path.nearby.map((n) => (
              <a key={n.label} href={mapsUrl(n.query)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs hover:border-ink/25">
                <MapPin className="size-3 text-brand-700" /> {n.label}
              </a>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-1 text-xs text-muted">
          {local.length > 0 ? <DirectoryDisclaimer /> : channels.length > 0 && <p>Independent suggestions — we have no commercial ties with these organisations.</p>}
          {path.ideas && <p>Also try: {path.ideas.join(' · ')}.</p>}
          <p>
            <Link to={`${base}/partners`} className="font-medium text-brand-700 hover:underline">All partners and the full directory</Link>
          </p>
        </div>
      </div>

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
