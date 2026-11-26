import { api, useData, type Row } from '../api'
import { BarChart, ChartCard, type Bar } from '../components/charts'
import { Callout, Hero, Kpi, Loading } from '../components/ui'
import { PURPOSE, n, num, pct, pts, usd } from '../format'

const MIN_STATE_LOANS = 3000

async function load() {
  const [portfolio, grade, purpose, state, termAll, termSame, verification] = await Promise.all([
    api.saved('portfolio_mature'),
    api.saved('returns_by_grade'),
    api.saved('returns_by_purpose'),
    api.saved('returns_by_state'),
    api.query({ metrics: ['net_annualized_return', 'loans_issued'], group_by: ['loan__term_months'] }),
    api.query({ metrics: ['net_annualized_return', 'loans_issued'], group_by: ['loan__term_months'], filters: [{ dim: 'loan__vintage_year', op: 'in', value: [2010, 2011, 2012, 2013] }] }),
    api.query({ metrics: ['net_charge_off_rate', 'charge_off_rate', 'loans_issued'], group_by: ['loan__verification_status'] }),
  ])
  return { p: portfolio[0], grade, purpose, state, termAll, termSame, verification }
}

const by = (rows: Row[], metric: string): Row[] => [...rows].sort((a, b) => n(b[metric]) - n(a[metric]))

export default function Overview() {
  const { data, error } = useData('overview', load)
  if (!data) return <Loading error={error} />
  const { p, grade, purpose, state, termAll, termSame, verification } = data
  const tsy = n(p.treasury_benchmark_return)

  const bestGrade = by(grade, 'net_annualized_return')[0]
  const gradeBars: Bar[] = grade.map(r => ({
    label: `Grade ${r.loan__grade}`,
    value: n(r.net_annualized_return),
    tone: r.loan__grade === bestGrade.loan__grade ? 'highlight' : 'main',
    detail: <><b>Grade {String(r.loan__grade)}</b><div>Return {pct(r.net_annualized_return, 2)}</div><div>Charge-offs {pct(r.charge_off_rate)} of loans</div><div>{num(r.loans_issued)} loans</div></>,
  }))

  const purposes = by(purpose, 'excess_return_vs_treasury')
  const worstPurpose = purposes[purposes.length - 1]
  const purposeBars: Bar[] = purposes.map(r => ({
    label: PURPOSE[String(r.loan__purpose)] ?? String(r.loan__purpose),
    value: n(r.excess_return_vs_treasury),
    tone: n(r.excess_return_vs_treasury) < 0 ? 'loss' : r === worstPurpose ? 'highlight' : 'main',
    detail: <><b>{PURPOSE[String(r.loan__purpose)]}</b><div>Excess over Treasury {pts(r.excess_return_vs_treasury, 2)}</div><div>Return {pct(r.net_annualized_return, 2)}</div><div>{num(r.loans_issued)} loans</div></>,
  }))

  const states = by(state.filter(r => n(r.loans_issued) >= MIN_STATE_LOANS), 'net_annualized_return')
  const stateRows = [...states.slice(0, 5), ...states.slice(-5)]
  const stateBars: Bar[] = stateRows.map((r, i) => ({ label: String(r.loan__state), value: n(r.net_annualized_return), tone: i < 5 ? 'main' : i === stateRows.length - 1 ? 'highlight' : 'context' }))

  const term = (rows: Row[], t: number) => rows.find(r => n(r.loan__term_months) === t)
  const gapAll = n(term(termAll, 60)?.net_annualized_return) - n(term(termAll, 36)?.net_annualized_return)
  const gapSame = n(term(termSame, 60)?.net_annualized_return) - n(term(termSame, 36)?.net_annualized_return)
  const termBars: Bar[] = [
    { label: '36 mo · all years', value: n(term(termAll, 36)?.net_annualized_return), tone: 'context' },
    { label: '60 mo · all years', value: n(term(termAll, 60)?.net_annualized_return), tone: 'context' },
    { label: '36 mo · 2010–13', value: n(term(termSame, 36)?.net_annualized_return), tone: 'main' },
    { label: '60 mo · 2010–13', value: n(term(termSame, 60)?.net_annualized_return), tone: 'highlight' },
  ]

  const ver = [...verification].sort((a, b) => n(a.net_charge_off_rate) - n(b.net_charge_off_rate))
  const verBars: Bar[] = ver.map((r, i) => ({ label: String(r.loan__verification_status), value: n(r.net_charge_off_rate), tone: i === ver.length - 1 ? 'loss' : 'main' }))

  return (
    <>
      <Hero
        eyebrow="Question 1 · Which loans actually make us money?"
        title={<>Every grade made money. Grade {String(bestGrade.loan__grade)} made the most.</>}
        sub={<>On {usd(p.originations)} of mature loans Abaci earned {pct(p.net_annualized_return)} a year after every charge-off, {usd(p.realized_net_profit)} in all. The surprise is underneath: {PURPOSE[String(worstPurpose.loan__purpose)]?.toLowerCase()} loans {n(worstPurpose.excess_return_vs_treasury) < 0 ? 'earned less than a Treasury' : 'barely beat a Treasury'}, verified income flagged risk instead of reducing it, and the 60-month premium is mostly a calendar effect.</>}
      />
      <div className="grid g4">
        <Kpi label="Mature loans" value={num(p.loans_issued)} delta={`${usd(p.originations)} funded, 2007–2016`} />
        <Kpi label="Net annualized return" value={pct(p.net_annualized_return, 2)} delta={`after ${pct(p.net_charge_off_rate)} net charge-offs`} />
        <Kpi label="Charge-off rate" value={pct(p.charge_off_rate)} delta="of resolved loans" />
        <Callout label="Realized net profit" value={usd(p.realized_net_profit, 0)}>Cash back minus cash out, on loans whose full term has ended.</Callout>
      </div>

      <div className="grid g2 section">
        <ChartCard
          tags={['Mature vintages', 'Net of losses']}
          title={`Grade ${bestGrade.loan__grade} earned ${pct(bestGrade.net_annualized_return)}, the best of any grade`}
          sub={<>Net annualized return by grade. The line is the matched Treasury, {pct(tsy)}.</>}
          table={{ rows: grade, cols: [
            { key: 'loan__grade', label: 'Grade' }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
            { key: 'weighted_avg_interest_rate', label: 'Rate', fmt: v => pct(v), num: true }, { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true },
            { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true }, { key: 'excess_return_vs_treasury', label: 'vs Treasury', fmt: v => pts(v, 2), num: true },
          ] }}
          foot="Return = realized net profit ÷ principal-years outstanding. Higher grades were not safer per dollar of return: they were priced thinner."
        >
          <BarChart rows={gradeBars} fmt={v => pct(v)} refLine={{ value: tsy, label: 'Treasury' }} labelWidth={90} />
        </ChartCard>

        <ChartCard
          tags={['Mature vintages', 'Excess over Treasury']}
          title={n(worstPurpose.excess_return_vs_treasury) < 0
            ? `${PURPOSE[String(worstPurpose.loan__purpose)]} loans earned less than a Treasury`
            : `${PURPOSE[String(worstPurpose.loan__purpose)]} loans earned the thinnest premium`}
          sub="Return above the matched Treasury, by the purpose the borrower gave."
          table={{ rows: purposes, cols: [
            { key: 'loan__purpose', label: 'Purpose', fmt: v => PURPOSE[String(v)] ?? String(v) }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
            { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true }, { key: 'excess_return_vs_treasury', label: 'vs Treasury', fmt: v => pts(v, 2), num: true },
          ] }}
          foot={`Small business loans charged off at ${pct(purpose.find(r => r.loan__purpose === 'small_business')?.charge_off_rate)}, the highest rate of any large purpose.`}
        >
          <BarChart rows={purposeBars} fmt={v => pts(v)} labelWidth={150} valueWidth={80} />
        </ChartCard>
      </div>

      <div className="grid g2 section">
        <ChartCard
          tags={['Same vintages', 'Mix effect']}
          title={`The 60-month premium shrinks from ${pts(gapAll)} to ${pts(gapSame)} on the same years`}
          sub="Mature 60-month loans only exist for 2010–2014, Abaci's best years. Compare like with like and most of the gap is the calendar, not the term."
          table={{ rows: termBars.map(b => ({ label: b.label, value: b.value })), cols: [{ key: 'label', label: 'Slice' }, { key: 'value', label: 'Return', fmt: v => pct(v, 2), num: true }] }}
          foot="A 60-month loan issued after March 2014 had not finished its term by the March 2019 data cut, so it is excluded from every return figure."
        >
          <BarChart rows={termBars} fmt={v => pct(v)} labelWidth={150} />
        </ChartCard>

        <ChartCard
          tags={['Mature vintages', 'Counter-intuitive']}
          title={`Verified-income loans lost the most: ${pct(ver[ver.length - 1].net_charge_off_rate)} of dollars`}
          sub="Net charge-off rate by income verification. Verification was triggered on riskier applications, so it marks risk rather than reducing it."
          table={{ rows: verification, cols: [
            { key: 'loan__verification_status', label: 'Verification' }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
            { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true }, { key: 'net_charge_off_rate', label: 'Net loss rate', fmt: v => pct(v, 2), num: true },
          ] }}
        >
          <BarChart rows={verBars} fmt={v => pct(v)} labelWidth={150} />
        </ChartCard>
      </div>

      <div className="section">
        <ChartCard
          tags={[`States with ${num(MIN_STATE_LOANS)}+ mature loans`]}
          title={`${stateRows[0]?.loan__state} returned ${pct(stateRows[0]?.net_annualized_return)}; ${stateRows[stateRows.length - 1]?.loan__state} returned ${pct(stateRows[stateRows.length - 1]?.net_annualized_return)}`}
          sub="The five best and five worst states by net annualized return. Same products, same pricing grid: the spread is local credit performance."
          table={{ rows: states, cols: [
            { key: 'loan__state', label: 'State' }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
            { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true }, { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true },
          ] }}
        >
          <BarChart rows={stateBars} fmt={v => pct(v)} labelWidth={60} />
        </ChartCard>
      </div>
    </>
  )
}
