import { Lock } from 'lucide-react'
import { Card, EmptyState, LinkButton } from '../components/ui'
import { useWorkspace } from '../context/WorkspaceContext'

/** Shown to warehouse staff on pages only the brand owner or ops can use. */
export default function OwnerOnly() {
  const { base } = useWorkspace()
  return (
    <Card>
      <EmptyState
        icon={<Lock className="size-6" />}
        title="For the brand owner or ops"
        body="Rates, team, insights and billing are managed by your brand’s owner or ops team. You can log returns, see products and contact partners."
        action={<LinkButton to={base}>Back to today</LinkButton>}
      />
    </Card>
  )
}
