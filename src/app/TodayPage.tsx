import { ArrowRight, Flag, PackageOpen, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Card, LinkButton, Spinner } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { STATUS_LABEL } from '../lib/types'
import { Thumb } from './InventoryPage'

/** Warehouse staff home: log returns and see what's waiting. */
export default function TodayPage() {
  const { items, loading, error, base, me, brandName } = useWorkspace()
  const today = new Date().toDateString()
  const mine = useMemo(() => items.filter((i) => i.logged_by === me.id), [items, me.id])
  const loggedToday = mine.filter((i) => new Date(i.created_at).toDateString() === today).length
  const waiting = items.filter((i) => !i.decision_route && i.status !== 'completed')
  const flaggedByMe = mine.filter((i) => i.flagged_at && i.flag_note).length

  if (loading) return <Spinner />
  if (error) return <Alert tone="error" title="Couldn’t load returns">{error}</Alert>

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[36px] leading-none tracking-tight sm:text-[44px]">Today</h1>
      <p className="mt-2 text-sm text-muted">Logging returns for {brandName || 'your brand'} as {me.name}.</p>

      <LinkButton to={`${base}/returns/new`} size="lg" className="mt-6 w-full" icon={<Plus className="size-5" />}>
        Log a return
      </LinkButton>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'You logged today', value: loggedToday },
          { label: 'Waiting for a decision', value: waiting.length },
          { label: 'You flagged for ops', value: flaggedByMe },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-1.5 font-display text-2xl leading-none tabular sm:text-4xl">{t.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold">Waiting for a decision</h2>
      {waiting.length ? (
        <Card>
          <ul className="divide-y divide-line">
            {waiting.slice(0, 10).map((i) => (
              <li key={i.id}>
                <Link to={`${base}/returns/${i.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper">
                  <Thumb refs={i.photos} size="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted">
                      {STATUS_LABEL[i.status]}
                      {i.order_id ? ` · Order ${i.order_id}` : ''}
                      {i.logged_by_name ? ` · ${i.logged_by_name}` : ''}
                    </p>
                  </div>
                  {i.flagged_at && i.flag_note && <Flag className="size-4 text-amber-600" aria-label="Flagged for ops" />}
                  <ArrowRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="flex flex-col items-center px-5 py-8 text-center text-sm text-muted">
          <PackageOpen className="mb-2 size-6" /> Nothing waiting. Log the next parcel when it arrives.
        </Card>
      )}
      <p className="mt-6 text-sm"><Link to={`${base}/returns`} className="font-medium text-brand-700 hover:underline">All returns →</Link></p>
    </div>
  )
}
