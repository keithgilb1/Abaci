import { api, useData } from '../api'
import { ChartCard, ColumnChart, LineChart, type Tone } from '../components/charts'
import { Callout, Hero, Kpi, Loading } from '../components/ui'
import { n, num, pct, pts, usd, year } from '../format'

async function load() {
  const [p, v] = await Promise.all([api.saved('portfolio_mature'), api.saved('returns_vs_treasury_by_vintage')])
  return { p: p[0], v }
}

export default function Treasury() {
  const { data, error } = useData('treasury', load)
  if (!data) return <Loading error={error} />
  const { p, v } = data
  const years = v.map(r => year(r.metric_time__year))
  const losers = v.filter(r => n(r.excess_return_vs_treasury) < 0)
  const best = v.reduce((a, b) => (n(b.excess_return_vs_treasury) > n(a.excess_return_vs_treasury) ? b : a))
  const bestIdx = v.indexOf(best)
  const last = v[v.length - 1]
  const kept = (r: typeof last) => n(r.excess_return_vs_treasury) / n(r.priced_spread_over_treasury)
  const multiple = n(p.net_annualized_return) / n(p.treasury_benchmark_return)

  return (
    <>
      <Hero
        eyebrow="Question 4 · Was this loan worth it versus a Treasury?"
        title={<>Loans returned {pct(p.net_annualized_return)} a year. Treasuries paid {pct(p.treasury_benchmark_return)}.</>}
        sub={<>Every mature loan is measured against a Treasury of the same term bought in the same month: the 3-year note for 36-month loans, the 5-year for 60-month. After every charge-off, the book earned about {multiple.toFixed(0)}× the risk-free rate. That gap is what Abaci was paid for credit risk.</>}
      />
      <div className="grid g4">
        <Kpi label="Net annualized return" value={pct(p.net_annualized_return, 2)} delta="mature loans, after losses" />
        <Kpi label="Matched Treasury" value={pct(p.treasury_benchmark_return, 2)} delta="same term, same month, same dollars" />
        <Kpi label="Vintages that lost to Treasuries" value={`${losers.length} of ${v.length}`} delta={losers.length ? losers.map(r => year(r.metric_time__year)).join(', ') : 'none'} />
        <Callout label="Excess return vs Treasury" value={pts(p.excess_return_vs_treasury)}>
          A year, on {usd(p.originations)} lent. Credit risk paid.
        </Callout>
      </div>

      <div className="grid g2 section">
        <ChartCard
          tags={['Mature vintages', 'Principal-weighted']}
          title={losers.length === 1 ? `Only the ${year(losers[0].metric_time__year)} vintage lost to a Treasury` : `${losers.length} vintages lost to a Treasury`}
          sub="Net annualized return on loans against the matched Treasury yield, by issue year."
          table={{ rows: v, cols: [
            { key: 'metric_time__year', label: 'Vintage', fmt: year }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
            { key: 'net_annualized_return', label: 'Loans', fmt: x => pct(x, 2), num: true }, { key: 'treasury_benchmark_return', label: 'Treasury', fmt: x => pct(x, 2), num: true },
          ] }}
          foot={`The ${year(v[0].metric_time__year)} book was written when the matched Treasury paid ${pct(v[0].treasury_benchmark_return)}, then resolved through the recession.`}
        >
          <LineChart labels={years} fmt={x => pct(x, 0)} series={[
            { name: 'Loans', tone: 'main', values: v.map(r => n(r.net_annualized_return)) },
            { name: 'Treasury', tone: 'compare', values: v.map(r => n(r.treasury_benchmark_return)) },
          ]} highlight={{ series: 0, index: bestIdx, label: `${year(best.metric_time__year)}: ${pct(best.net_annualized_return)}` }} />
        </ChartCard>

        <ChartCard
          tags={['Mature vintages']}
          title={`The ${year(best.metric_time__year)} vintage beat Treasuries by the most: ${pts(best.excess_return_vs_treasury)}`}
          sub="Excess return over the matched Treasury, by issue year."
          table={{ rows: v, cols: [{ key: 'metric_time__year', label: 'Vintage', fmt: year }, { key: 'excess_return_vs_treasury', label: 'Excess', fmt: x => pts(x, 2), num: true }] }}
        >
          <ColumnChart labels={years} fmt={x => pct(x, 0)} values={v.map(r => n(r.excess_return_vs_treasury))}
            tones={v.map((r, i): Tone => (n(r.excess_return_vs_treasury) < 0 ? 'loss' : i === bestIdx ? 'highlight' : 'main'))} />
        </ChartCard>
      </div>

      <div className="grid g2 section">
        <ChartCard
          tags={['Priced vs earned']}
          title={`In ${year(last.metric_time__year)} Abaci priced ${pts(last.priced_spread_over_treasury)} over Treasuries and kept ${pts(last.excess_return_vs_treasury)}`}
          sub="What each vintage was priced above Treasuries, against what it actually earned above them after losses."
          table={{ rows: v, cols: [
            { key: 'metric_time__year', label: 'Vintage', fmt: year }, { key: 'priced_spread_over_treasury', label: 'Priced', fmt: x => pts(x), num: true },
            { key: 'excess_return_vs_treasury', label: 'Earned', fmt: x => pts(x), num: true }, { key: 'net_charge_off_rate', label: 'Net loss', fmt: x => pct(x), num: true },
          ] }}
          foot={`Share of the priced spread that survived losses: ${pct(kept(best), 0)} in ${year(best.metric_time__year)}, ${pct(kept(last), 0)} in ${year(last.metric_time__year)}.`}
        >
          <LineChart labels={years} fmt={x => pct(x, 0)} series={[
            { name: 'Priced spread', tone: 'compare', values: v.map(r => n(r.priced_spread_over_treasury)) },
            { name: 'Earned over Treasury', tone: 'main', values: v.map(r => n(r.excess_return_vs_treasury)) },
          ]} />
        </ChartCard>

        <div className="card">
          <span className="tag">Method</span>
          <h2>How the benchmark is built</h2>
          <p className="sub">One governed definition, in <code>metrics.yml</code>, used by every screen and by Ask Abaci.</p>
          <ul className="note" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li><b>Loan return</b> is realized net profit ÷ principal-years outstanding. Interest received ÷ rate recovers balance × time exactly, so a loan that defaults in month two counts for two months of exposure, not three years.</li>
            <li><b>Treasury return</b> is the FRED constant-maturity yield (DGS3 or DGS5) in the issue month, weighted by the same principal-years.</li>
            <li><b>Mature only.</b> A vintage counts once its full term ended before the March 2019 data cut. Younger loans resolve early, which skews them toward defaults and prepayments.</li>
            <li><b>Not included:</b> servicing cost, funding cost and taxes. This is the gross credit premium, before Abaci runs the business.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
