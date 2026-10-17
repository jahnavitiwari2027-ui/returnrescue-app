import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

/** Shown to someone who has asked to join a brand's team until the owner approves them. */
export default function PendingTeam({ brandName }: { brandName: string }) {
  const { refresh, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<'' | 'check' | 'cancel'>('')
  const [msg, setMsg] = useState('')

  const check = async () => {
    setBusy('check')
    setMsg('')
    await refresh()
    setBusy('')
    setMsg('Still waiting for approval.')
  }
  const cancel = async () => {
    if (!supabase || !user) return
    setBusy('cancel')
    const { error } = await supabase.from('team_members').delete().eq('member_id', user.id)
    await refresh()
    setBusy('')
    if (error) setMsg(error.message)
    else navigate('/join')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <Logo className="mx-auto" />
        <div className="mx-auto mt-6 grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700"><Clock className="size-6" /></div>
        <h1 className="mt-4 text-xl font-semibold">Waiting for approval</h1>
        <p className="mt-2 text-sm text-muted">
          You’ve asked to join <span className="font-medium text-ink">{brandName || 'this brand'}</span>’s team. The owner will see your request on their Team page. Once they approve it, you’ll be able to log returns.
        </p>
        {msg && <Alert tone="info" className="mt-4 text-left">{msg}</Alert>}
        <div className="mt-6 flex flex-col gap-2">
          <Button loading={busy === 'check'} onClick={check}>Check again</Button>
          <Button variant="ghost" loading={busy === 'cancel'} onClick={cancel}>Cancel request / use a different code</Button>
          <button className="mt-1 text-xs text-muted hover:text-ink" onClick={async () => { await signOut(); navigate('/') }}>Sign out</button>
        </div>
      </Card>
    </div>
  )
}
