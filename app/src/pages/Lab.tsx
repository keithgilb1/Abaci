import { useEffect, useRef, useState } from 'react'
import { api, useData, type LabResult } from '../api'
import { HINT } from '../hint'
import { BarChart, Button, Callout, Card, ChartFrame, Divider, Field, FrontierChart, Grid, Hero, LoadState, Note, SegmentedControl, Slider, Stat, type Bar } from '../ui'
import { compact, n, num, pct, pts, usd } from '../format'

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
type Policy = { min_fico: number; max_dti: number; min_income: number; grades: string[]; terms: number[]; reprice_bps: number; reprice_grades: string[] }
const DEFAULT: Policy = { min_fico: 0, max_dti: 999, min_income: 0, grades: GRADES, terms: [36, 60], reprice_bps: 0, reprice_grades: ['E', 'F', 'G'] }
const FICO_OFF = 640, DTI_OFF = 41

const GRADE_OPTIONS = GRADES.map(g => ({ value: g }))
const TERM_OPTIONS = [36, 60].map(t => ({ value: String(t), label: `${t} mo` }))

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

  if (!base.data) return <LoadState error={base.error} hint={HINT} />
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
      <Grid cols="sidebar">
        <Card sticky title="Policy" sub="Decline anything outside these bars."
          action={<Button variant="ghost" size="sm" onClick={() => setPolicy(DEFAULT)}>Reset</Button>}>
          <Slider label="Minimum FICO" min={FICO_OFF} max={800} step={5} value={policy.min_fico || FICO_OFF}
            display={policy.min_fico ? String(policy.min_fico) : 'No floor'} onValueChange={v => set({ min_fico: v <= FICO_OFF ? 0 : v })} />
          <Slider label="Maximum DTI" min={5} max={DTI_OFF} step={1} value={policy.max_dti >= 999 ? DTI_OFF : policy.max_dti}
            display={policy.max_dti >= 999 ? 'No cap' : `${policy.max_dti}%`} onValueChange={v => set({ max_dti: v >= DTI_OFF ? 999 : v })} />
          <Slider label="Minimum income" min={0} max={200000} step={5000} value={policy.min_income}
            display={policy.min_income ? `$${compact(policy.min_income)}` : 'None'} onValueChange={v => set({ min_income: v })} />
          <Field label="Grades approved">
            <SegmentedControl type="multiple" label="Grades approved" options={GRADE_OPTIONS} value={policy.grades} onValueChange={grades => set({ grades })} />
          </Field>
          <Field label="Terms offered">
            <SegmentedControl type="multiple" label="Terms offered" options={TERM_OPTIONS} value={policy.terms.map(String)} onValueChange={terms => set({ terms: terms.map(Number) })} />
          </Field>
          <Divider />
          <Slider label="Reprice" min={0} max={500} step={25} value={policy.reprice_bps}
            display={policy.reprice_bps ? `+${policy.reprice_bps} bps` : 'Off'} onValueChange={v => set({ reprice_bps: v })} />
          <Field label="Repriced grades">
            <SegmentedControl type="multiple" label="Repriced grades" options={GRADE_OPTIONS} value={policy.reprice_grades} onValueChange={reprice_grades => set({ reprice_grades })} />
          </Field>
          <Note>Repricing is static: it assumes no borrower walks away at the higher rate, so treat it as an upper bound.</Note>
          {!valid && <Note tone="error">Approve at least one grade and one term.</Note>}
        </Card>

        <div style={{ opacity: sim.busy ? 0.6 : 1, transition: 'opacity 120ms' }} aria-busy={sim.busy}>
          {sim.error && <Card><Note tone="error">{sim.error}</Note></Card>}
          {k && d && (
            <>
              <Grid cols={4}>
                <Stat label="Lending kept" value={pct(share, 0)} delta={`${num(k.loans_issued)} loans`} />
                <Stat label="Net return" value={pct(k.net_annualized_return, 2)} delta={`${pts(n(k.net_annualized_return) - n(b.net_annualized_return), 2)} vs today`} />
                <Stat label="Charge-off rate" value={pct(k.charge_off_rate)} delta={`${pts(n(k.charge_off_rate) - n(b.charge_off_rate))} vs today`} />
                <Callout label="Profit change" value={usd(profitDelta, 0)}>{usd(k.realized_net_profit, 0)} total, against {usd(b.realized_net_profit, 0)} today.</Callout>
              </Grid>

              <Grid cols={2} spaced="tight">
                <Card
                  tags={['Declined by this policy']}
                  title={d.loans_issued === 0 ? 'This policy declines nothing'
                    : n(d.net_annualized_return) > n(d.treasury_benchmark_return)
                      ? `The ${compact(d.loans_issued)} loans you'd decline returned ${pct(d.net_annualized_return)}`
                      : `The ${compact(d.loans_issued)} loans you'd decline lost to Treasuries`}
                  sub={d.loans_issued === 0 ? 'Move a control to see what a stricter policy gives up.'
                    : n(d.realized_net_profit) > 0
                      ? <>They were profitable: declining them gives up {usd(d.realized_net_profit, 0)} of realized profit on {usd(d.originations)} of lending. Tightening only pays when the declined loans earn less than the money could earn elsewhere.</>
                      : <>They lost {usd(-d.realized_net_profit, 0)}. Declining them is pure gain.</>}
                >
                  {r.repricing.extra_profit > 0 && <Note>Repricing {r.repricing.grades.join(', ')} by +{policy.reprice_bps} bps adds up to {usd(r.repricing.extra_profit, 0)}, before any borrower walks away.</Note>}
                </Card>
                <Card
                  tags={["Can't be priced from this data"]}
                  title={policy.min_fico || policy.max_dti < 999
                    ? `${num(r.unpriced_applicants.rejected_applicants_clearing_bars)} rejected applicants clear these score and DTI bars`
                    : `${num(r.unpriced_applicants.rejected_applicants_clearing_bars)} rejected applicants have a usable credit score`}
                  sub="Abaci turned them down, so there are no outcomes to replay. Loosening policy is a forecast, not a measurement, and this lab won't pretend otherwise. The rejected file mixes FICO and VantageScore after 2013."
                />
              </Grid>

              <Grid spaced="tight">
                <ChartFrame
                  tags={['FICO floor sweep', 'Other bars held']}
                  title={`Return peaks at a floor of ${r.frontier.reduce((a, x) => (n(x.net_annualized_return) > n(a.net_annualized_return) ? x : a)).min_fico}, then falls`}
                  sub="Each dot is a FICO floor from 640 to 800, with your other settings held. Across: share of today's lending kept. Up: net return."
                  table={{ rows: r.frontier, cols: [
                    { key: 'min_fico', label: 'FICO floor' }, { key: 'share_of_originations', label: 'Lending kept', fmt: v => pct(v, 0), num: true },
                    { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true }, { key: 'realized_net_profit', label: 'Profit', fmt: v => usd(v), num: true },
                  ] }}
                >
                  <FrontierChart points={r.frontier.map(x => ({ x: x.share_of_originations, y: n(x.net_annualized_return) }))}
                    current={{ x: share, y: n(k.net_annualized_return) }} fmtX={v => pct(v, 0)} fmtY={v => pct(v, 1)}
                    labelFor={i => `FICO ${r.frontier[i].min_fico}: ${pct(r.frontier[i].net_annualized_return, 2)} return, ${pct(r.frontier[i].share_of_originations, 0)} of lending, ${usd(r.frontier[i].realized_net_profit)} profit`} />
                </ChartFrame>
                <ChartFrame
                  tags={['Under this policy']}
                  title="Return by grade on the loans you keep"
                  sub="Net annualized return, mature loans only."
                  table={{ rows: r.by_grade, cols: [
                    { key: 'loan__grade', label: 'Grade' }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
                    { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true }, { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true },
                  ] }}
                >
                  <BarChart rows={gradeBars} fmt={v => pct(v)} labelWidth={90} />
                </ChartFrame>
              </Grid>
            </>
          )}
        </div>
      </Grid>
    </>
  )
}
