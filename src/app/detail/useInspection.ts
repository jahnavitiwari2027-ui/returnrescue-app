import { useCallback, useEffect, useRef, useState } from 'react'
import { LIMITS } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api, ApiError } from '../../lib/api'
import { useRates } from '../../data/rates'
import { estimateFromRates, estimateInputFor, ratesPatch } from '../../lib/rates'
import { imageForInspection } from '../../lib/image'
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
  const canRun = mode === 'account' && hasAccess

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
      // Price the defects the AI found with the rate card. Values the user entered or quoted are left alone.
      // Items outside apparel, footwear and accessories aren't priced at all.
      if (inspection.out_of_scope) {
        await update(item.id, { ai_inspection: inspection })
      } else {
        const est = estimateFromRates(estimateInputFor({ ...item, ai_inspection: inspection }), rates)
        await update(item.id, { ai_inspection: inspection, ...ratesPatch(item, est) })
      }
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
