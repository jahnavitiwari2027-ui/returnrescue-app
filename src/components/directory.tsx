import { Check, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Partner } from '../data/partners'
import { DIRECTORY_CHECKED_ON, type DirectoryEntry } from '../data/directory'
import { PartnerActions } from './partners'

export function entryToPartner(e: DirectoryEntry): Partner {
  return {
    id: `dir-${e.id}`,
    name: e.name,
    kind: e.kind,
    city: e.city === 'Online' ? 'Online' : e.city,
    phone: e.phone ?? '',
    email: e.email ?? '',
    website: e.website,
    note: `From the ReturnRescue Delhi NCR directory (checked ${DIRECTORY_CHECKED_ON}). ${e.services.join(', ')}.`,
  }
}

/** One directory business: what it does, where, how to reach it, and a way to save it. */
export function DirectoryCard({ entry, saved, onSave, compact }: { entry: DirectoryEntry; saved: boolean; onSave?: (e: DirectoryEntry) => Promise<void>; compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <div className={compact ? '' : 'rounded-2xl border border-line bg-white p-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{entry.name}</p>
          <p className="mt-0.5 flex items-start gap-1 text-xs text-muted">
            <MapPin className="mt-0.5 size-3 shrink-0" /> {entry.location}
          </p>
        </div>
        {onSave && (
        <button
          type="button"
          disabled={saved || busy}
          aria-label={saved ? `${entry.name} is saved to your partners` : `Save ${entry.name} to my partners`}
          onClick={async () => {
            setBusy(true)
            setErr('')
            try {
              await onSave?.(entry)
            } catch (e) {
              setErr((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-line px-2 py-1 text-xs font-medium text-brand-800 hover:border-brand-400 disabled:border-transparent disabled:text-muted"
        >
          {saved ? <><Check className="size-3.5" /> Saved</> : <><Plus className="size-3.5" /> Save</>}
        </button>
        )}
      </div>
      {!compact && <p className="mt-2 text-xs text-ink-2"><span className="font-medium">Covers:</span> {entry.serves}</p>}
      <ul className="mt-2 flex flex-wrap gap-1">
        {entry.services.map((s) => <li key={s} className="rounded-md bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-2">{s}</li>)}
      </ul>
      {entry.note && !compact && <p className="mt-2 text-xs text-muted">{entry.note}</p>}
      <div className="mt-2.5">
        <PartnerActions partner={{ id: entry.id, name: entry.name, kind: entry.kind, city: entry.city, phone: entry.phone ?? '', email: entry.email ?? '', website: entry.website, note: '' }} />
      </div>
      {err && <p className="mt-1 text-xs font-medium text-red-700">{err}</p>}
    </div>
  )
}

export function DirectoryDisclaimer() {
  return (
    <p className="text-xs text-muted">
      Independent businesses listed from their own websites, checked {DIRECTORY_CHECKED_ON}. ReturnRescue has no partnership or affiliation with them and doesn’t vouch for their work — confirm prices, quantities and terms directly before sending stock.
    </p>
  )
}
