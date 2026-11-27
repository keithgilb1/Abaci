import type { Meta, StoryObj } from '@storybook/react-vite'
import { num, pct, pts, usd } from '../format'
import { BarChart, Callout, ChartFrame, ColumnChart, Grid, Hero, LineChart, Nav, Stat, type Tone } from '../ui'
import fx from './fixtures.json'

const p = fx.portfolio, g = fx.byGrade, v = fx.byVintage
const best = [...g].sort((a, b) => b.net_annualized_return - a.net_annualized_return)[0]
const years = v.map(r => r.metric_time__year.slice(0, 4))
const bestV = v.reduce((bi, r, i) => (r.excess_return_vs_treasury > v[bi].excess_return_vs_treasury ? i : bi), 0)
const losers = v.filter(r => r.excess_return_vs_treasury < 0)

function DashboardPage() {
  return (
    <>
      <Nav brand="Abaci" activeId="overview" items={['Overview', 'Pricing', 'Policy Lab', 'vs Treasury', 'Ask Abaci'].map(l => ({ id: l === 'Overview' ? 'overview' : l, label: l, href: '#' }))} />
      <main style={{ maxWidth: 'var(--page-max-width)', margin: '0 auto', padding: '24px 24px 96px' }}>
        <Hero
          eyebrow="Question 1 · Which loans actually make us money?"
          title={<>Every grade made money. Grade {best.loan__grade} made the most.</>}
          sub={<>On {usd(p.originations)} of mature loans Abaci earned {pct(p.net_annualized_return)} a year after every charge-off, {usd(p.realized_net_profit)} in all.</>}
        />
        <Grid cols={4}>
          <Stat label="Mature loans" value={num(p.loans_issued)} delta={`${usd(p.originations)} funded`} />
          <Stat label="Net annualized return" value={pct(p.net_annualized_return, 2)} delta={`after ${pct(p.net_charge_off_rate)} net charge-offs`} />
          <Stat label="Charge-off rate" value={pct(p.charge_off_rate)} delta="of resolved loans" />
          <Callout label="Realized net profit" value={usd(p.realized_net_profit, 0)}>Cash back minus cash out, on loans whose full term has ended.</Callout>
        </Grid>
        <Grid cols={2} spaced="section">
          <ChartFrame tags={['Mature vintages', 'Net of losses']}
            title={`Grade ${best.loan__grade} earned ${pct(best.net_annualized_return)}, the best of any grade`}
            sub={<>Net annualized return by grade. The line is the matched Treasury, {pct(p.treasury_benchmark_return)}.</>}
            table={{ rows: g, cols: [{ key: 'loan__grade', label: 'Grade' }, { key: 'net_annualized_return', label: 'Return', fmt: x => pct(x, 2), num: true }] }}>
            <BarChart labelWidth={90} fmt={x => pct(x)} refLine={{ value: p.treasury_benchmark_return, label: 'Treasury' }}
              rows={g.map(r => ({ label: `Grade ${r.loan__grade}`, value: r.net_annualized_return, tone: r === best ? 'highlight' : 'main' }))} />
          </ChartFrame>
          <ChartFrame tags={['Mature vintages']}
            title={`The ${years[bestV]} vintage beat Treasuries by the most: ${pts(v[bestV].excess_return_vs_treasury)}`}
            sub={`Excess return over the matched Treasury, by issue year. ${losers.length} vintages lost to a Treasury.`}
            table={{ rows: v, cols: [{ key: 'metric_time__year', label: 'Vintage', fmt: x => String(x).slice(0, 4) }, { key: 'excess_return_vs_treasury', label: 'Excess', fmt: x => pts(x, 2), num: true }] }}>
            <ColumnChart labels={years} fmt={x => pct(x, 0)} values={v.map(r => r.excess_return_vs_treasury)}
              tones={v.map((r, i): Tone => (r.excess_return_vs_treasury < 0 ? 'loss' : i === bestV ? 'highlight' : 'main'))} />
          </ChartFrame>
        </Grid>
        <Grid spaced="section">
          <ChartFrame tags={['Priced vs earned']} title="Losses ate a growing share of the price after 2013"
            sub="What each vintage was priced above Treasuries, against what it actually lost.">
            <LineChart labels={years} fmt={x => pct(x, 0)} series={[
              { name: 'Priced spread', tone: 'main', values: v.map(r => r.priced_spread_over_treasury) },
              { name: 'Net loss', tone: 'loss', values: v.map(r => r.net_charge_off_rate) },
            ]} />
          </ChartFrame>
        </Grid>
      </main>
    </>
  )
}

const meta = {
  title: 'Patterns/Dashboard page',
  component: DashboardPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardPage>
export default meta

/**
 * A page put together from the library, on real figures: nav pill, one poster headline, a KPI row with ONE Voltage
 * callout, then chart cards whose titles state the finding. This is how the Overview and vs Treasury screens are built.
 */
export const Overview: StoryObj<typeof meta> = {}
