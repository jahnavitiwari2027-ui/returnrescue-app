import { Handshake, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PartnerActions, PartnerModal } from '../components/partners'
import { Alert, Button, Card, EmptyState, Modal } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { PARTNER_KIND_LABEL, usePartners, type Partner } from '../data/partners'
import { ROUTES } from '../lib/types'

export default function PartnersPage() {
  const { mode } = useWorkspace()
  const { partners, upsert, remove } = usePartners(mode)
  const [editing, setEditing] = useState<Partner | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Partner | null>(null)
  const [error, setError] = useState('')

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
            body="Add the people you already work with — a cobbler, a tailor, a liquidation buyer — and reach them in one tap from any return."
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
