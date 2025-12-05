import React, { useEffect, useState, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Devices from './components/Devices'
import AnalyticsPage from './components/AnalyticsPage'
import Logs from './components/Logs'
import Settings from './components/Settings'
import Alerts from './components/Alerts'
import Reports from './components/Reports'
// NetworkMap removed (not used)
import Status from './components/Status'
import Support from './components/Support'
import Maintenance from './components/Maintenance'
import Health from './components/Health'
import Inventory from './components/Inventory'
import AutoReorder from './components/AutoReorder'
import Toasts from './components/Toasts'

export default function App() {
  const [route, setRoute] = useState('dashboard')
  const [data, setData] = useState(null)
  const [toasts, setToasts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)

  function pushToast(t) {
    const id = Date.now() + Math.random()
    setToasts(s => [...s, { id, ...t }])
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), t.ttl || 6000)
  }

  function removeToast(id) { setToasts(s => s.filter(x => x.id !== id)) }

  async function fetchStatus() {
    setLoading(true)
    try { const r = await fetch('/api/status'); const j = await r.json(); setData(j) } catch (e) { pushToast({ title: 'Erro', msg: e.message, type: 'error' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStatus(); const t = setInterval(fetchStatus, 30000); return () => clearInterval(t) }, [])

  useEffect(() => {
    let es = null
    try { es = new EventSource('/api/alerts/stream'); es.onmessage = e => { try { const a = JSON.parse(e.data); pushToast({ title: a.type, msg: `${a.deviceName || a.deviceId}: ${a.supply || ''} ${a.level ? a.level + '%' : ''}`, type: 'error', meta: a }) } catch (_) { } } }
    catch (e) { console.error('sse', e) }
    return () => { if (es) es.close() }
  }, [])

  return (
    <div className="app">
      <div className="layout">
        <aside className="sidebar"><Sidebar route={route} onNavigate={setRoute} /></aside>
        <main className="main-content">
          <div className="header">
            <Header query={query} setQuery={setQuery} searchRef={searchRef} onNavigate={setRoute} onRefresh={fetchStatus} loading={loading} autoRefresh={30} />
          </div>
          <div>
            {route === 'dashboard' && <Dashboard data={data} />}
            {route === 'devices' && <Devices data={data} pushToast={pushToast} searchRef={searchRef} />}
            {route === 'analytics' && <AnalyticsPage devices={(data && data.devices) || []} />}
            {route === 'health' && <Health devices={(data && data.devices) || []} />}
            {route === 'reports' && <Reports devices={(data && data.devices) || []} />}
            {route === 'status' && <Status data={data} />}
            {route === 'support' && <Support />}
            {route === 'inventory' && <Inventory />}
            {route === 'reorder' && <AutoReorder />}
            {route === 'logs' && <Logs />}
            {route === 'alerts' && <Alerts pushToast={pushToast} />}
            {route === 'maintenance' && <Maintenance pushToast={pushToast} />}
            {route === 'settings' && <Settings pushToast={pushToast} />}
          </div>
        </main>
      </div>
      <Toasts toasts={toasts} onClose={removeToast} />
    </div>
  )
}