import type { Interval, PaidPlan } from './plans'
// Thin client for the Netlify Functions under /api/*.

import { supabase } from './supabase'
import type { AIInspection } from './types'
import type { WorkspaceStats } from './insights'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function call<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.')
  }
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (json.code as string) ?? 'ERROR',
      (json.message as string) ??
        (res.status === 404
          ? 'This feature’s server endpoint is not available on this deployment.'
          : `Request failed (${res.status}).`),
    )
  }
  return json as T
}

export interface InspectRequest {
  mode: 'demo' | 'account'
  images: { media_type: 'image/jpeg'; data: string }[]
  context: {
    name: string
    category: string
    return_reason: string
    condition_notes: string
    original_price: number
  }
}

export const api = {
  inspect: (req: InspectRequest) =>
    call<{ inspection: AIInspection; usage?: { used: number; limit: number | null } }>('inspect', req),
  insightsSummary: (mode: 'demo' | 'account', stats?: WorkspaceStats) =>
    call<{ summary: string; model: string; generated_at: string }>('insights-summary', { mode, stats }),
  /** Starts checkout, or changes the plan of an existing subscription (`changed`). */
  createCheckout: (plan: PaidPlan, interval: Interval) => call<{ checkout_url?: string; changed?: boolean }>('create-checkout', { plan, interval }),
  customerPortal: () => call<{ link: string }>('customer-portal', {}),
  exportCsv: async () => {
    const res = await fetch('/api/export-csv', { headers: await authHeader() })
    if (!res.ok) {
      let msg = `Export failed (${res.status}).`
      try {
        msg = (await res.json()).message ?? msg
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, 'EXPORT', msg)
    }
    return res.blob()
  },
  status: () => call<{ ai: boolean; payments: boolean; accounts: boolean; paymentsMode: string }>('status', undefined, 'GET'),
}
