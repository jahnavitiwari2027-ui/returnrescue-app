import { LinkButton, Logo } from '../components/ui'

export default function NotFound({ inApp }: { inApp?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${inApp ? 'py-24' : 'min-h-screen'}`}>
      {!inApp && <Logo className="mb-10" />}
      <p className="font-display text-7xl text-brand-700">404</p>
      <h1 className="mt-2 text-lg font-semibold">This page went missing in transit</h1>
      <p className="mt-1 text-sm text-muted">The link may be old or mistyped.</p>
      <LinkButton to={inApp ? '..' : '/'} className="mt-6">Go back</LinkButton>
    </div>
  )
}
