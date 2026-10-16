import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Field, Input, Logo } from '../components/ui'
import { supabase } from '../lib/supabase'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setErr('Use at least 8 characters.')
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setErr(error.message.includes('session') ? 'This reset link has expired. Request a new one.' : error.message)
    else navigate('/app')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col px-6 py-8">
      <Link to="/"><Logo /></Link>
      <form onSubmit={submit} className="my-auto space-y-4">
        <h1 className="font-display text-4xl">Choose a new password</h1>
        <Field label="New password" error={err}>
          {(id) => <Input id={id} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr('') }} autoComplete="new-password" />}
        </Field>
        {err.includes('expired') && <Alert tone="info"><Link to="/forgot-password" className="underline">Request a new link</Link></Alert>}
        <Button type="submit" className="w-full" loading={busy}>Update password</Button>
      </form>
    </div>
  )
}
