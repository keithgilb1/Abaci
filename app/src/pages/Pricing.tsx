import { api, useData, type Row } from '../api'
import { HINT } from '../hint'
import { Callout, Card, ChartFrame, ColumnChart, DataTable, Grid, Hero, LineChart, LoadState, Stat, type Column, type Tone } from '../ui'
import { n, num, pct, pts, year } from '../format'

const HIGH = ['E', 'F', 'G']
const MIN_VINTAGE = 1000
const GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

async function load() {
  const metrics = ['priced_spread_over_treasury', 'net_charge_off_rate', 'net_annualized_return', 'charge_off_rate', 'loans_issued']
  const [grid, high, low] = await Promise.all([
    api.saved('returns_by_vintage_grade'),
    api.query({ metrics, group_by: ['metric_time__year'], filters: [{ dim: 'loan__grade', op: 'in', value: HIGH }], order_by: [{ field: 'metric_time__year' }] }),
    api.query({ metrics, group_by: ['metric_time__year'], filters: [{ dim: 'loan__grade', op: 'in', value: ['A', 'B'] }], order_by: [{ field: 'metric_time__year' }] }),
  ])
  return { grid, high, low }
}

export default function Pricing() {
  const { data, error } = useData('pricing', load)
  if (!data) return <LoadState error={error} hint={HINT} />
  // Tell the story on vintages big enough to trust: 1,000+ high-risk loans.
  const high = data.high.filter(r => n(r.loans_issued) >= MIN_VINTAGE)
  const { grid, low } = data
  const years = high.map(r => year(r.metric_time__year))
  const worst = high.reduce((a, b) => (n(b.net_annualized_return) < n(a.net_annualized_return) ? b : a))
  const peak = high.reduce((a, b) => (n(b.net_annualized_return) > n(a.net_annualized_return) ? b : a))
  const worstIdx = high.indexOf(worst)
  const lost = n(worst.net_annualized_return) < 0
  const margin = (r?: Row) => n(r?.priced_spread_over_treasury) - n(r?.net_charge_off_rate)

  const cell = (g: string, y: string) => grid.find(r => r.loan__grade === g && year(r.metric_time__year) === y)
  const gridYears = [...new Set(grid.map(r => year(r.metric_time__year)))]
  const pairs = gridYears.map(y => [cell('F', y), cell('G', y)]).filter(([f, g]) => f && g && n(g.loans_issued) >= 100)
  const gVsF = { behind: pairs.filter(([f, g]) => n(g?.net_annualized_return) < n(f?.net_annualized_return)).length, total: pairs.length }
  const gLoans = grid.filter(r => r.loan__grade === 'G').reduce((s, r) => s + n(r.loans_issued), 0)

  const heatCols: Column<{ grade: string }>[] = [
    { key: 'grade', label: 'Grade', render: r => <b>{r.grade}</b> },
    ...gridYears.map((y): Column<{ grade: string }> => ({
      key: y, label: y, num: true,
      render: ({ grade }) => { const r = cell(grade, y); return r ? pct(n(r.net_annualized_return)) : '' },
      cellTitle: ({ grade }) => { const r = cell(grade, y); return r ? `${num(r.loans_issued)} loans, spread ${pct(r.priced_spread_over_treasury)}` : undefined },
      cellStyle: ({ grade }) => {
        const r = cell(grade, y)
        if (!r) return undefined
        return {
          background: n(r.net_annualized_return) < 0 ? 'color-mix(in srgb, var(--chart-loss) 12%, transparent)' : undefined,
          color: n(r.loans_issued) < 100 ? 'var(--chart-tertiary)' : undefined,
        }
      },
    })),
  ]

  return (
    <>
      <Hero
        eyebrow="Question 2 · Are we pricing risk correctly?"
        title={lost ? <>Grades E–G written in {year(worst.metric_time__year)} lost money.</> : <>Grades E–G earned least in {year(worst.metric_time__year)}.</>}
        sub={<>In {year(peak.metric_time__year)} Abaci charged high-risk borrowers {pct(peak.priced_spread_over_treasury, 0)} over Treasuries and lost {pct(peak.net_charge_off_rate, 0)} of every dollar lent. By {year(worst.metric_time__year)} the price was {pct(worst.priced_spread_over_treasury, 0)} and the loss was {pct(worst.net_charge_off_rate, 0)}. The price barely moved; the borrowers got worse, and the grade label didn't notice.</>}
      />
      <Grid cols={4}>
        <Stat label={`E–G spread, ${year(peak.metric_time__year)}`} value={pct(peak.priced_spread_over_treasury)} delta={`net loss ${pct(peak.net_charge_off_rate)}`} />
        <Stat label={`E–G spread, ${year(worst.metric_time__year)}`} value={pct(worst.priced_spread_over_treasury)} delta={`net loss ${pct(worst.net_charge_off_rate)}`} />
        <Stat label="E–G charge-off rate" value={pct(worst.charge_off_rate, 0)} delta={`${year(worst.metric_time__year)} vintage, ${num(worst.loans_issued)} loans`} />
        <Callout label={`E–G return, ${year(worst.metric_time__year)} vintage`} value={pct(worst.net_annualized_return)}>
          Down from {pct(peak.net_annualized_return)} for the {year(peak.metric_time__year)} vintage. The margin between price and loss fell from {pts(margin(peak), 0)} to {pts(margin(worst), 0)}.
        </Callout>
      </Grid>

      <Grid cols={2} spaced="section">
        <ChartFrame
          tags={['Grades E–G', 'Vintages with 1,000+ loans']}
          title={`By ${year(worst.metric_time__year)}, losses had eaten ${pct(n(worst.net_charge_off_rate) / n(worst.priced_spread_over_treasury), 0)} of the price`}
          sub="What Abaci charged over Treasuries against what it lost, both as a share of dollars lent. The gap between the lines is the margin."
          table={{ rows: high, cols: [
            { key: 'metric_time__year', label: 'Vintage', fmt: year }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
            { key: 'priced_spread_over_treasury', label: 'Priced spread', fmt: v => pct(v), num: true }, { key: 'net_charge_off_rate', label: 'Net loss', fmt: v => pct(v), num: true },
          ] }}
          foot="Priced spread is annual; net loss is lifetime. A loan that defaults in year two loses principal it was never paid enough interest to cover."
        >
          <LineChart labels={years} fmt={v => pct(v, 0)} series={[
            { name: 'Priced spread', tone: 'main', values: high.map(r => n(r.priced_spread_over_treasury)) },
            { name: 'Net loss', tone: 'loss', values: high.map(r => n(r.net_charge_off_rate)) },
          ]} />
        </ChartFrame>

        <ChartFrame
          tags={['Grades E–G', 'Vintages with 1,000+ loans']}
          title={lost ? `The ${year(worst.metric_time__year)} high-risk book returned ${pct(worst.net_annualized_return)}` : `High-risk returns bottomed at ${pct(worst.net_annualized_return)}`}
          sub={<>Net annualized return on grades E–G by vintage. Grades A–B, for contrast, never fell below {pct(Math.min(...low.map(r => n(r.net_annualized_return))))}.</>}
          table={{ rows: high, cols: [
            { key: 'metric_time__year', label: 'Vintage', fmt: year }, { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true },
            { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true },
          ] }}
        >
          <ColumnChart labels={years} fmt={v => pct(v, 0)} values={high.map(r => n(r.net_annualized_return))}
            tones={high.map((r, i): Tone => (n(r.net_annualized_return) < 0 ? 'loss' : i === worstIdx ? 'highlight' : 'main'))} />
        </ChartFrame>
      </Grid>

      <Grid spaced="section">
        <Card
          tags={['Mature vintages', 'Net annualized return']}
          title="Every grade's return fell after 2013; the riskiest fell furthest"
          sub="Net annualized return by grade and issue year. Shaded cells lost money. Blank cells had no mature loans."
          foot={<>
            Grey figures rest on fewer than 100 loans. The first pass found grade G earning less than F overall. Year by year, G trailed F in {gVsF.behind} of {gVsF.total} vintages,
            so on about {num(gLoans)} mature G loans that gap is {gVsF.behind * 2 > gVsF.total ? 'a consistent pattern' : 'not a consistent pattern'}. The vintage effect is far larger than the grade effect.
          </>}
        >
          <DataTable rows={GRADES.map(g => ({ grade: g }))} cols={heatCols} maxHeight="none" rowHeader caption="Net annualized return by grade and vintage" />
        </Card>
      </Grid>
    </>
  )
}
