// Demo workspace: lives entirely in this browser's localStorage, completely
// separate from any real business account data.

import { imageToDataUrl } from '../lib/image'
import { withDefaults, type ReturnInput, type ReturnItem } from '../lib/types'
import { buildDemoItems } from './demoSeed'
import { RepoError, type ReturnsRepo } from './repo'

// v2 (19 Oct 2026): sample returns gained products, order IDs and who logged them.
const KEY = 'returnrescue.demo.v2'

interface Store {
  version: 1
  items: ReturnItem[]
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Store
      if (parsed?.version === 1 && Array.isArray(parsed.items)) return { ...parsed, items: parsed.items.map((i) => withDefaults(i)) }
    }
  } catch {
    /* fall through to a fresh seed */
  }
  const fresh: Store = { version: 1, items: buildDemoItems() }
  write(fresh)
  return fresh
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    throw new RepoError(
      'STORAGE_FULL',
      'Your browser storage for the demo is full. Remove some demo photos or reset the demo.',
    )
  }
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ''] = dataUrl.split(',', 2)
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  if (!head.includes(';base64')) return new Blob([decodeURIComponent(body)], { type: mime })
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function resetDemo() {
  write({ version: 1, items: buildDemoItems() })
}

export const localRepo: ReturnsRepo = {
  mode: 'demo',
  async list() {
    return [...read().items].sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  async get(id) {
    return read().items.find((i) => i.id === id) ?? null
  },
  async create(input: ReturnInput) {
    const store = read()
    const now = new Date().toISOString()
    const item: ReturnItem = { ...input, id: uid(), created_at: now, updated_at: now, is_sample: false }
    store.items.push(item)
    write(store)
    return item
  },
  async update(id, patch) {
    const store = read()
    const idx = store.items.findIndex((i) => i.id === id)
    if (idx < 0) throw new RepoError('NOT_FOUND', 'This return no longer exists.')
    const updated = { ...store.items[idx], ...patch, id, updated_at: new Date().toISOString() }
    store.items[idx] = updated
    write(store)
    return updated
  },
  async remove(id) {
    const store = read()
    store.items = store.items.filter((i) => i.id !== id)
    write(store)
  },
  async uploadPhoto(file) {
    return imageToDataUrl(file)
  },
  async photoUrls(refs) {
    return Object.fromEntries(refs.map((r) => [r, r]))
  },
  async photoBlob(ref) {
    // Decode data: URLs directly — fetch() of data: URLs is blocked by the site's
    // Content-Security-Policy (connect-src), which caused "Failed to fetch".
    if (ref.startsWith('data:')) return dataUrlToBlob(ref)
    const res = await fetch(ref)
    if (!res.ok) throw new RepoError('PHOTO', 'Could not load this photo.')
    return res.blob()
  },
  async removePhotos() {
    /* data URLs disappear with the record */
  },
}
