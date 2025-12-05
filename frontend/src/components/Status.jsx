import React, { useEffect, useState } from 'react'
import ProgressModal from './ProgressModal'

export default function Status({ data }) {
  const [serverInfo, setServerInfo] = useState(null)
  const [collecting, setCollecting] = useState(false)
  const devices = (data && data.devices) || []
  const total = devices.length
  const ok = devices.filter(d => d.status === 'ok').length
  const err = total - ok
  const lastRun = data && data.lastRun

  useEffect(() => {
    async function loadServerInfo() {
      try {
        const res = await fetch('/api/server/info')
        const json = await res.json()
        if (json.ok) setServerInfo(json)
      } catch (e) {
        console.error('Failed to load server info:', e)
      }
    }
    loadServerInfo()
    const interval = setInterval(loadServerInfo, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  async function triggerCollection() {
    setCollecting(true)
    try {
      const res = await fetch('/api/collect', { method: 'POST' })
      const json = await res.json()
      // Don't close modal here - let it auto-close at 99% progress
      // Modal onClose will trigger data refresh
    } catch (e) {
      setCollecting(false)
      alert('Erro ao iniciar coleta: ' + e.message)
    }
  }

  async function handleCollectionClose() {
    setCollecting(false)
    // Data will auto-refresh after 30s interval in App.jsx
    // Or user can manually click refresh
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Status do Sistema</h2>
          <div className="text-sm text-white/60 mt-1">Resumo da última varredura e saúde do servidor</div>
        </div>
        <button onClick={triggerCollection} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-700">
          Coletar Agora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold">{total}</div>
          <div className="text-xs text-white/60 mt-1">Dispositivos</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-300">{ok}</div>
          <div className="text-xs text-white/60 mt-1">Online</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-red-300">{err}</div>
          <div className="text-xs text-white/60 mt-1">Offline/Erro</div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Informações do Servidor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-white/2 rounded">
            <div className="text-xs text-white/60">Tempo Online</div>
            <div className="font-semibold">{serverInfo?.uptime ? formatUptime(serverInfo.uptime) : 'N/A'}</div>
          </div>
          <div className="p-3 bg-white/2 rounded">
            <div className="text-xs text-white/60">Versão</div>
            <div className="font-semibold">{serverInfo?.version || 'N/A'}</div>
          </div>
          <div className="p-3 bg-white/2 rounded">
            <div className="text-xs text-white/60">Última Coleta</div>
            <div className="font-semibold text-xs">
              {lastRun ? new Date(lastRun).toLocaleString() : 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-white/2 rounded">
            <div className="text-xs text-white/60">Taxa de Sucesso</div>
            <div className="font-semibold">
              {total > 0 ? `${Math.round((ok / total) * 100)}%` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Atalhos Rápidos</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => window.location.href = '#/alerts'}
            className="p-3 bg-white/2 rounded hover:bg-white/5 transition"
          >
            <div className="font-semibold">Alertas</div>
            <div className="text-xs text-white/60">Ver histórico de alertas</div>
          </button>
          <button
            onClick={() => window.location.href = '#/inventory'}
            className="p-3 bg-white/2 rounded hover:bg-white/5 transition"
          >
            <div className="font-semibold">Inventário</div>
            <div className="text-xs text-white/60">Gerenciar estoque</div>
          </button>
          <button
            onClick={() => window.location.href = '#/settings'}
            className="p-3 bg-white/2 rounded hover:bg-white/5 transition"
          >
            <div className="font-semibold">Configurações</div>
            <div className="text-xs text-white/60">Ajustar parâmetros</div>
          </button>
        </div>
      </div>

      <ProgressModal
        open={collecting}
        title="Coletando Impressoras"
        message="Escaneando rede em busca de impressoras... (~1778 IPs)"
        estimatedSeconds={420}
        onClose={handleCollectionClose}
      />
    </div>
  )
}
