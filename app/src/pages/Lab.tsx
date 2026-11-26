import { useEffect, useRef, useState } from 'react'
import { api, useData, type LabResult } from '../api'
import { BarChart, ChartCard, Frontier, type Bar } from '../components/charts'
import { Callout, Hero, Kpi, Loading } from '../components/ui'
import { compact, n, num, pct, pts, usd } from '../format'

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
type Policy = { min_fico: number; max_dti: number; min_income: number; grades: string[]; terms: number[]; reprice_bps: number; reprice_grades: string[] }
const DEFAULT: Policy = { min_fico: 0, max_dti: 999, min_income: 0, grades: GRADES, terms: [36, 60], reprice_bps: 0, reprice_grades: ['E', 'F', 'G'] }
const FICO_OFF = 640, DTI_OFF = 41

function Slider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void
}) {
  const p = ((value - min) / (max - min)) * 100
  return (
    <div className="control">
      <div className="control-head"><span className="kpi-label">{label}</span><span className="val">{display}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} style={{ ['--pct' as string]: `${p}%` }}
        onChange={e => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  )
}

function Toggles<T extends string | number>({ options, on, onChange, label }: { options: T[]; on: T[]; onChange: (v: T[]) => void; label?: (v: T) => string }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o} className={on.includes(o) ? 'on' : ''} aria-pressed={on.includes(o)}
          onClick={() => onChange(on.includes(o) ? on.filter(x => x !== o) : [...on, o].sort() as T[])}>{label ? label(o) : o}</button>
      ))}
    </div>
  )
}

function useSimulation(policy: Policy) {
  const [res, setRes] = useState<{ data?: LabResult; error?: string; busy: boolean }>({ busy: true })
  const seq = useRef(0)
  useEffect(() => {
    const id = ++seq.current
    setRes(r => ({ ...r, busy: true }))
    const t = setTimeout(() => {
      api.simulate(policy).then(
        data => { if (id === seq.current) setRes({ data, busy: false }) },
        e => { if (id === seq.current) setRes(r => ({ ...r, error: String(e.message || e), busy: false })) },
      )
    }, 250)
    return () => clearTimeout(t)
  }, [policy])
  return res
}

export default function Lab() {
  const [policy, setPolicy] = useState<Policy>(DEFAULT)
  const set = (patch: Partial<Policy>) => setPolicy(p => ({ ...p, ...patch }))
  const base = useData('lab-default', () => api.simulate(DEFAULT))
  const sim = useSimulation(policy)

  if (!base.data) return <Loading error={base.error} />
  const f = base.data.frontier
  const at = (fico: number) => f.find(x => x.min_fico === fico)
  const best = f.reduce((a, b) => (n(b.net_annualized_return) > n(a.net_annualized_return) ? b : a))
  const strict = at(720) ?? f[f.length - 1]
  const b = base.data.baseline

  const r = sim.data
  const k = r?.kept, d = r?.declined
  const profitDelta = k ? k.realized_net_profit - b.realized_net_profit : 0
  const share = k ? k.originations / b.originations : 1
  const valid = policy.grades.length > 0 && policy.terms.length > 0

  const gradeBars: Bar[] = (r?.by_grade ?? []).map(g => ({
    label: `Grade ${g.loan__grade}`, value: n(g.net_annualized_return),
    tone: n(g.net_annualized_return) < 0 ? 'loss' : 'main',
    detail: <><b>Grade {String(g.loan__grade)}</b><div>{num(g.loans_issued)} loans kept</div><div>Return {pct(g.net_annualized_return, 2)}</div><div>Charged off {pct(g.charge_off_rate)}</div></>,
  }))

  return (
    <>
      <Hero
        eyebrow="Question 3 · What happens if we change who we approve?"
        title={<>A higher FICO floor makes Abaci smaller, not richer.</>}
        sub={<>Replay any approval policy against {num(b.loans_issued)} mature loans with known outcomes. Raising the floor to 720 keeps {pct(strict.share_of_originations, 0)} of lending and returns {pct(strict.net_annualized_return)}, against {pct(b.net_annualized_return)} today. Return peaks near a floor of {best.min_fico}, because higher-scoring borrowers were priced thinner than their lower losses.</>}
      />
      <div className="grid g-lab">
        <div className="card sticky">
          <div className="spread"><h2>Policy</h2><button className="btn btn-ghost" onClick={() => setPolicy(DEFAULT)}>Reset</button></div>
          <p className="sub">Decline anything outside these bars.</p>
          <Slider label="Minimum FICO" min={FICO_OFF} max={800} step={5} value={policy.min_fico || FICO_OFF}
            display={policy.min_fico ? String(policy.min_fico) : 'No floor'} onChange={v => set({ min_fico: v <= FICO_OFF ? 0 : v })} />
          <Slider label="Maximum DTI" min={5} max={DTI_OFF} step={1} value={policy.max_dti >= 999 ? DTI_OFF : policy.max_dti}
            display={policy.max_dti >= 999 ? 'No cap' : `${policy.max_dti}%`} onChange={v => set({ max_dti: v >= DTI_OFF ? 999 : v })} />
          <Slider label="Minimum income" min={0} max={200000} step={5000} value={policy.min_income}
            display={policy.min_income ? `$${compact(policy.min_income)}` : 'None'} onChange={v => set({ min_income: v })} />
          <div className="control"><div className="control-head"><span className="kpi-label">Grades approved</span></div>
            <Toggles options={GRADES} on={policy.grades} onChange={grades => set({ grades })} /></div>
          <div className="control"><div className="control-head"><span className="kpi-label">Terms offered</span></div>
            <Toggles options={[36, 60]} on={policy.terms} onChange={terms => set({ terms })} label={t => `${t} mo`} /></div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-mist-gray)', margin: '8px 0 20px' }} />
          <Slider label="Reprice" min={0} max={500} step={25} value={policy.reprice_bps}
            display={policy.reprice_bps ? `+${policy.reprice_bps} bps` : 'Off'} onChange={v => set({ reprice_bps: v })} />
          <div className="control"><div className="control-head"><span className="kpi-label">Repriced grades</span></div>
            <Toggles options={GRADES} on={policy.reprice_grades} onChange={reprice_grades => set({ reprice_grades })} /></div>
          <p className="note">Repricing is static: it assumes no borrower walks away at the higher rate, so treat it as an upper bound.</p>
          {!valid && <p className="error">Approve at least one grade and one term.</p>}
        </div>

        <div style={{ opacity: sim.busy ? 0.6 : 1, transition: 'opacity 120ms' }}>
          {sim.error && <div className="card"><p className="error">{sim.error}</p></div>}
          {k && d && (
            <>
              <div className="grid g4" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
                <Kpi label="Lending kept" value={pct(share, 0)} delta={`${num(k.loans_issued)} loans`} />
                <Kpi label="Net return" value={pct(k.net_annualized_return, 2)} delta={`${pts(n(k.net_annualized_return) - n(b.net_annualized_return), 2)} vs today`} />
                <Kpi label="Charge-off rate" value={pct(k.charge_off_rate)} delta={`${pts(n(k.charge_off_rate) - n(b.charge_off_rate))} vs today`} />
                <Callout label="Profit change" value={usd(profitDelta, 0)}>{usd(k.realized_net_profit, 0)} total, against {usd(b.realized_net_profit, 0)} today.</Callout>
              </div>

              <div className="grid g2 section" style={{ marginTop: 24 }}>
                <div className="card">
                  <span className="tag">Declined by this policy</span>
                  <h2>{d.loans_issued === 0 ? 'This policy declines nothing'
                    : n(d.net_annualized_return) > n(d.treasury_benchmark_return)
                      ? `The ${compact(d.loans_issued)} loans you'd decline returned ${pct(d.net_annualized_return)}`
                      : `The ${compact(d.loans_issued)} loans you'd decline lost to Treasuries`}</h2>
                  <p className="sub">{d.loans_issued === 0 ? 'Move a control to see what a stricter policy gives up.'
                    : n(d.realized_net_profit) > 0
                      ? <>They were profitable: declining them gives up {usd(d.realized_net_profit, 0)} of realized profit on {usd(d.originations)} of lending. Tightening only pays when the declined loans earn less than the money could earn elsewhere.</>
                      : <>They lost {usd(-d.realized_net_profit, 0)}. Declining them is pure gain.</>}</p>
                  {r.repricing.extra_profit > 0 && <p className="note">Repricing {r.repricing.grades.join(', ')} by +{policy.reprice_bps} bps adds up to {usd(r.repricing.extra_profit, 0)}, before any borrower walks away.</p>}
                </div>
                <div className="card">
                  <span className="tag">Can't be priced from this data</span>
                  <h2>{policy.min_fico || policy.max_dti < 999
                    ? `${num(r.unpriced_applicants.rejected_applicants_clearing_bars)} rejected applicants clear these score and DTI bars`
                    : `${num(r.unpriced_applicants.rejected_applicants_clearing_bars)} rejected applicants have a usable credit score`}</h2>
                  <p className="sub">Abaci turned them down, so there are no outcomes to replay. Loosening policy is a forecast, not a measurement, and this lab won't pretend otherwise. The rejected file mixes FICO and VantageScore after 2013.</p>
                </div>
              </div>

              <div className="grid section" style={{ marginTop: 24 }}>
                <ChartCard
                  tags={['FICO floor sweep', 'Other bars held']}
                  title={`Return peaks at a floor of ${r.frontier.reduce((a, x) => (n(x.net_annualized_return) > n(a.net_annualized_return) ? x : a)).min_fico}, then falls`}
                  sub="Each dot is a FICO floor from 640 to 800, with your other settings held. Across: share of today's lending kept. Up: net return."
                  table={{ rows: r.frontier, cols: [
                    { key: 'min_fico', label: 'FICO floor' }, { key: 'share_of_originations', label: 'Lending kept', fmt: v => pct(v, 0), num: true },
                    { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true }, { key: 'realized_net_profit', label: 'Profit', fmt: v => usd(v), num: true },
                  ] }}
                >
                  <Frontier points={r.frontier.map(x => ({ x: x.share_of_originations, y: n(x.net_annualized_return) }))}
                    current={{ x: share, y: n(k.net_annualized_return) }} fmtX={v => pct(v, 0)} fmtY={v => pct(v, 1)}
                    labelFor={i => `FICO ${r.frontier[i].min_fico}: ${pct(r.frontier[i].net_annualized_return, 2)} return, ${pct(r.frontier[i].share_of_originations, 0)} of lending, ${usd(r.frontier[i].realized_net_profit)} profit`} />
                </ChartCard>
                <ChartCard
                  tags={['Under this policy']}
                  title="Return by grade on the loans you keep"
                  sub="Net annualized return, mature loans only."
                  table={{ rows: r.by_grade, cols: [
                    { key: 'loan__grade', label: 'Grade' }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
                    { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true }, { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true },
                  ] }}
                >
                  <BarChart rows={gradeBars} fmt={v => pct(v)} labelWidth={90} />
                </ChartCard>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
