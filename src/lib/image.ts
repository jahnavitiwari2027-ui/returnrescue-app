// Browser image helpers: downscale uploads and prepare images for AI inspection.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read this image. Try a JPG, PNG or WebP file.'))
    img.src = src
  })
}

async function drawScaled(blob: Blob, maxDim: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const w0 = img.naturalWidth || 1024
    const h0 = img.naturalHeight || 1024
    const scale = Math.min(1, maxDim / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff' // flatten transparency
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `${file.name}: please use a JPG, PNG or WebP photo.`
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: file is larger than 15 MB.`
  return null
}

/** Downscale to a JPEG blob suitable for storage. */
export async function compressImage(blob: Blob, maxDim = 1600, quality = 0.85): Promise<Blob> {
  const canvas = await drawScaled(blob, maxDim)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image compression failed'))), 'image/jpeg', quality),
  )
}

/** Downscale to a JPEG data URL (used for demo-mode storage in the browser). */
export async function imageToDataUrl(blob: Blob, maxDim = 900, quality = 0.78): Promise<string> {
  const canvas = await drawScaled(blob, maxDim)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Base64 JPEG payload for the AI inspection endpoint. */
export async function imageForInspection(blob: Blob): Promise<{ media_type: 'image/jpeg'; data: string }> {
  const canvas = await drawScaled(blob, 1280)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { media_type: 'image/jpeg', data: dataUrl.split(',')[1] }
}
