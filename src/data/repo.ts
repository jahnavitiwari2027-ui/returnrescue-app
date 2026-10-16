import type { ReturnInput, ReturnItem } from '../lib/types'

export type WorkspaceMode = 'demo' | 'account'

export interface ReturnsRepo {
  mode: WorkspaceMode
  list(): Promise<ReturnItem[]>
  get(id: string): Promise<ReturnItem | null>
  create(input: ReturnInput): Promise<ReturnItem>
  update(id: string, patch: Partial<ReturnInput>): Promise<ReturnItem>
  remove(id: string): Promise<void>
  /** Store a photo and return a reference to put in `photos`. */
  uploadPhoto(file: Blob): Promise<string>
  /** Displayable URLs for photo references (signed URLs in account mode). */
  photoUrls(refs: string[]): Promise<Record<string, string>>
  /** Raw image bytes for a photo reference (for AI inspection). */
  photoBlob(ref: string): Promise<Blob>
  removePhotos(refs: string[]): Promise<void>
}

export class RepoError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}
