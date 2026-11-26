const ok = (v: unknown): v is number => typeof v === 'number' && isFinite(v)

export const pct = (v: unknown, d = 1) => (ok(v) ? `${v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(d)}%` : '–')
export const pts = (v: unknown, d = 1) => (ok(v) ? `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(d)} pts` : '–')
export const num = (v: unknown) => (ok(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '–')
export const compact = (v: unknown) => (ok(v) ? Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v) : '–')
export function usd(v: unknown, d = 1): string {
  if (!ok(v)) return '–'
  const a = Math.abs(v), s = v < 0 && a >= 0.5 ? '−' : ''
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(d + 1)}B`
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(d)}M`
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`
  return `${s}$${a.toFixed(0)}`
}
export const year = (v: unknown) => String(v ?? '').slice(0, 4)
export const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v))

export const PURPOSE: Record<string, string> = {
  debt_consolidation: 'Debt consolidation', credit_card: 'Credit card', home_improvement: 'Home improvement', other: 'Other',
  major_purchase: 'Major purchase', medical: 'Medical', small_business: 'Small business', car: 'Car', vacation: 'Vacation',
  moving: 'Moving', house: 'House', wedding: 'Wedding', renewable_energy: 'Renewable energy', educational: 'Education',
}
