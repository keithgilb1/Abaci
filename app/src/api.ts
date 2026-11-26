import { useEffect, useState } from 'react'

export type Row = Record<string, string | number | boolean | null>

async function call<T>(path: string, body?: unknown): Promise<T> {
  const init = body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }
  const res = await fetch(path, init)
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  return data as T
}

export const api = {
  saved: (name: string) => call<{ rows: Row[] }>(`/api/saved/${name}`).then(d => d.rows),
  query: (spec: unknown) => call<{ rows: Row[]; notes: string[] }>('/api/query', spec).then(d => d.rows),
  simulate: (policy: unknown) => call<LabResult>('/api/lab/simulate', policy),
  ask: (question: string, use_adapter = true) => call<AskResult>('/api/ask', { question, use_adapter }),
  health: () => call<Health>('/api/health'),
}

export type Health = { warehouse: string; ask_available: boolean; ask_detail: string; ask_adapter: boolean; ask_model: string }

export type Totals = {
  loans_issued: number; originations: number; realized_net_profit: number; resolved_principal_years: number
  charge_off_rate: number | null; net_charge_off_rate: number | null; net_annualized_return: number | null
  treasury_benchmark_return: number | null; excess_return_vs_treasury: number | null
}
export type LabResult = {
  policy: Record<string, unknown>
  baseline: Totals; kept: Totals; declined: Totals
  repricing: { extra_profit: number; grades: string[] }
  frontier: { min_fico: number; share_of_originations: number; net_annualized_return: number | null; realized_net_profit: number }[]
  by_grade: Row[]
  unpriced_applicants: { rejected_applicants_clearing_bars: number }
}
export type AskResult = {
  question: string; adapter: boolean; model_output?: string; spec?: Record<string, unknown>; notes?: string[]
  sql?: string; rows?: Row[]; row_count?: number; answer?: string; unsupported?: string; error?: string
  generate_ms?: number; total_ms?: number
}

/** Load data once per key; re-runs when the key changes. */
export function useData<T>(key: string, load: () => Promise<T>): { data?: T; error?: string } {
  const [state, setState] = useState<{ key?: string; data?: T; error?: string }>({})
  useEffect(() => {
    let live = true
    load().then(data => { if (live) setState({ key, data }) }, e => { if (live) setState({ key, error: String(e.message || e) }) })
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return state.key === key ? state : {}
}
