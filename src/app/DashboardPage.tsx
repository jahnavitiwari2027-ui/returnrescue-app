import { ArrowRight, BarChart3, PackageOpen, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Card, EmptyState, LinkButton, Spinner } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { inr } from '../lib/format'
import { computeStats, deriveInsights } from '../lib/insights'
import { ROUTE_LABEL, STATUS_LABEL, type ReturnStatus } from '../lib/types'
import { Thumb } from './InventoryPage'

const STATUS_COLOR: Record<ReturnStatus, string> = {
  awaiting_inspection: '#f59e0b',
  inspected: '#38bdf8',
  decided: '#168c62',
  completed: '#141a17',
}

export default function DashboardPage() {
  const { items, loading, error, base } = useWorkspace()
  const stats = useMemo(() => computeStats(items), [items])

  if (loading) return <Spinner />
  if (error) return <Alert tone="error" title="Couldn’t load your returns">{error}</Alert>

  if (!items.length) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon={<PackageOpen className="size-6" />}
          title="No returns yet"
          body="Add your first returned product. The AI grades it from a photo and tells you the best way to recover its value."
          action={<LinkButton to={`${base}/returns/new`} icon={<Plus className="size-4" />}>Add a return</LinkButton>}
        />
      </Card>
    )
  }

  const tiles = [
    { label: 'To inspect', value: String(stats.awaitingInspection) },
    { label: 'To decide', value: String(stats.awaitingDecision) },
    { label: 'Est. recoverable', value: inr(stats.estimatedRecoverable), accent: true },
  ]
  const byId = new Map(items.map((i) => [i.id, i]))
  const topInsight = deriveInsights(stats)[0]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h1 className="font-display text-[36px] leading-none tracking-tight sm:text-[44px]">Dashboard</h1>
        <LinkButton to={`${base}/returns/new`} icon={<Plus className="size-4" />}>Add return</LinkButton>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className={t.accent ? 'border-brand-800 bg-brand-800 text-white' : ''}>
            <div className="p-4">
              <p className={`text-xs ${t.accent ? 'text-brand-100' : 'text-muted'}`}>{t.label}</p>
              <p className="mt-1.5 font-display text-2xl leading-none tabular sm:text-4xl">{t.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold">Next up</h2>
      {stats.unprocessed.length ? (
        <Card>
          <ul className="divide-y divide-line">
            {stats.unprocessed.slice(0, 6).map((u) => {
              const item = byId.get(u.id)!
              return (
                <li key={u.id}>
                  <Link to={`${base}/returns/${u.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper">
                    <Thumb refs={item.photos} size="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted">{STATUS_LABEL[u.status as ReturnStatus]} · {u.ageDays === 0 ? 'today' : `${u.ageDays}d ago`}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : (
        <Card className="px-5 py-8 text-center text-sm text-muted">All caught up — every return has a decision.</Card>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold">At a glance</h2>
      <Card className="p-5">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-paper-2" role="img" aria-label="Status of all returns">
          {stats.byStatus.map((s) =>
            s.count ? <div key={s.key} style={{ width: `${(s.count / stats.total) * 100}%`, background: STATUS_COLOR[s.key as ReturnStatus] }} /> : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>{stats.total} returns</span>
          {stats.byStatus.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s.key as ReturnStatus] }} />
              {STATUS_LABEL[s.key as ReturnStatus]} {s.count}
            </span>
          ))}
        </div>
        {stats.routesChosen.some((r) => r.count) && (
          <div className="mt-5">
            <p className="text-xs font-medium text-muted">Routes chosen</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {stats.routesChosen.filter((r) => r.count).map((r) => (
                <li key={r.route} className="flex justify-between gap-3">
                  <span>{ROUTE_LABEL[r.route]}</span>
                  <span className="tabular text-muted">{r.count} · {inr(r.estimatedNet)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {topInsight && <p className="mt-5 border-t border-line pt-4 text-sm"><span className="font-medium">{topInsight.title}.</span> <span className="text-muted">{topInsight.detail}</span></p>}
      </Card>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link to={`${base}/returns`} className="font-medium text-brand-700 hover:underline">All {stats.total} returns →</Link>
        <Link to={`${base}/insights`} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
          <BarChart3 className="size-4" /> Insights and trends →
        </Link>
      </div>
    </div>
  )
}
