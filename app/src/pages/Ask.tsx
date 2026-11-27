import { useState } from 'react'
import { api, useData, type AskResult, type Row } from '../api'
import { BarChart, Button, Card, CodeBlock, ColumnChart, DataTable, Grid, Hero, Label, LineChart, Note, PromptInput, Tabs, type Column, type TabItem } from '../ui'
import { num, pct, usd } from '../format'

const EXAMPLES = [
  'Which grade made us the most money per dollar lent?',
  'Is our pricing keeping up with losses by grade?',
  'How did the 2016 vintage do by grade?',
  'Which 5 states lost the most to charge-offs as a share of dollars?',
  'What share of applicants did we approve each year?',
  'Show me the names of borrowers who defaulted in Nevada',
]
const PERCENT = new Set(['weighted_avg_interest_rate', 'priced_spread_over_treasury', 'charge_off_rate', 'net_charge_off_rate', 'net_annualized_return', 'treasury_benchmark_return', 'excess_return_vs_treasury', 'approval_rate'])
const DOLLARS = new Set(['originations', 'realized_net_profit'])
const fmtFor = (m: string) => (v: unknown) => (PERCENT.has(m) ? pct(v, 2) : DOLLARS.has(m) ? usd(v) : num(v))

function hasChart(res: AskResult) {
  const spec = res.spec as { group_by?: string[] } | undefined
  const rows = res.rows ?? []
  return Boolean(spec?.group_by?.length) && rows.length >= 2 && rows.length <= 60
}

function AutoChart({ res }: { res: AskResult }) {
  const spec = res.spec as { metrics: string[]; group_by?: string[] } | undefined
  const rows = res.rows ?? []
  if (!spec?.group_by?.length || !hasChart(res)) return null
  const key = spec.group_by[0], m = spec.metrics[0], f = fmtFor(m) as (v: number) => string
  const labels = rows.map(r => String(r[key]))
  const values = rows.map(r => (r[m] == null ? null : Number(r[m])))
  if (key.startsWith('metric_time')) {
    return <LineChart labels={labels} fmt={f} labelEvery={Math.ceil(labels.length / 10)}
      series={spec.metrics.slice(0, 2).map((mm, i) => ({ name: mm.replaceAll('_', ' '), tone: i ? 'compare' : 'main', values: rows.map(r => (r[mm] == null ? null : Number(r[mm]))) }))} />
  }
  if (rows.length <= 20) {
    const max = Math.max(...values.map(v => v ?? -Infinity))
    return <BarChart fmt={f} labelWidth={150} rows={rows.map((_, i) => ({ label: labels[i], value: values[i], tone: (values[i] ?? 0) < 0 && PERCENT.has(m) && m.includes('return') ? 'loss' : values[i] === max ? 'highlight' : 'main' }))} />
  }
  return <ColumnChart labels={labels} values={values} fmt={f} labelEvery={Math.ceil(labels.length / 12)} />
}

function Answer({ res }: { res: AskResult }) {
  if (res.unsupported) return (
    <Card tags={['Declined']}>
      <p className="ab-answer">I can't answer that from the loan book.</p>
      <p className="ab-card-sub">{res.unsupported}</p>
      <CodeBlock label="Model output">{res.model_output}</CodeBlock>
    </Card>
  )
  if (res.error) return (
    <Card tags={['No answer']}>
      <p className="ab-answer">{res.error}</p>
      {res.model_output && <CodeBlock label="Model output">{res.model_output}</CodeBlock>}
    </Card>
  )
  const rows = (res.rows ?? []) as Row[]
  const cols: Column[] = rows.length ? Object.keys(rows[0]).map(k => ({ key: k, label: k.replace(/^(loan|application|metric_time)__/, '').replaceAll('_', ' '), fmt: fmtFor(k), num: typeof rows[0][k] === 'number' && !k.includes('__') })) : []
  const tags = [
    ...((res.spec?.metrics as string[] | undefined) ?? []).map(m => m.replaceAll('_', ' ')),
    ...((res.spec?.group_by as string[] | undefined) ?? []).map(g => `by ${g.split('__')[1]}`),
  ]
  const chart = <AutoChart res={res} />
  const views: TabItem[] = [
    ...(hasChart(res) ? [{ value: 'chart', label: 'Chart', content: chart }] : []),
    { value: 'table', label: `Table (${res.row_count ?? rows.length} rows)`, content: <DataTable cols={cols} rows={rows} caption={res.question} /> },
    { value: 'spec', label: 'Query spec', content: <CodeBlock label="Query spec">{JSON.stringify(res.spec, null, 2)}</CodeBlock> },
    { value: 'sql', label: 'Compiled SQL', content: <CodeBlock label="Compiled SQL">{res.sql}</CodeBlock> },
  ]
  return (
    <Card tags={tags}>
      <p className="ab-answer">{res.answer}</p>
      {res.notes?.map(nn => <Note key={nn}>{nn}</Note>)}
      <Tabs label="Answer detail" size="sm" items={views} />
      <Note style={{ marginTop: 12 }}>{res.adapter ? 'Fine-tuned' : 'Base model'} · model {((res.generate_ms ?? 0) / 1000).toFixed(1)}s · total {((res.total_ms ?? 0) / 1000).toFixed(1)}s</Note>
    </Card>
  )
}

export default function Ask() {
  const health = useData('health', api.health)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<AskResult[]>([])
  const submit = async (question: string) => {
    if (!question.trim() || busy) return
    setBusy(true); setQ(question)
    try { const res = await api.ask(question); setHistory(h => [res, ...h]) }
    catch (e) { setHistory(h => [{ question, adapter: false, error: String((e as Error).message) }, ...h]) }
    finally { setBusy(false) }
  }
  const h = health.data
  return (
    <>
      <Hero
        eyebrow="Ask Abaci · a local analyst"
        title={<>Ask the loan book. Every number is governed.</>}
        sub={<>A 3-billion-parameter model fine-tuned on this semantic layer turns your question into a query spec. It never writes SQL and never states a number: MetricFlow compiles the spec, DuckDB runs it, and code writes the sentence. It runs on this laptop.</>}
      />
      <PromptInput value={q} onValueChange={setQ} onSubmit={submit} busy={busy}
        placeholder="e.g. Which grade made us the most money per dollar lent?" />
      <div className="row" style={{ margin: '16px 0 8px' }}>
        {EXAMPLES.map(e => <Button key={e} variant="chip" onClick={() => submit(e)} disabled={busy}>{e}</Button>)}
      </div>
      {h && !h.ask_available && <Note tone="error">{h.ask_detail}</Note>}
      {h && h.ask_available && !h.ask_adapter && <Note>No fine-tuned adapter found, so the base model is answering. Run <code>make ask-train</code>.</Note>}
      <Grid spaced="tight">
        {history.map((res, i) => (
          <div key={history.length - i}>
            <Label as="p" style={{ margin: '0 0 8px' }}>{res.question}</Label>
            <Answer res={res} />
          </div>
        ))}
      </Grid>
    </>
  )
}
