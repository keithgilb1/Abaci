import { useEffect, useState } from 'react'
import Ask from './pages/Ask'
import Lab from './pages/Lab'
import Overview from './pages/Overview'
import Pricing from './pages/Pricing'
import Treasury from './pages/Treasury'

const TABS = [
  { id: 'overview', label: 'Overview', page: Overview },
  { id: 'pricing', label: 'Pricing', page: Pricing },
  { id: 'lab', label: 'Policy Lab', page: Lab },
  { id: 'treasury', label: 'vs Treasury', page: Treasury },
  { id: 'ask', label: 'Ask Abaci', page: Ask },
]

const current = () => TABS.find(t => `#/${t.id}` === window.location.hash) ?? TABS[0]

export default function App() {
  const [tab, setTab] = useState(current)
  useEffect(() => {
    const on = () => { setTab(current()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const Page = tab.page
  return (
    <>
      <div className="nav-wrap">
        <nav className="nav" aria-label="Sections">
          <span className="brand">Abaci</span>
          {TABS.map(t => <a key={t.id} href={`#/${t.id}`} className={t.id === tab.id ? 'active' : ''}>{t.label}</a>)}
        </nav>
      </div>
      <main className="page">
        <Page />
        <footer className="footer">
          Abaci is a fictional lender. The loan book is the public Lending Club data, 2007–2018. Every figure comes from the dbt semantic layer through a read-only DuckDB connection.
        </footer>
      </main>
    </>
  )
}
