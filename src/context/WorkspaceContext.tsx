import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { localRepo, resetDemo } from '../data/localRepo'
import type { ReturnsRepo, WorkspaceMode } from '../data/repo'
import { supabaseRepo } from '../data/supabaseRepo'
import type { ReturnInput, ReturnItem } from '../lib/types'

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
}

const Ctx = createContext<WorkspaceState | null>(null)

export function WorkspaceProvider({ mode, children }: { mode: WorkspaceMode; children: ReactNode }) {
  const repo = mode === 'demo' ? localRepo : supabaseRepo
  const [items, setItems] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    reload()
  }, [reload])

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
        const item = await repo.create(input)
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
              await reload()
            }
          : undefined,
    }),
    [mode, repo, items, loading, error, reload],
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
