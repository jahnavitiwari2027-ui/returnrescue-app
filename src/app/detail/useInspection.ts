import { useCallback, useEffect, useRef, useState } from 'react'
import { LIMITS } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api, ApiError } from '../../lib/api'
import { useRates } from '../../data/rates'
import { imageForInspection } from '../../lib/image'
import { inspectionPatch } from '../../lib/decision'
import type { ReturnItem } from '../../lib/types'

export interface InspectionError {
  text: string
  upgrade?: boolean
}

/** Runs AI inspection for an item; optionally starts automatically once. */
export function useInspection(item: ReturnItem, autoRun: boolean) {
  const { repo, update, mode } = useWorkspace()
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
      const { inspection } = await api.inspect({
        mode,
        images,
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
  }, [item, mode, repo, update, refresh, rates])

  const started = useRef(false)
  useEffect(() => {
    if (autoRun && canRun && !started.current && !item.ai_inspection && item.photos.length && !item.grade) {
      started.current = true
      run()
    }
  }, [autoRun, canRun]) // eslint-disable-line react-hooks/exhaustive-deps

  return { run, running, error, canRun }
}
