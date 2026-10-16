import { AlertTriangle, ArrowRight, CheckCircle2, Info, PackageOpen, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert, Card, CardHeader, EmptyState, GradeBadge, LinkButton, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'
import { inr } from '../lib/format'
import { computeStats, deriveInsights } from '../lib/insights'
import { ROUTE_LABEL, STATUS_LABEL, type ReturnStatus } from '../lib/types'

const STATUS_COLORS: Record<ReturnStatus, string> = {
  awaiting_inspection: '#f59e0b',
  inspected: '#38bdf8',
  decided: '#168c62',
  completed: '#141a17',
}

export default function DashboardPage() {
  const { items, loading, error, base, mode } = useWorkspace()
  const stats = useMemo(() => computeStats(items), [items])
  const insights = useMemo(() => deriveInsights(stats).slice(0, 3), [stats])

  if (loading) return <Spinner />
  if (error) return <Alert tone="error" title="Couldn’t load your returns">{error}</Alert>

  if (!items.length) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your returns pipeline at a glance." />
        <Card>
          <EmptyState
            icon={<PackageOpen className="size-6" />}
            title="No returns yet"
            body="Add your first returned product to inspect it with AI and compare recovery routes. Every number on this dashboard is calculated from your records."
            action={<LinkButton to={`${base}/returns/new`} icon={<Plus className="size-4" />}>Add a return</LinkButton>}
          />
        </Card>
      </>
    )
  }

  const kpis = [
    { label: 'Returned products', value: stats.total.toString(), sub: `${inr(stats.originalValue)} original value` },
    { label: 'Awaiting inspection', value: stats.awaitingInspection.toString(), sub: `${stats.awaitingDecision} more awaiting a decision` },
    { label: 'Inspected', value: stats.inspected.toString(), sub: `${stats.decided + stats.completed} with a recorded decision` },
    {
      label: 'Est. recoverable value',
      value: inr(stats.estimatedRecoverable),
      sub: stats.realizedCount ? `${inr(stats.realizedTotal)} realized so far` : 'Estimate — not yet realized',
      accent: true,
    },
  ]

  const routeData = stats.routesChosen.map((r) => ({ name: ROUTE_LABEL[r.route], count: r.count, net: r.estimatedNet }))

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={mode === 'demo' ? 'Calculated live from the sample records in this demo.' : 'Calculated live from your stored return records.'}
        actions={<LinkButton to={`${base}/returns/new`} icon={<Plus className="size-4" />}>Add a return</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={k.label} className={k.accent ? 'border-brand-800 bg-brand-800 text-white' : ''}>
            <div className="p-4 sm:p-5 animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <p className={`text-xs font-medium ${k.accent ? 'text-brand-100' : 'text-muted'}`}>{k.label}</p>
              <p className="mt-2 font-display text-3xl leading-none tabular sm:text-4xl">{k.value}</p>
              <p className={`mt-2 text-xs ${k.accent ? 'text-brand-100/90' : 'text-muted'}`}>{k.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader title="Processing status" subtitle="Where every return sits in the pipeline." />
        <div className="px-5 py-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-paper-2" role="img" aria-label="Status distribution">
            {stats.byStatus.map((s) =>
              s.count ? (
                <div key={s.key} style={{ width: `${(s.count / stats.total) * 100}%`, background: STATUS_COLORS[s.key as ReturnStatus] }} />
              ) : null,
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.byStatus.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[s.key as ReturnStatus] }} />
                <span className="text-ink-2">{STATUS_LABEL[s.key as ReturnStatus]}</span>
                <span className="ml-auto font-medium tabular sm:ml-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recovery routes selected" subtitle="Decisions recorded so far, with estimated net value." />
          <div className="h-60 px-2 py-4">
            {routeData.some((r) => r.count) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeData} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} stroke="#e3e1d9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b746f' }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b746f' }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    cursor={{ fill: '#f1efe8' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e3e1d9', fontSize: 12 }}
                    formatter={(v, _n, p) => [`${v} item(s) · est. net ${inr((p.payload as { net: number }).net)}`, 'Selected']}
                  />
                  <Bar dataKey="count" fill="#0b5d45" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-muted">No decisions recorded yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Returns received" subtitle="Records added per week, last 8 weeks." />
          <div className="h-60 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekly.map((w) => ({ ...w, label: new Date(w.week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }))} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} stroke="#e3e1d9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b746f' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b746f' }} tickLine={false} axisLine={false} width={28} />
                <Tooltip cursor={{ fill: '#f1efe8' }} contentStyle={{ borderRadius: 12, border: '1px solid #e3e1d9', fontSize: 12 }} formatter={(v) => [v, 'Returns (week of)']} />
                <Bar dataKey="count" fill="#3aaa7c" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Next up"
            subtitle="Oldest items still waiting for inspection or a decision."
            action={<Link to={`${base}/returns`} className="text-sm font-medium text-brand-700 hover:underline">View all</Link>}
          />
          {stats.unprocessed.length ? (
            <ul className="divide-y divide-line">
              {stats.unprocessed.slice(0, 5).map((u) => {
                const item = items.find((i) => i.id === u.id)!
                return (
                  <li key={u.id}>
                    <Link to={`${base}/returns/${u.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-paper">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="font-mono text-xs text-muted">{u.sku} · {u.ageDays}d old</p>
                      </div>
                      <GradeBadge grade={item.grade} />
                      <StatusBadge status={item.status} />
                      <ArrowRight className="size-4 text-muted" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">Everything has a decision. Nice work.</p>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Insights"
            subtitle="Derived from your records."
            action={<Link to={`${base}/insights`} className="text-sm font-medium text-brand-700 hover:underline">More</Link>}
          />
          <ul className="space-y-3 px-5 py-4">
            {insights.map((i) => (
              <li key={i.id} className="flex gap-3">
                <span className={`mt-0.5 ${i.tone === 'attention' ? 'text-amber-600' : i.tone === 'positive' ? 'text-brand-600' : 'text-sky-600'}`}>
                  {i.tone === 'attention' ? <AlertTriangle className="size-4" /> : i.tone === 'positive' ? <CheckCircle2 className="size-4" /> : <Info className="size-4" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted">{i.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
