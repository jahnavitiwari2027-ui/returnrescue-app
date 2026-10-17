import { Handshake, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PartnerActions, PartnerModal } from '../components/partners'
import { Alert, Button, Card, EmptyState, Modal } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { PARTNER_KIND_LABEL, usePartners, type Partner } from '../data/partners'
import clsx from 'clsx'
import { DirectoryCard, DirectoryDisclaimer, entryToPartner } from '../components/directory'
import { DIRECTORY, DIRECTORY_REGION, type DirectoryEntry, type NcrCity } from '../data/directory'
import { ROUTES } from '../lib/types'

const KIND_FILTERS: [DirectoryEntry['kind'] | 'all', string][] = [
  ['all', 'All'],
  ['refurbish', 'Repair & cleaning'],
  ['liquidate', 'Liquidation'],
  ['recycle', 'Donation & recycling'],
]
const CITY_FILTERS: (NcrCity | 'all')[] = ['all', 'Delhi', 'Gurugram', 'Noida', 'Haryana', 'Online']

export default function PartnersPage() {
  const { mode } = useWorkspace()
  const { partners, upsert, remove } = usePartners(mode)
  const [editing, setEditing] = useState<Partner | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Partner | null>(null)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<DirectoryEntry['kind'] | 'all'>('all')
  const [city, setCity] = useState<NcrCity | 'all'>('all')
  const listed = DIRECTORY.filter((d) => (kind === 'all' || d.kind === kind) && (city === 'all' || d.city === city))
  const savedNames = new Set(partners.map((p) => p.name.toLowerCase()))
  const saveEntry = async (e: DirectoryEntry) => {
    await upsert(entryToPartner(e))
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2 flex items-end justify-between gap-4">
        <h1 className="font-display text-[36px] leading-none tracking-tight sm:text-[44px]">Partners</h1>
        <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Add partner</Button>
      </div>
      <p className="mb-6 text-sm text-muted">Your refurbishers, liquidation buyers and recyclers. They show up as next steps on matching returns.</p>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {partners.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Handshake className="size-6" />}
            title="No partners yet"
            body="Add the people you already work with — a cobbler, a tailor, a liquidation buyer — or save one from the Delhi NCR directory below. They show up as next steps on matching returns."
            action={<Button onClick={() => setEditing('new')} icon={<Plus className="size-4" />}>Add your first partner</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {ROUTES.map((kind) => {
            const list = partners.filter((p) => p.kind === kind)
            if (!list.length) return null
            return (
              <section key={kind}>
                <h2 className="mb-2 text-sm font-semibold">{PARTNER_KIND_LABEL[kind]}</h2>
                <Card>
                  <ul className="divide-y divide-line">
                    {list.map((p) => (
                      <li key={p.id} className="flex gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{p.name}{p.city && <span className="font-normal text-muted"> · {p.city}</span>}</p>
                          {p.note && <p className="text-xs text-muted">{p.note}</p>}
                          <div className="mt-2"><PartnerActions partner={p} /></div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button className="rounded-lg p-2 text-muted hover:bg-ink/5 hover:text-ink" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Pencil className="size-4" /></button>
                          <button className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}><Trash2 className="size-4" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            )
          })}
        </div>
      )}

      <section className="mt-10" aria-labelledby="directory-heading">
        <h2 id="directory-heading" className="font-display text-3xl tracking-tight">{DIRECTORY_REGION} directory</h2>
        <p className="mt-1 text-sm text-muted">Real repairers, cleaners, liquidation buyers and recyclers serving {DIRECTORY_REGION}. Save one to see it on matching returns.</p>
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          {KIND_FILTERS.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={clsx('rounded-full border px-3 py-1 text-sm', kind === k ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/25')}>
              {l}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by location">
          {CITY_FILTERS.map((c) => (
            <button key={c} type="button" aria-pressed={city === c} onClick={() => setCity(c)} className={clsx('rounded-full px-2.5 py-0.5 text-xs', city === c ? 'bg-brand-700 text-white' : 'bg-paper-2 text-ink-2 hover:bg-brand-50')}>
              {c === 'all' ? 'All locations' : c === 'Haryana' ? 'Panipat (Haryana)' : c}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {listed.map((e) => (
            <DirectoryCard key={e.id} entry={e} saved={savedNames.has(e.name.toLowerCase())} onSave={saveEntry} />
          ))}
        </div>
        {!listed.length && <p className="mt-4 text-sm text-muted">Nothing listed for that combination yet.</p>}
        <div className="mt-4"><DirectoryDisclaimer /></div>
      </section>

      {editing && (
        <PartnerModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (p) => {
            await upsert(p)
            setEditing(null)
          }}
        />
      )}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Remove this partner?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  if (deleting) await remove(deleting.id)
                } catch (e) {
                  setError((e as Error).message)
                }
                setDeleting(null)
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">{deleting?.name} will be removed from your partners.</p>
      </Modal>
    </div>
  )
}
