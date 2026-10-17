// GET /api/export-csv — Pro-only export of the caller's own inventory.
import type { Config } from '@netlify/functions'
import { returnsToCsv } from '../../src/lib/csv'
import { fail } from './_shared/http'
import { normalizeRow } from './_shared/rows'
import { getAccess, getAdmin, getUser, supabaseConfigured, workspaceFor } from './_shared/supabaseAdmin'

export default async (req: Request) => {
  if (!supabaseConfigured()) return fail(503, 'NOT_CONFIGURED', 'Accounts are not configured.')
  const user = await getUser(req)
  if (!user) return fail(401, 'AUTH', 'Please sign in again.')
  if ((await workspaceFor(user)).role !== 'owner') return fail(403, 'OWNER_ONLY', 'Only the brand owner or ops can export records.')
  if (!(await getAccess(user)).allowed) return fail(402, 'PRO_REQUIRED', 'Your free trial has ended. CSV export is part of ReturnRescue Pro.')
  const { data, error } = await getAdmin().from('returns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10000)
  if (error) return fail(500, 'DB', 'Could not read your records.')
  const csv = '﻿' + returnsToCsv((data ?? []).map(normalizeRow))
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="returnrescue-inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

export const config: Config = { path: '/api/export-csv' }
