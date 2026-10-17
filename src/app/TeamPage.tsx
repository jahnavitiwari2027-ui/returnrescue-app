import { Check, Copy, Flag, RefreshCw, UserMinus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, CardHeader, Input, Modal, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { DEMO_JOIN_CODE, DEMO_TEAM } from '../data/demoSeed'
import { dateTime, relativeDays } from '../lib/format'
import { supabase } from '../lib/supabase'
import { teamActivity } from '../lib/team'

interface Member {
  member_id: string
  status: 'pending' | 'active'
  display_name: string
  email: string
  joined_at: string
}

const clean = (m: string) => m.replace(/^.*?(TEAM|AUTH|CODE):\s*/, '')

export default function TeamPage() {
  const { mode, items, products, base, brandName } = useWorkspace()
  const { team, refresh } = useAuth()
  const demo = mode === 'demo'
  const [members, setMembers] = useState<Member[] | null>(null)
  const [demoMembers, setDemoMembers] = useState(DEMO_TEAM.map((m) => ({ member_id: m.id, status: m.status, display_name: m.name, email: '', joined_at: new Date(Date.now() - 40 * 86_400_000).toISOString() })))
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState<null | { kind: 'code' } | { kind: 'remove'; m: Member }>(null)
  const [brand, setBrand] = useState(brandName)
  const activity = useMemo(() => teamActivity(items, products), [items, products])
  const code = demo ? DEMO_JOIN_CODE : team?.joinCode ?? null
  const available = demo || !!team?.available

  const load = useCallback(async () => {
    if (demo || !supabase || !team?.available) return
    const { data, error } = await supabase.from('team_members').select('member_id,status,display_name,email,joined_at').order('joined_at')
    if (error) setMsg({ tone: 'error', text: error.message })
    setMembers((data as Member[]) ?? [])
  }, [demo, team?.available])
  useEffect(() => {
    load()
  }, [load])

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
      if (ok) setMsg({ tone: 'success', text: ok })
    } catch (e) {
      setMsg({ tone: 'error', text: clean((e as Error).message) })
    } finally {
      setBusy('')
    }
  }
  const rpc = async (name: string, args?: Record<string, unknown>) => {
    if (!supabase) throw new Error('Accounts are not configured.')
    const { error } = await supabase.rpc(name, args)
    if (error) throw new Error(error.message)
  }

  const list = demo ? demoMembers : members ?? []
  const pending = list.filter((m) => m.status === 'pending')
  const active = list.filter((m) => m.status === 'active')
  const joinUrl = `${window.location.origin}/join`
  const shareText = `Join ${brandName || 'our brand'} on ReturnRescue to log returns: open ${joinUrl}, sign in, and enter the team code ${code}`

  const approve = (m: Member) =>
    run('approve-' + m.member_id, async () => {
      if (demo) setDemoMembers((xs) => xs.map((x) => (x.member_id === m.member_id ? { ...x, status: 'active' } : x)))
      else {
        await rpc('approve_member', { p_member: m.member_id })
        await load()
      }
    }, `${m.display_name || m.email} can now log returns.`)
  const removeMember = (m: Member) =>
    run('remove-' + m.member_id, async () => {
      if (demo) setDemoMembers((xs) => xs.filter((x) => x.member_id !== m.member_id))
      else {
        const { error } = await supabase!.from('team_members').delete().eq('member_id', m.member_id)
        if (error) throw new Error(error.message)
        await load()
      }
      setConfirm(null)
    }, `${m.display_name || m.email} no longer has access. Returns they logged stay in your records.`)

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <div>
        <h1 className="font-display text-[36px] leading-none tracking-tight sm:text-[44px]">Team</h1>
        <p className="mt-2 text-sm text-muted">
          Warehouse staff join with your team code and log returns on their phone. You set rates, products and partners; they confirm the app’s recommendation or flag a return for you.
          {demo && ' In the demo, the team is sample data and changes aren’t saved.'}
        </p>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {!available && (
        <Alert tone="warning" title="Teams need a database update">Run <code>supabase/update-2026-10-19-teams.sql</code> in Supabase to switch on team codes.</Alert>
      )}

      {available && (
        <Card>
          <CardHeader title="Team code" subtitle="Share it with your warehouse staff. They sign in, open “Join your team” and enter it." />
          <div className="space-y-4 p-5">
            {!demo && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1 text-sm">
                  <span className="mb-1.5 block font-medium text-ink-2">Brand name (shown to staff)</span>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value.slice(0, 120))} placeholder="e.g. Indigo Threads" />
                </label>
                <Button variant="secondary" loading={busy === 'brand'} disabled={brand.trim() === brandName} onClick={() => run('brand', async () => { await rpc('ensure_team', { p_brand: brand.trim() }); await refresh() }, 'Brand name saved.')}>
                  Save
                </Button>
              </div>
            )}
            {code ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-2.5 font-mono text-xl tracking-wider text-brand-900" aria-label="Team code">{code}</p>
                  <Button
                    variant="secondary"
                    icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareText)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      } catch {
                        setMsg({ tone: 'info', text: shareText })
                      }
                    }}
                  >
                    {copied ? 'Copied' : 'Copy invite'}
                  </Button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 hover:underline">Share on WhatsApp</a>
                </div>
                {!demo && (
                  <button className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink" onClick={() => setConfirm({ kind: 'code' })}>
                    <RefreshCw className="size-3.5" /> Make a new code (the old one stops working)
                  </button>
                )}
              </>
            ) : (
              <Button loading={busy === 'create'} icon={<Users className="size-4" />} onClick={() => run('create', async () => { await rpc('ensure_team', { p_brand: brand.trim() || null }); await refresh() })}>
                Create my team code
              </Button>
            )}
          </div>
        </Card>
      )}

      {available && (
        <Card>
          <CardHeader title={`People${active.length ? ` (${active.length})` : ''}`} subtitle="Only people you approve can see your returns, products and partners." />
          <div className="divide-y divide-line">
            {!demo && members === null && <div className="p-5"><Spinner /></div>}
            {pending.map((m) => (
              <div key={m.member_id} className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/50 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.display_name || m.email} <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">wants to join</span></p>
                  <p className="text-xs text-muted">{m.email || 'Sample request'} · asked {relativeDays(m.joined_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={busy === 'approve-' + m.member_id} onClick={() => approve(m)} icon={<Check className="size-3.5" />}>Approve</Button>
                  <Button size="sm" variant="ghost" loading={busy === 'remove-' + m.member_id} onClick={() => removeMember(m)}>Decline</Button>
                </div>
              </div>
            ))}
            {active.map((m) => {
              const a = activity.people.find((p) => p.name === m.display_name)
              return (
                <div key={m.member_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.display_name || m.email}</p>
                    <p className="text-xs text-muted">{a ? `${a.logged} returns logged · ${a.last30} in the last 30 days · last ${relativeDays(a.lastAt)}` : 'No returns logged yet'}</p>
                  </div>
                  <Button size="sm" variant="ghost" icon={<UserMinus className="size-3.5" />} onClick={() => setConfirm({ kind: 'remove', m })}>Remove</Button>
                </div>
              )
            })}
            {(demo || members !== null) && !list.length && <p className="px-5 py-6 text-sm text-muted">No one has joined yet. Share your team code to get started.</p>}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Flagged for you" subtitle="Returns your team asked you to look at." />
        {activity.flagged.length ? (
          <ul className="divide-y divide-line">
            {activity.flagged.slice(0, 10).map((i) => (
              <li key={i.id}>
                <Link to={`${base}/returns/${i.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-paper">
                  <Flag className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{i.name}</span>
                    <span className="block text-xs text-muted">“{i.flag_note}” · {i.logged_by_name || 'Team'} · {dateTime(i.flagged_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-muted">Nothing flagged.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Returns logged by person" />
        {activity.people.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="px-5 py-2 font-medium">Name</th><th className="px-2 py-2 text-right font-medium">Total</th><th className="px-2 py-2 text-right font-medium">Last 30 days</th><th className="px-5 py-2 text-right font-medium">Last logged</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activity.people.map((p) => (
                <tr key={p.name}><td className="px-5 py-2">{p.name}</td><td className="px-2 py-2 text-right tabular">{p.logged}</td><td className="px-2 py-2 text-right tabular">{p.last30}</td><td className="px-5 py-2 text-right text-muted">{relativeDays(p.lastAt)}</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-sm text-muted">No returns logged yet.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Products returned most" subtitle={activity.unlisted ? `${activity.unlisted} return${activity.unlisted === 1 ? ' isn’t' : 's aren’t'} linked to a product in your list yet.` : undefined} />
        {activity.products.length ? (
          <ul className="divide-y divide-line">
            {activity.products.slice(0, 8).map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0 truncate"><span className="font-mono text-xs text-muted">{p.sku}</span> · {p.name}</span>
                <span className="shrink-0 tabular text-muted">{p.returns} return{p.returns === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-muted">No returns yet.</p>
        )}
      </Card>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'code' ? 'Make a new team code?' : 'Remove from your team?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            {confirm?.kind === 'code' ? (
              <Button loading={busy === 'code'} onClick={() => run('code', async () => { await rpc('regenerate_join_code'); await refresh(); setConfirm(null) }, 'New code ready. The old one no longer works; people already on your team keep access.')}>Make new code</Button>
            ) : confirm ? (
              <Button variant="danger" loading={busy === 'remove-' + confirm.m.member_id} onClick={() => removeMember(confirm.m)}>Remove</Button>
            ) : null}
          </>
        }
      >
        <p className="text-sm text-ink-2">
          {confirm?.kind === 'code'
            ? 'Anyone with the old code will no longer be able to ask to join. People already on your team keep their access.'
            : confirm
              ? `${confirm.m.display_name || confirm.m.email} will lose access straight away. Returns they logged stay in your records.`
              : ''}
        </p>
      </Modal>
    </div>
  )
}
