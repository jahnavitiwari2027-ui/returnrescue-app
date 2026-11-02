import { useCallback, useEffect, useRef, useState } from 'react'
import { LIMITS } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api, ApiError } from '../../lib/api'
import { useRates } from '../../data/rates'
import { imageForInspection } from '../../lib/image'
import { inspectionPatch } from '../../lib/decision'
import { knownProducts, productBySku } from '../../lib/products'
import type { ReturnItem } from '../../lib/types'
import type { ReturnsRepo } from '../../data/repo'

/**
 * One small photo of up to four earlier products in the same category, so the AI can say if
 * this return is one of them. Skipped when the return already has a SKU we know.
 */
async function referencePhotos(item: ReturnItem, items: ReturnItem[], repo: ReturnsRepo) {
  const others = items.filter((i) => i.id !== item.id && !i.is_sample)
  const products = knownProducts(others)
  if (productBySku(item.sku, products)) return []
  const refs = []
  for (const p of products.filter((x) => x.category === item.category).slice(0, 4)) {
    const withPhoto = others.find((i) => i.id === p.lastId && i.photos.length) ?? others.find((i) => i.sku.toUpperCase() === p.sku && i.photos.length)
    if (!withPhoto) continue
    try {
      refs.push({ id: p.sku, name: p.name, image: await imageForInspection(await repo.photoBlob(withPhoto.photos[0]), 512) })
    } catch {
      // A missing reference photo just means one fewer comparison.
    }
  }
  return refs
}

export interface InspectionError {
  text: string
  upgrade?: boolean
}

/** Runs AI inspection for an item; optionally starts automatically once. */
export function useInspection(item: ReturnItem, autoRun: boolean) {
  const { repo, update, mode, items } = useWorkspace()
  const { hasAccess, refresh } = useAuth()
  const { rates } = useRates()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<InspectionError | null>(null)
  // A finished sale is history: it isn't re-inspected.
  const canRun = mode === 'account' && hasAccess && item.status !== 'completed'

  const run = useCallback(async () => {
    setError(null)
    if (!item.photos.length) {
      setError({ text: 'Add a photo first.' })
      return
    }
    setRunning(true)
    try {
      const images = []
      for (const ref of item.photos.slice(0, LIMITS.maxPhotos)) images.push(await imageForInspection(await repo.photoBlob(ref)))
      const references = await referencePhotos(item, items, repo)
      const { inspection } = await api.inspect({
        mode,
        images,
        ...(references.length ? { references } : {}),
        context: {
          name: item.name,
          category: item.category,
          return_reason: item.return_reason,
          condition_notes: item.condition_notes,
          original_price: item.original_price,
        },
      })
      // The AI's grade is saved straight away and the best option chosen from it; the person can still change either.
      await update(item.id, inspectionPatch(item, inspection, rates))
      refresh()
    } catch (e) {
      if (e instanceof ApiError) setError({ text: e.message, upgrade: ['TRIAL_ENDED', 'TRIAL_LIMIT', 'PRO_REQUIRED'].includes(e.code) })
      else setError({ text: (e as Error).message })
    } finally {
      setRunning(false)
    }
  }, [item, items, mode, repo, update, refresh, rates])

  const started = useRef(false)
  useEffect(() => {
    if (autoRun && canRun && !started.current && !item.ai_inspection && item.photos.length && !item.grade) {
      started.current = true
      run()
    }
  }, [autoRun, canRun]) // eslint-disable-line react-hooks/exhaustive-deps

  return { run, running, error, canRun }
}
