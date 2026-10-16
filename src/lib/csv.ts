import { calculateRecovery } from './recovery'
import { DEFECT_LABEL, GRADE_LABEL, ROUTE_LABEL, STATUS_LABEL, type ReturnItem } from './types'

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v)
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function returnsToCsv(items: ReturnItem[]): string {
  const header = [
    'ID',
    'Sample record',
    'Created',
    'Product name',
    'SKU',
    'Category',
    'Original price (INR)',
    'Return reason',
    'Condition notes',
    'Status',
    'Grade',
    'Grade source',
    'AI proposed grade',
    'Recorded defects',
    'Recommended route',
    'Recommended est. net (INR)',
    'Decision route',
    'Decision est. net (INR)',
    'Decision reason',
    'Decided at',
    'Realized amount (INR)',
    'Return shipping (sunk, INR)',
    'Photo count',
  ]
  const rows = items.map((i) => {
    const calc = calculateRecovery(i)
    return [
      i.id,
      i.is_sample ? 'yes' : 'no',
      i.created_at,
      i.name,
      i.sku,
      i.category,
      i.original_price,
      i.return_reason,
      i.condition_notes,
      STATUS_LABEL[i.status],
      i.grade ? GRADE_LABEL[i.grade] : '',
      i.grade_source ?? '',
      i.ai_inspection ? GRADE_LABEL[i.ai_inspection.proposed_grade] : '',
      (i.defects ?? []).map((d) => `${DEFECT_LABEL[d.type] ?? d.type} (${d.severity})`).join('; '),
      calc.recommended ? ROUTE_LABEL[calc.recommended] : '',
      calc.recommendedNet ?? '',
      i.decision_route ? ROUTE_LABEL[i.decision_route] : '',
      i.decision_net ?? '',
      i.decision_reason,
      i.decided_at ?? '',
      i.realized_amount ?? '',
      i.return_shipping_cost,
      i.photos.length,
    ]
  })
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
