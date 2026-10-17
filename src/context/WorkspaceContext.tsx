import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, Button, Spinner } from '../components/ui'
import { localRepo, resetDemo } from '../data/localRepo'
import { createSupabaseProductsRepo, localProductsRepo, resetDemoProducts, type ProductsRepo } from '../data/products'
import type { ReturnsRepo, WorkspaceMode } from '../data/repo'
import { createSupabaseRepo } from '../data/supabaseRepo'
import type { Product, ProductInput, ReturnInput, ReturnItem, TeamRole } from '../lib/types'
import { useAuth } from './AuthContext'
import PendingTeam from '../app/PendingTeam'
import { DEMO_TEAM } from '../data/demoSeed'

interface WorkspaceState {
  mode: WorkspaceMode
  base: string
  repo: ReturnsRepo
  items: ReturnItem[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  create: (input: ReturnInput) => Promise<ReturnItem>
  update: (id: string, patch: Partial<ReturnInput>) => Promise<ReturnItem>
  remove: (id: string) => Promise<void>
  resetDemo?: () => Promise<void>
  /** Owner (or ops) can change settings, products and decisions; staff log returns. */
  role: TeamRole
  isOwner: boolean
  brandName: string
  /** The signed-in person (demo: a sample owner or staff member). */
  me: { id: string; name: string }
  /** Demo only: view the app as the owner or as warehouse staff. */
  setDemoRole?: (r: TeamRole) => void
  products: Product[]
  productsLoading: boolean
  saveProduct: (input: ProductInput, id?: string) => Promise<Product>
  removeProduct: (id: string) => Promise<void>
  importProducts: (inputs: ProductInput[]) => Promise<void>
}

const Ctx = createContext<WorkspaceState | null>(null)

const DEMO_ROLE_KEY = 'returnrescue.demo.role'
function readDemoRole(): TeamRole {
  try {
    const q = new URLSearchParams(window.location.search).get('as')
    if (q === 'warehouse' || q === 'owner') {
      const r: TeamRole = q === 'warehouse' ? 'staff' : 'owner'
      localStorage.setItem(DEMO_ROLE_KEY, r)
      return r
    }
    return localStorage.getItem(DEMO_ROLE_KEY) === 'staff' ? 'staff' : 'owner'
  } catch {
    return 'owner'
  }
}

export function WorkspaceProvider({ mode, children }: { mode: WorkspaceMode; children: ReactNode }) {
  const { team, user, teamError, refresh } = useAuth()
  if (mode === 'account') {
    if (!team && teamError)
      return (
        <div className="grid min-h-screen place-items-center px-4">
          <Alert tone="error" title="Couldn’t load your workspace">
            Check your connection and try again.
            <div className="mt-3"><Button size="sm" onClick={() => refresh()}>Try again</Button></div>
          </Alert>
        </div>
      )
    if (!team) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
    if (team.role === 'pending') return <PendingTeam brandName={team.brandName} />
    return (
      <Workspace
        key={team.ownerId}
        mode="account"
        ownerId={team.ownerId}
        role={team.role === 'staff' ? 'staff' : 'owner'}
        brandName={team.brandName}
        me={{ id: user?.id ?? '', name: (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? '' }}
      >
        {children}
      </Workspace>
    )
  }
  return <DemoWorkspace>{children}</DemoWorkspace>
}

function DemoWorkspace({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<TeamRole>(readDemoRole)
  const setDemoRole = useCallback((r: TeamRole) => {
    try {
      localStorage.setItem(DEMO_ROLE_KEY, r)
    } catch {
      /* ignore */
    }
    setRole(r)
  }, [])
  return (
    <Workspace
      mode="demo"
      ownerId={null}
      role={role}
      brandName="Sample Brand"
      me={role === 'owner' ? { id: 'sample-owner', name: 'You (owner)' } : { id: DEMO_TEAM[0].id, name: DEMO_TEAM[0].name }}
      setDemoRole={setDemoRole}
    >
      {children}
    </Workspace>
  )
}

function Workspace({
  mode,
  ownerId,
  role,
  brandName,
  me: meProp,
  setDemoRole,
  children,
}: {
  mode: WorkspaceMode
  ownerId: string | null
  role: TeamRole
  brandName: string
  me: { id: string; name: string }
  setDemoRole?: (r: TeamRole) => void
  children: ReactNode
}) {
  const me = useMemo(() => meProp, [meProp.id, meProp.name]) // eslint-disable-line react-hooks/exhaustive-deps
  const repo = useMemo(() => (mode === 'demo' || !ownerId ? localRepo : createSupabaseRepo(ownerId)), [mode, ownerId])
  const productsRepo: ProductsRepo = useMemo(() => (mode === 'demo' || !ownerId ? localProductsRepo : createSupabaseProductsRepo(ownerId)), [mode, ownerId])
  const [items, setItems] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await repo.list())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [repo])

  const reloadProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      setProducts(await productsRepo.list())
    } catch {
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [productsRepo])

  useEffect(() => {
    reload()
    reloadProducts()
  }, [reload, reloadProducts])

  const value = useMemo<WorkspaceState>(
    () => ({
      mode,
      base: mode === 'demo' ? '/demo' : '/app',
      repo,
      items,
      loading,
      error,
      reload,
      create: async (input) => {
        // In accounts the database records who logged it; the demo does it here.
        const item = await repo.create(mode === 'demo' ? { ...input, logged_by: me.id, logged_by_name: me.name } : input)
        setItems((xs) => [item, ...xs])
        return item
      },
      update: async (id, patch) => {
        const item = await repo.update(id, patch)
        setItems((xs) => xs.map((x) => (x.id === id ? item : x)))
        return item
      },
      remove: async (id) => {
        await repo.remove(id)
        setItems((xs) => xs.filter((x) => x.id !== id))
      },
      resetDemo:
        mode === 'demo'
          ? async () => {
              resetDemo()
              resetDemoProducts()
              await Promise.all([reload(), reloadProducts()])
            }
          : undefined,
      role,
      isOwner: role === 'owner',
      brandName,
      me,
      setDemoRole,
      products,
      productsLoading,
      saveProduct: async (input, id) => {
        const p = id ? await productsRepo.update(id, input) : await productsRepo.create(input)
        setProducts((xs) => [...xs.filter((x) => x.id !== p.id), p].sort((a, b) => a.sku.localeCompare(b.sku)))
        return p
      },
      removeProduct: async (id) => {
        await productsRepo.remove(id)
        setProducts((xs) => xs.filter((x) => x.id !== id))
      },
      importProducts: async (inputs) => {
        await productsRepo.upsertMany(inputs)
        await reloadProducts()
      },
    }),
    [mode, repo, items, loading, error, reload, role, brandName, me, setDemoRole, products, productsLoading, productsRepo, reloadProducts],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkspace() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkspace outside WorkspaceProvider')
  return v
}

/** Resolve photo references to displayable URLs. */
export function usePhotoUrls(refs: string[]) {
  const { repo } = useWorkspace()
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = refs.join('|')
  useEffect(() => {
    let alive = true
    if (!refs.length) {
      setUrls({})
      return
    }
    repo
      .photoUrls(refs)
      .then((u) => alive && setUrls(u))
      .catch(() => alive && setUrls({}))
    return () => {
      alive = false
    }
  }, [key, repo]) // eslint-disable-line react-hooks/exhaustive-deps
  return urls
}
