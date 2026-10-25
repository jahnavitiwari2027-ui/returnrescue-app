import { AlertTriangle, BarChart3, CheckCircle2, Cpu, Info, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert, Button, Card, CardHeader, EmptyState, LinkButton, PageHeader, Spinner } from '../components/ui'
import { LIMITS } from '../config'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { api, ApiError } from '../lib/api'
import { inr } from '../lib/format'
import { computeStats, deriveInsights } from '../lib/insights'
import { GRADE_LABEL, ROUTE_LABEL, STATUS_LABEL, type Grade, type ReturnStatus } from '../lib/types'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e3e1d9', fontSize: 12 }

export default function InsightsPage() {
  const { items, loading, error, base, mode } = useWorkspace()
  const { proFeatures, plan } = useAuth()
  const stats = useMemo(() => computeStats(items), [items])
  const findings = useMemo(() => deriveInsights(stats), [stats])
  const [summary, setSummary] = useState<{ summary: string; model: string; generated_at: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiErr, setAiErr] = useState<{ text: string; upgrade?: boolean } | null>(null)

  if (loading) return <Spinner />
  if (error) return <Alert tone="error">{error}</Alert>
  if (!items.length)
    return (
      <>
        <PageHeader title="Insights" />
        <Card>
          <EmptyState icon={<BarChart3 className="size-6" />} title="No data yet" body="Insights appear once you have return records. Nothing here is estimated or invented — it is all computed from what you store." action={<LinkButton to={`${base}/returns/new`}>Add a return</LinkButton>} />
        </Card>
      </>
    )

  const generate = async () => {
    setAiErr(null)
    setBusy(true)
    try {
      setSummary(await api.insightsSummary(mode, mode === 'demo' ? stats : undefined))
    } catch (e) {
      setAiErr({ text: (e as Error).message, upgrade: e instanceof ApiError && e.code === 'PRO_REQUIRED' })
    } finally {
      setBusy(false)
    }
  }

  const graded = stats.total - (stats.byGrade.find((g) => g.key === 'Ungraded')?.count ?? 0)

  return (
    <>
      <PageHeader title="Insights" subtitle={`Computed from ${stats.total} stored return record${stats.total === 1 ? '' : 's'} — nothing is estimated beyond your own inputs.`} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Key findings" subtitle="Plain-language observations from your data." />
          <ul className="divide-y divide-line">
            {findings.map((f) => (
              <li key={f.id} className="flex gap-3 px-5 py-3.5">
                <span className={`mt-0.5 ${f.tone === 'attention' ? 'text-amber-600' : f.tone === 'positive' ? 'text-brand-600' : 'text-sky-600'}`}>
                  {f.tone === 'attention' ? <AlertTriangle className="size-4" /> : f.tone === 'positive' ? <CheckCircle2 className="size-4" /> : <Info className="size-4" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-sm text-muted">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-brand-700" />AI analyst summary</span>} subtitle="A written briefing generated from the figures on this page only." />
          <div className="flex flex-1 flex-col p-5">
            {summary ? (
              <>
                <div className="space-y-2 text-sm leading-relaxed text-ink-2">
                  {summary.summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p.replace(/^[-•]\s*/, '• ')}</p>)}
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                  <Cpu className="size-3.5" /> {summary.model} · {new Date(summary.generated_at).toLocaleString('en-IN')}
                </p>
                <Button variant="ghost" size="sm" className="mt-2 self-start" onClick={generate} loading={busy}>Regenerate</Button>
              </>
            ) : (
              <div className="my-auto text-center">
                <p className="text-sm text-muted">
                  {mode === 'demo'
                    ? `AI summaries need a free account — ${LIMITS.trialDays}-day free trial, no card.`
                    : !proFeatures
                      ? plan === 'starter'
                        ? 'AI summaries are part of Pro. Upgrade from Starter to turn them on.'
                        : 'Your free trial has ended. AI summaries are included with Pro.'
                      : 'Turn these numbers into a short briefing with priorities for your team.'}
                </p>
                {mode === 'demo' ? (
                  <LinkButton to="/signup" className="mt-4">Start free trial</LinkButton>
                ) : !proFeatures ? (
                  <LinkButton to={`${base}/billing`} className="mt-4">See Pro</LinkButton>
                ) : (
                  <Button className="mt-4" icon={<Sparkles className="size-4" />} onClick={generate} loading={busy}>Generate summary</Button>
                )}
              </div>
            )}
            {aiErr && (
              <Alert tone="error" className="mt-4">
                {aiErr.text} {aiErr.upgrade && <Link to={`${base}/billing`} className="font-semibold underline">Upgrade</Link>}
              </Alert>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Returns by category" subtitle="Which product categories come back most." />
          <div className="h-64 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#e3e1d9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b746f' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="key" width={130} tick={{ fontSize: 11, fill: '#3b4440' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1efe8' }} contentStyle={tooltipStyle} formatter={(v, _n, p) => [`${v} returns · ${inr((p.payload as { originalValue: number }).originalValue)} original value`, '']} />
                <Bar dataKey="count" fill="#0b5d45" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Most frequent issues" subtitle={`Recorded defects across ${graded} graded item${graded === 1 ? '' : 's'} (counted once per item).`} />
          <div className="h-64 px-2 py-4">
            {stats.defects.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.defects.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="#e3e1d9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b746f' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: '#3b4440' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1efe8' }} contentStyle={tooltipStyle} formatter={(v) => [`${v} item(s)`, '']} />
                  <Bar dataKey="count" fill="#3aaa7c" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center px-6 text-center text-sm text-muted">No defects recorded yet. Accept an AI inspection or grade items manually to populate this.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Which recovery routes offer the most value?" subtitle="Across graded items where the route is eligible and has an estimate." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-medium">Route</th>
                <th className="px-3 py-2.5 text-right font-medium">Eligible items</th>
                <th className="px-3 py-2.5 text-right font-medium">Avg. est. net / item</th>
                <th className="px-3 py-2.5 text-right font-medium">Best option for</th>
                <th className="px-5 py-2.5 text-right font-medium">Chosen (est. net total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stats.routeOpportunity.map((r) => {
                const chosen = stats.routesChosen.find((c) => c.route === r.route)!
                return (
                  <tr key={r.route}>
                    <td className="px-5 py-3 font-medium">{ROUTE_LABEL[r.route]}</td>
                    <td className="px-3 py-3 text-right tabular">{r.eligibleItems}</td>
                    <td className="px-3 py-3 text-right tabular">{r.eligibleItems ? inr(r.avgNet) : '—'}</td>
                    <td className="px-3 py-3 text-right tabular">{r.bestForItems} item{r.bestForItems === 1 ? '' : 's'}</td>
                    <td className="px-5 py-3 text-right tabular">{chosen.count} · {inr(chosen.estimatedNet)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Return reasons" />
          <ul className="space-y-2.5 px-5 py-4">
            {stats.byReason.map((r) => (
              <li key={r.key}>
                <div className="flex justify-between text-sm"><span>{r.key}</span><span className="tabular text-muted">{r.count}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.count / stats.total) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Condition grades" />
          <ul className="space-y-2.5 px-5 py-4">
            {stats.byGrade.map((g) => (
              <li key={g.key}>
                <div className="flex justify-between text-sm"><span>{g.key === 'Ungraded' ? 'Ungraded' : GRADE_LABEL[g.key as Grade]}</span><span className="tabular text-muted">{g.count}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-ink" style={{ width: `${(g.count / stats.total) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Still unprocessed" subtitle="Oldest first." />
          {stats.unprocessed.length ? (
            <ul className="divide-y divide-line">
              {stats.unprocessed.slice(0, 6).map((u) => (
                <li key={u.id}>
                  <Link to={`${base}/returns/${u.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm hover:bg-paper">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{u.name}</span>
                      <span className="text-xs text-muted">{STATUS_LABEL[u.status as ReturnStatus]}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular text-muted">{u.ageDays}d</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">All items have a decision.</p>
          )}
        </Card>
      </div>
    </>
  )
}
