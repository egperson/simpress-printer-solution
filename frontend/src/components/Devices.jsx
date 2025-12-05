import React, { useEffect, useState } from 'react'
import Modal from './Modal'
import CustomSelect from './CustomSelect'
import CustomInput from './CustomInput'

export default function Devices({ data, pushToast, threshold, searchRef }) {
  const [loading, setLoading] = useState(false)
  const [devices, setDevices] = useState([])

  useEffect(() => {
    if (data && data.devices) {
      setDevices(data.devices)
    }
  }, [data])
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterSupplyLevel, setFilterSupplyLevel] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [sortBy, setSortBy] = useState('name')

  function getId(d) {
    return (d.deviceIp || d.url || d.deviceName || d.name || '').toString()
  }

  function getMuted() {
    try { return JSON.parse(localStorage.getItem('monitor.muted') || '[]') } catch (e) { return [] }
  }
  function toggleMuted(id) {
    try {
      const m = getMuted()
      const idx = m.indexOf(id)
      if (idx === -1) m.push(id)
      else m.splice(idx, 1)
      localStorage.setItem('monitor.muted', JSON.stringify(m))
      // force re-render
      setDevices(d => [...d])
    } catch (e) { console.error(e) }
  }

  function getFavs() {
    try { return JSON.parse(localStorage.getItem('monitor.favs') || '[]') } catch (e) { return [] }
  }
  function toggleFav(id) {
    try {
      const f = getFavs()
      const idx = f.indexOf(id)
      if (idx === -1) f.push(id)
      else f.splice(idx, 1)
      localStorage.setItem('monitor.favs', JSON.stringify(f))
      setDevices(d => [...d])
    } catch (e) { console.error(e) }
  }

  function formatSuppliesShort(supplies) {
    if (!supplies || !supplies.length) return ''
    const map = { 'Preto': 'P', 'Ciano': 'C', 'Magenta': 'M', 'Amarelo': 'A', 'Black': 'P', 'Cyan': 'C', 'Yellow': 'A' }
    return supplies.map(s => {
      const name = s.name || ''
      const key = map[name] || name.charAt(0).toUpperCase()
      const level = s.level || ''
      return `${key}:${level}`
    }).join(' ')
  }

  function getInventoryQty(name) {
    try {
      const raw = localStorage.getItem('monitor.inventory')
      if (!raw) return 0
      const inv = JSON.parse(raw)
      const found = (inv || []).find(i => (i.name || '').toLowerCase() === (name || '').toLowerCase())
      return found ? Number(found.qty) : 0
    } catch (e) { return 0 }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/status')
      const j = await res.json()
      setDevices(j.devices || [])
    } catch (e) { pushToast({ title: 'Erro', msg: e.message, type: 'error' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function pingDevice(d) {
    const url = encodeURIComponent(d.deviceIp || d.url || d.name)
    try {
      const res = await fetch(`/api/ping?url=${url}`)
      const j = await res.json()
      const meta = { deviceId: getId(d) }
      if (j.ok) { pushToast({ title: 'Ping OK', msg: `${d.deviceName || d.name}: ${j.device && j.device.machineStatus || 'OK'}`, meta }) }
      else { pushToast({ title: 'Ping falhou', msg: `${d.deviceName || d.name}: ${j.error}`, type: 'error', meta }) }
    } catch (e) { pushToast({ title: 'Erro', msg: e.message, type: 'error' }) }
  }

  function openPanel(d) {
    const host = (d.deviceIp || d.url || d.name || '').replace(/^https?:\/\//, '')
    // try https first
    const tryUrls = [`https://${host}`, `http://${host}`]
    // open in new tab the https URL (user can change protocol if needed)
    window.open(tryUrls[0], '_blank')
  }

  function exportVisible() {
    const rows = [['name', 'ip', 'status', 'supplies', 'timestamp']]
    const list = filteredList()
    for (const d of list) {
      rows.push([d.deviceName || d.name || '', d.deviceIp || d.url || '', d.status || '', (d.supplies || []).map(s => `${s.name}:${s.level || ''}`).join(';'), d.timestamp || ''])
    }
    const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'devices.csv'; a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  function filteredList() {
    const searchQuery = searchRef?.current?.value?.toLowerCase() || ''
    const favs = getFavs()

    return devices.filter(d => {
      // Search filter
      if (searchQuery) {
        const matchesName = (d.deviceName || d.name || '').toLowerCase().includes(searchQuery)
        const matchesIp = (d.deviceIp || d.url || '').toLowerCase().includes(searchQuery)
        if (!matchesName && !matchesIp) return false
      }

      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'ok' && d.status !== 'ok') return false
        if (filterStatus === 'error' && d.status === 'ok') return false
      }

      // Type filter
      if (filterType !== 'all') {
        if ((d.type || '').toLowerCase() !== filterType) return false
      }

      // Supply level filter
      if (filterSupplyLevel !== 'all' && d.supplies && d.supplies.length > 0) {
        const hasSupplyInRange = d.supplies.some(s => {
          const level = parseFloat((s.level || '').toString().replace('%', '')) || 0
          if (filterSupplyLevel === 'critical') return level < 10
          if (filterSupplyLevel === 'low') return level >= 10 && level < 30
          if (filterSupplyLevel === 'medium') return level >= 30 && level < 70
          if (filterSupplyLevel === 'high') return level >= 70
          return true
        })
        if (!hasSupplyInRange) return false
      }

      // Location filter
      if (filterLocation !== 'all') {
        if ((d.location || '') !== filterLocation) return false
      }

      // Favorites filter
      if (filterFavorites) {
        const id = getId(d)
        if (!favs.includes(id)) return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'name') return ('' + (a.deviceName || a.name || '')).localeCompare(b.deviceName || b.name || '')
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      return 0
    })
  }

  // Get unique locations for filter
  const uniqueLocations = [...new Set(devices.map(d => d.location).filter(Boolean))]

  const list = filteredList()
  const start = (page - 1) * pageSize
  const pageItems = list.slice(start, start + pageSize)
  const totalPages = Math.max(1, Math.ceil((devices.length || 0) / pageSize))
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailDevice, setDetailDevice] = useState(null)
  const [detailHistory, setDetailHistory] = useState(null)
  const [showFullHistory, setShowFullHistory] = useState(false)

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dispositivos</h2>
          <div className="text-sm text-white/60">Lista de impressoras detectadas na rede</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 rounded border border-white/6">Atualizar</button>
          <button onClick={exportVisible} className="px-3 py-2 rounded border border-white/6">Exportar visíveis</button>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Filtros Avançados</h3>
          <button
            onClick={() => {
              setFilterStatus('all')
              setFilterType('all')
              setFilterSupplyLevel('all')
              setFilterLocation('all')
              setFilterFavorites(false)
            }}
            className="px-3 py-1.5 text-sm rounded border border-white/10 hover:bg-white/5 transition"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomSelect
            label="Status"
            value={filterStatus}
            onChange={setFilterStatus}
            icon="info"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'ok', label: 'Online', icon: 'check_circle' },
              { value: 'error', label: 'Offline', icon: 'error' }
            ]}
          />

          <CustomSelect
            label="Tipo"
            value={filterType}
            onChange={setFilterType}
            icon="print"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'color', label: 'Colorida', icon: 'palette' },
              { value: 'mono', label: 'Monocromática', icon: 'filter_b_and_w' }
            ]}
          />

          <CustomSelect
            label="Nível de Consumível"
            value={filterSupplyLevel}
            onChange={setFilterSupplyLevel}
            icon="battery_alert"
            searchable={false}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'critical', label: 'Crítico (< 10%)', icon: 'report' },
              { value: 'low', label: 'Baixo (10-30%)', icon: 'warning' },
              { value: 'medium', label: 'Médio (30-70%)', icon: 'info' },
              { value: 'high', label: 'Alto (> 70%)', icon: 'check_circle' }
            ]}
          />

          <CustomSelect
            label="Localização"
            value={filterLocation}
            onChange={setFilterLocation}
            icon="location_on"
            searchable={true}
            options={[
              { value: 'all', label: 'Todas' },
              ...uniqueLocations.map(loc => ({ value: loc, label: loc, icon: 'place' }))
            ]}
          />
        </div>

        <div className="flex gap-4 mt-4">
          <CustomSelect
            label="Ordenar Por"
            value={sortBy}
            onChange={setSortBy}
            icon="sort"
            options={[
              { value: 'name', label: 'Nome', icon: 'text_fields' },
              { value: 'status', label: 'Status', icon: 'signal_cellular_alt' }
            ]}
          />

          <div className="flex items-end">
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`px-4 py-2.5 rounded border transition ${filterFavorites
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'border-white/10 hover:bg-white/5'
                }`}
            >
              <span className="flex items-center gap-2">
                <span className="mi">{filterFavorites ? 'star' : 'star_border'}</span>
                <span className="text-sm">Apenas Favoritos</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading && <div className="p-6">Carregando...</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {!loading && pageItems.map((d, idx) => {
            const id = getId(d)
            const fav = getFavs().includes(id)
            const muted = getMuted().includes(id)
            const isMono = ((d.type || '').toLowerCase().includes('mono')) || ((d.deviceName || '').toLowerCase().includes('mono'))
            return (
              <div key={id || idx} className={`p-4 rounded border ${d.status === 'ok' ? 'border-green-500/30 bg-green-900/5' : 'border-red-500/20 bg-red-900/5'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-xl" aria-hidden>
                      {isMono ? (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <rect x="3" y="6" width="18" height="10" rx="2" fill="currentColor" />
                          <rect x="7" y="11" width="10" height="3" rx="1" fill="#08101a" />
                        </svg>
                      ) : (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <rect x="3" y="4" width="18" height="12" rx="2" fill="currentColor" />
                          <circle cx="8" cy="16" r="1.6" fill="#ef4444" />
                          <circle cx="12" cy="16" r="1.6" fill="#f59e0b" />
                          <circle cx="16" cy="16" r="1.6" fill="#06b6d4" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{d.deviceName || d.name}</div>
                      <div className="text-xs text-white/60">{d.deviceIp || d.url}</div>
                      {d.location && (
                        <div className="text-xs mt-1 inline-block px-2 py-0.5 rounded bg-cyan-600/20 text-cyan-300 border border-cyan-500/30">
                          📍 {d.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-right">
                    <div>{fav ? '★' : '☆'} {muted ? '🔕' : ''}</div>
                    <div className="text-xs text-white/60">{d.status === 'ok' ? 'OK' : 'Erro'}</div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {(d.supplies || []).length === 0 && <div className="text-xs text-white/60">Sem informações de consumíveis</div>}
                  {(d.supplies || []).map((s, si) => {
                    const raw = (s.level || '').toString().replace('%', '')
                    const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0))
                    const inv = getInventoryQty(s.name)
                    return (
                      <div key={si}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-white/60">{pct}%</div>
                        </div>
                        <div className="w-full bg-white/5 rounded h-2 overflow-hidden mb-1" title={`${s.name}: ${pct}% — Estoque: ${inv}`}>
                          <div style={{ width: pct + '%' }} className={`h-2 ${pct > 30 ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        </div>
                        <div className="text-xs text-white/60">Estoque: <b>{inv}</b></div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 actions flex gap-2 items-center">
                  <button onClick={() => pingDevice(d)} className="btn-sm">Testar</button>
                  <button onClick={() => openPanel(d)} className="btn-sm">Abrir painel</button>
                  <button onClick={() => { const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = (d.deviceName || d.name || 'device') + '.json'; a.click(); a.remove(); URL.revokeObjectURL(url) }} className="btn-sm">Exportar</button>
                  <button onClick={() => { toggleMuted(id) }} className="btn-sm">{muted ? 'Remover silêncio' : 'Silenciar'}</button>
                  <button onClick={() => { toggleFav(id) }} className="btn-sm" aria-pressed={fav} aria-label={fav ? 'Remover favorito' : 'Favoritar'}>{fav ? '★' : '☆'}</button>
                  <button onClick={async () => {
                    setDetailDevice(d)
                    setDetailOpen(true)
                    try { const h = JSON.parse(localStorage.getItem('monitor.detailsHistory') || '[]'); h.unshift({ id: getId(d), ts: new Date().toISOString(), name: d.deviceName || d.name }); localStorage.setItem('monitor.detailsHistory', JSON.stringify(h.slice(0, 100))); } catch (e) { }
                    try {
                      const res = await fetch('/api/history?limit=12')
                      const j = await res.json()
                      if (j.ok && j.rows) {
                        const arr = j.rows.map(r => {
                          const dev = (r.data && r.data.devices) ? (r.data.devices.find(x => (x.deviceIp || x.url || x.deviceName || x.name) === (d.deviceIp || d.url || d.deviceName || d.name))) : null
                          return { ts: r.ts, status: dev ? dev.status : 'missing' }
                        })
                        setDetailHistory(arr)
                      } else setDetailHistory(null)
                    } catch (e) { setDetailHistory(null) }
                  }} className="ml-auto btn-sm" aria-label={`Detalhes de ${d.deviceName || d.name}`}>Detalhes</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between p-4">
          <div className="text-sm text-white/60">Página {page} de {totalPages}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border border-white/6">Anterior</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border border-white/6">Próxima</button>
          </div>
        </div>
      </div>

      <Modal open={detailOpen} title={detailDevice ? (detailDevice.deviceName || detailDevice.name) : 'Detalhes'} onClose={() => setDetailOpen(false)} footer={
        <div className="flex gap-2">
          <button onClick={() => setDetailOpen(false)} className="px-3 py-2 rounded border border-white/6">Fechar</button>
          <button onClick={() => { if (detailDevice) { const blob = new Blob([JSON.stringify(detailDevice, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = (detailDevice.deviceName || detailDevice.name || 'device') + '.json'; a.click(); a.remove(); URL.revokeObjectURL(url) } }} className="px-3 py-2 rounded bg-white/6">Exportar JSON</button>
          <button onClick={() => {
            // export device history CSV based on detailHistory
            (async () => {
              try {
                if (!detailHistory) {
                  const res = await fetch('/api/history?limit=200')
                  const j = await res.json()
                  if (j.ok && j.rows) {
                    const arr = j.rows.map(r => ({ ts: r.ts, dev: (r.data && r.data.devices) ? r.data.devices.find(x => (x.deviceIp || x.url || x.deviceName || x.name) === (detailDevice.deviceIp || detailDevice.url || detailDevice.deviceName || detailDevice.name)) : null }))
                    const rows = [['ts', 'status']]
                    for (const a of arr) { if (a.dev) rows.push([`"${a.ts}"`, a.dev.status || '']) }
                    const csv = rows.map(r => r.join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `${(detailDevice.deviceName || detailDevice.name || 'device')}-history.csv`; a.click(); a.remove(); URL.revokeObjectURL(url)
                  } else { pushToast({ title: 'Sem histórico', msg: 'Nenhum snapshot disponível', type: 'warning' }) }
                } else {
                  const rows = [['ts', 'status']]
                  for (const h of detailHistory) { rows.push([`"${h.ts}"`, h.status || '']) }
                  const csv = rows.map(r => r.join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `${(detailDevice.deviceName || detailDevice.name || 'device')}-history.csv`; a.click(); a.remove(); URL.revokeObjectURL(url)
                }
              } catch (e) { pushToast({ title: 'Erro', msg: 'Não foi possível exportar histórico', type: 'error' }) }
            })()
          }} className="px-3 py-2 rounded btn-sm">Exportar CSV</button>
        </div>
      }>
        {detailDevice && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded bg-white/5 flex items-center justify-center">
                {(((detailDevice.deviceName || detailDevice.name) || '').toLowerCase().includes('mono')) ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect x="3" y="6" width="18" height="10" rx="2" fill="currentColor" />
                    <rect x="7" y="11" width="10" height="3" rx="1" fill="#08101a" />
                  </svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect x="3" y="4" width="18" height="12" rx="2" fill="currentColor" />
                    <circle cx="8" cy="16" r="1.6" fill="#ef4444" />
                    <circle cx="12" cy="16" r="1.6" fill="#f59e0b" />
                    <circle cx="16" cy="16" r="1.6" fill="#06b6d4" />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-lg font-semibold">{detailDevice.deviceName || detailDevice.name}</div>
                <div className="text-sm text-white/60">{detailDevice.deviceIp || detailDevice.url}</div>
              </div>
              <div className="ml-auto">
                <div className={`status-badge ${detailDevice.status === 'ok' ? 'status-ok' : 'status-err'}`}>{detailDevice.status === 'ok' ? 'OK' : 'Erro'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-2">
                <div className="font-semibold text-sm mb-2">Informações</div>
                <div className="text-xs text-white/60">Tipo: <b>{detailDevice.type || '—'}</b></div>
                <div className="text-xs text-white/60">Última atualização: <b>{detailDevice.timestamp || '—'}</b></div>
                <div className="text-xs text-white/60">Modelo: <b>{detailDevice.model || '—'}</b></div>
              </div>

              <div className="p-2">
                <div className="font-semibold text-sm mb-2">Consumíveis</div>
                {(detailDevice.supplies || []).length === 0 && <div className="text-xs text-white/60">Sem informações de consumíveis</div>}
                {(detailDevice.supplies || []).map((s, si) => {
                  const raw = (s.level || '').toString().replace('%', '')
                  const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0))
                  const inv = getInventoryQty(s.name)
                  const cls = pct > 30 ? 'supply-good' : (pct > 10 ? 'supply-warn' : 'supply-low')
                  return (
                    <div key={si} className="supply-row mb-3">
                      <div className="supply-meta"><div className="font-medium">{s.name}</div><div className="text-white/60">{pct}% — Estoque: <b>{inv}</b></div></div>
                      <div className={`supply-bar ${cls}`} title={`${s.name}: ${pct}% — Estoque: ${inv}`}>
                        <div className="fill" style={{ width: pct + '%' }} />
                      </div>
                      <div className="mt-2 flex gap-2 items-center">
                        <button className="btn-sm" onClick={() => {
                          try {
                            const raw = JSON.parse(localStorage.getItem('monitor.inventory') || '[]')
                            const item = (raw || []).find(i => (i.name || '').toLowerCase() === (s.name || '').toLowerCase())
                            if (!item || Number(item.qty) <= 0) { pushToast({ title: 'Sem estoque', msg: `Consumível ${s.name} sem estoque`, type: 'error' }); return }
                            item.qty = Number(item.qty) - 1
                            localStorage.setItem('monitor.inventory', JSON.stringify(raw))
                            pushToast({ title: 'Consumível usado', msg: `1 unidade de ${s.name} removida do estoque`, type: 'success' })
                            // refresh detailDevice inventory display
                            setDetailDevice(d => ({ ...d }))
                          } catch (e) { console.error(e); pushToast({ title: 'Erro', msg: 'Não foi possível atualizar o estoque', type: 'error' }) }
                        }}>Usar 1</button>
                        <button className="btn-sm" onClick={() => {
                          const note = window.prompt('Observação para manutenção (opcional):')
                          try {
                            const m = JSON.parse(localStorage.getItem('monitor.maintenance') || '[]')
                            m.unshift({ id: Date.now(), deviceId: getId(detailDevice), supply: s.name, note: note || '', ts: new Date().toISOString(), done: false })
                            localStorage.setItem('monitor.maintenance', JSON.stringify(m))
                            pushToast({ title: 'Manutenção agendada', msg: `Tarefa criada para ${s.name}`, type: 'success' })
                          } catch (e) { pushToast({ title: 'Erro', msg: 'Não foi possível agendar manutenção', type: 'error' }) }
                        }}>Agendar manutenção</button>
                        <button className="btn-sm" onClick={() => {
                          try {
                            const key = JSON.stringify({ id: getId(detailDevice), supply: s.name })
                            const raw = JSON.parse(localStorage.getItem('monitor.reorder') || '[]')
                            const exists = (raw || []).some(r => r.id === getId(detailDevice) && (r.supply || '') === s.name)
                            if (!exists) { raw.push({ id: getId(detailDevice), supply: s.name, created: new Date().toISOString() }); localStorage.setItem('monitor.reorder', JSON.stringify(raw)); pushToast({ title: 'Auto-reorder ativado', msg: `${s.name} será auto-encomendado quando estoque baixo`, type: 'success' }) }
                            else { const nr = (raw || []).filter(r => !(r.id === getId(detailDevice) && (r.supply || '') === s.name)); localStorage.setItem('monitor.reorder', JSON.stringify(nr)); pushToast({ title: 'Auto-reorder desativado', msg: `${s.name} removido da lista de auto-encomenda`, type: 'success' }) }
                          } catch (e) { pushToast({ title: 'Erro', msg: 'Não foi possível atualizar auto-reorder', type: 'error' }) }
                        }}>{(JSON.parse(localStorage.getItem('monitor.reorder') || '[]') || []).some(r => r.id === getId(detailDevice) && (r.supply || '') === s.name) ? 'Auto (On)' : 'Auto (Off)'} </button>
                      </div>
                    </div>
                  )
                })}
                {detailHistory && (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm mb-2">Histórico (últimos {detailHistory.length})</div>
                      <button className="btn-sm" onClick={() => setShowFullHistory(s => !s)}>{showFullHistory ? 'Ocultar' : 'Ver histórico'}</button>
                    </div>
                    <div className="sparkline flex items-center gap-2 mb-2">
                      {detailHistory.map((h, i) => (
                        <div key={i} className={`dot ${h.status === 'ok' ? 'dot-ok' : (h.status === 'missing' ? 'dot-missing' : 'dot-err')}`} title={`${new Date(h.ts).toLocaleString()} — ${h.status}`} />
                      ))}
                    </div>
                    {showFullHistory && (
                      <div className="space-y-2 max-h-40 overflow-auto p-2 bg-white/5 rounded">
                        {detailHistory.map((h, i) => (
                          <div key={i} className="text-xs flex items-center justify-between">
                            <div>{new Date(h.ts).toLocaleString()}</div>
                            <div className={`text-xs ${h.status === 'ok' ? 'text-green-300' : h.status === 'missing' ? 'text-white/60' : 'text-red-300'}`}>{h.status}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
