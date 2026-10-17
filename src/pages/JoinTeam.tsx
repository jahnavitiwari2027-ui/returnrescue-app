import { ArrowRight, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert, Button, Card, Field, Input, Logo, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import PendingTeam from '../app/PendingTeam'
import { supabase } from '../lib/supabase'

/** A warehouse team member joins their brand with the code the owner shared. */
export default function JoinTeam() {
  const { team, teamError, user, refresh, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [name, setName] = useState(() => (user?.user_metadata?.full_name as string | undefined) ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!team && teamError)
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <Alert tone="error" title="Couldn’t load your account">
          Check your connection and try again. <Button size="sm" className="ml-2" onClick={() => refresh()}>Try again</Button>
        </Alert>
      </div>
    )
  if (!team) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  if (team.role === 'staff') return <Navigate to="/app" replace />
  if (team.role === 'pending') return <PendingTeam brandName={team.brandName} />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    const c = code.trim().toUpperCase()
    if (!/^RR-[A-Z0-9]{8}$/.test(c)) return setErr('Team codes look like RR-7KQ2X9AB. Check it with your manager.')
    if (!name.trim()) return setErr('Add your name so your manager knows who’s asking.')
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.rpc('join_team', { p_code: c, p_name: name.trim() })
    if (error) {
      setBusy(false)
      const m = /(?:CODE|TEAM|AUTH):\s*(.*)$/.exec(error.message)
      setErr(m ? m[1] : /my_team|join_team|function/i.test(error.message) ? 'Teams aren’t switched on for this site yet.' : error.message)
      return
    }
    await refresh()
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <Link to="/" aria-label="ReturnRescue home"><Logo /></Link>
        <div className="mt-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Users className="size-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">Join your team</h1>
            <p className="text-sm text-muted">Signed in as {user?.email}</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <Field label="Team code" hint="Your manager finds it on their Team page.">
            {(id, d) => <Input id={id} aria-describedby={d} value={code} onChange={(e) => setCode(e.target.value)} placeholder="RR-XXXXXXXX" className="font-mono uppercase" autoCapitalize="characters" autoComplete="off" />}
          </Field>
          <Field label="Your name">
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          </Field>
          {err && <Alert tone="error">{err}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={busy} icon={<ArrowRight className="size-4" />}>Ask to join</Button>
        </form>
        <p className="mt-5 text-xs text-muted">
          The owner approves each request. Running a brand yourself? <Link to="/app" className="font-medium text-brand-700 hover:underline">Go to your own workspace</Link> ·{' '}
          <button className="hover:text-ink hover:underline" onClick={() => signOut()}>Sign out</button>
        </p>
      </Card>
    </div>
  )
}
