// Account workspace: records in Postgres (Row Level Security restricts every
// query to the signed-in user) and photos in a private Storage bucket.

import { compressImage } from '../lib/image'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'
import type { ReturnInput, ReturnItem } from '../lib/types'
import { RepoError, type ReturnsRepo } from './repo'

const NUMERIC: (keyof ReturnItem)[] = [
  'original_price',
  'resale_price',
  'refurb_resale_price',
  'selling_fee_pct',
  'refurb_cost',
  'handling_cost',
  'liquidation_price',
  'liquidation_fee',
  'recycling_value',
  'recycling_cost',
  'return_shipping_cost',
]

function normalize(row: Record<string, unknown>): ReturnItem {
  const r = { ...row } as Record<string, unknown>
  for (const k of NUMERIC) r[k] = Number(r[k] ?? 0)
  for (const k of ['decision_net', 'realized_amount'] as const) r[k] = r[k] == null ? null : Number(r[k])
  delete r.user_id
  r.photos = r.photos ?? []
  r.defects = r.defects ?? []
  r.value_basis = r.value_basis ?? {}
  return r as unknown as ReturnItem
}

function clean(patch: Partial<ReturnInput>) {
  const out = { ...patch } as Record<string, unknown>
  delete out.is_sample
  delete out.id
  delete out.created_at
  delete out.updated_at
  return out
}

function fail(error: { message: string; code?: string } | null): never {
  const msg = error?.message ?? 'Unknown error'
  if (msg.includes('FREE_PLAN_LIMIT')) {
    throw new RepoError('FREE_PLAN_LIMIT', msg.replace(/^.*FREE_PLAN_LIMIT:\s*/, ''))
  }
  if (msg.toLowerCase().includes('jwt') || error?.code === 'PGRST301') {
    throw new RepoError('AUTH', 'Your session expired. Please sign in again.')
  }
  throw new RepoError('DB', msg)
}

const urlCache = new Map<string, { url: string; exp: number }>()

function client() {
  if (!supabase) throw new RepoError('CONFIG', 'Accounts are not configured on this deployment.')
  return supabase
}

export const supabaseRepo: ReturnsRepo = {
  mode: 'account',
  async list() {
    const { data, error } = await client().from('returns').select('*').order('created_at', { ascending: false })
    if (error) fail(error)
    return (data ?? []).map(normalize)
  },
  async get(id) {
    const { data, error } = await client().from('returns').select('*').eq('id', id).maybeSingle()
    if (error) fail(error)
    return data ? normalize(data) : null
  },
  async create(input) {
    const { data, error } = await client().from('returns').insert(clean(input)).select('*').single()
    if (error) fail(error)
    return normalize(data)
  },
  async update(id, patch) {
    const { data, error } = await client().from('returns').update(clean(patch)).eq('id', id).select('*').single()
    if (error) fail(error)
    return normalize(data)
  },
  async remove(id) {
    const item = await this.get(id)
    const { error } = await client().from('returns').delete().eq('id', id)
    if (error) fail(error)
    if (item?.photos.length) await this.removePhotos(item.photos).catch(() => undefined)
  },
  async uploadPhoto(file) {
    const sb = client()
    const { data: userData } = await sb.auth.getUser()
    const userId = userData.user?.id
    if (!userId) throw new RepoError('AUTH', 'Please sign in again to upload photos.')
    const jpeg = await compressImage(file)
    const path = `${userId}/${crypto.randomUUID()}.jpg`
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false })
    if (error) throw new RepoError('UPLOAD', `Photo upload failed: ${error.message}`)
    return path
  },
  async photoUrls(refs) {
    const now = Date.now()
    const out: Record<string, string> = {}
    const missing: string[] = []
    for (const r of refs) {
      const c = urlCache.get(r)
      if (c && c.exp > now) out[r] = c.url
      else missing.push(r)
    }
    if (missing.length) {
      const { data, error } = await client().storage.from(PHOTO_BUCKET).createSignedUrls(missing, 3600)
      if (error) throw new RepoError('PHOTO', error.message)
      for (const d of data ?? []) {
        if (d.signedUrl && d.path) {
          out[d.path] = d.signedUrl
          urlCache.set(d.path, { url: d.signedUrl, exp: now + 50 * 60 * 1000 })
        }
      }
    }
    return out
  },
  async photoBlob(ref) {
    const { data, error } = await client().storage.from(PHOTO_BUCKET).download(ref)
    if (error || !data) throw new RepoError('PHOTO', 'Could not load this photo.')
    return data
  },
  async removePhotos(refs) {
    if (!refs.length) return
    await client().storage.from(PHOTO_BUCKET).remove(refs)
  },
}
