import React, { useState, useEffect } from 'react'
import CustomCard from './CustomCard'
import CustomSelect from './CustomSelect'
import CustomButton from './CustomButton'
import CustomCheckbox from './CustomCheckbox'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterRead, setFilterRead] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('monitor.alerts')
      if (raw) setAlerts(JSON.parse(raw))
    } catch (e) { console.error(e) }
  }, [])

  function saveAlerts(newAlerts) {
    localStorage.setItem('monitor.alerts', JSON.stringify(newAlerts))
    setAlerts(newAlerts)
  }

  function markAsRead(id) {
    const updated = alerts.map(a => a.id === id ? { ...a, read: true } : a)
    saveAlerts(updated)
  }

  function markAllAsRead() {
    const updated = alerts.map(a => ({ ...a, read: true }))
    saveAlerts(updated)
  }

  function deleteAlert(id) {
    if (!confirm('Remover este alerta?')) return
    saveAlerts(alerts.filter(a => a.id !== id))
  }

  function clearAll() {
    if (!confirm('Limpar todos os alertas?')) return
    saveAlerts([])
  }

  const getPriorityIcon = (priority) => {
    if (priority === 'critical') return { icon: 'report', color: 'red' }
    if (priority === 'high') return { icon: 'warning', color: 'orange' }
    if (priority === 'medium') return { icon: 'info', color: 'yellow' }
    return { icon: 'notifications', color: 'blue' }
  }

  const filteredAlerts = alerts
    .filter(a => {
      if (filterType !== 'all' && a.type !== filterType) return false
      if (filterRead === 'unread' && a.read) return false
      if (filterRead === 'read' && !a.read) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      if (sortBy === 'priority') {
        const priorities = { critical: 4, high: 3, medium: 2, low: 1 }
        return (priorities[b.priority] || 0) - (priorities[a.priority] || 0)
      }
      return 0
    })

  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Alertas
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-sm rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-white/60">Central de notificações do sistema</p>
        </div>
        <div className="flex gap-2">
          <CustomButton
            icon="done_all"
            variant="secondary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Marcar Todas como Lidas
          </CustomButton>
          <CustomButton
            icon="delete_sweep"
            variant="danger"
            onClick={clearAll}
            disabled={alerts.length === 0}
          >
            Limpar Tudo
          </CustomButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl">notifications</span>
          <div className="text-2xl font-bold mt-2">{alerts.length}</div>
          <div className="text-sm text-white/60">Total</div>
        </CustomCard>

        <CustomCard variant="danger" hover className="text-center p-4">
          <span className="mi text-4xl text-red-400">notifications_active</span>
          <div className="text-2xl font-bold text-red-400 mt-2">{unreadCount}</div>
          <div className="text-sm text-white/60">Não Lidas</div>
        </CustomCard>

        <CustomCard variant="warning" hover className="text-center p-4">
          <span className="mi text-4xl text-orange-400">report</span>
          <div className="text-2xl font-bold text-orange-400 mt-2">
            {alerts.filter(a => a.priority === 'critical').length}
          </div>
          <div className="text-sm text-white/60">Críticos</div>
        </CustomCard>

        <CustomCard variant="primary" hover className="text-center p-4">
          <span className="mi text-4xl text-blue-400">schedule</span>
          <div className="text-2xl font-bold text-blue-400 mt-2">Hoje</div>
          <div className="text-sm text-white/60">
            {alerts.filter(a => {
              const today = new Date().toDateString()
              const alertDate = new Date(a.timestamp).toDateString()
              return today === alertDate
            }).length} novos
          </div>
        </CustomCard>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <CustomSelect
          label="Tipo"
          value={filterType}
          onChange={setFilterType}
          icon="category"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'supply', label: 'Consumíveis', icon: 'inventory_2' },
            { value: 'status', label: 'Status', icon: 'power' },
            { value: 'maintenance', label: 'Manutenção', icon: 'build' },
            { value: 'system', label: 'Sistema', icon: 'settings' }
          ]}
        />

        <CustomSelect
          label="Estado"
          value={filterRead}
          onChange={setFilterRead}
          icon="mail"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'unread', label: 'Não Lidas' },
            { value: 'read', label: 'Lidas' }
          ]}
        />

        <CustomSelect
          label="Ordenar"
          value={sortBy}
          onChange={setSortBy}
          icon="sort"
          options={[
            { value: 'date', label: 'Data (mais recente)' },
            { value: 'priority', label: 'Prioridade (maior primeiro)' }
          ]}
        />
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map(alert => {
          const priorityInfo = getPriorityIcon(alert.priority)
          return (
            <CustomCard
              key={alert.id}
              hover
              className={`${!alert.read ? 'bg-white/8 border-l-4 border-cyan-500' : 'bg-white/3'}`}
            >
              <div className="flex items-start gap-4">
                <span className={`mi text-3xl text-${priorityInfo.color}-400`}>
                  {priorityInfo.icon}
                </span>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{alert.title || 'Alerta'}</h3>
                      <p className="text-sm text-white/70 mt-1">{alert.message}</p>
                    </div>
                    {!alert.read && (
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">
                        Novo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <span className="mi text-sm">schedule</span>
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleString('pt-BR') : 'Agora'}
                    </span>
                    {alert.device && (
                      <span className="flex items-center gap-1">
                        <span className="mi text-sm">print</span>
                        {alert.device}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded bg-${priorityInfo.color}-500/20 text-${priorityInfo.color}-300`}>
                      {alert.priority || 'low'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {!alert.read && (
                    <CustomButton
                      size="small"
                      variant="ghost"
                      icon="done"
                      onClick={() => markAsRead(alert.id)}
                    >
                      Marcar Lida
                    </CustomButton>
                  )}
                  <CustomButton
                    size="small"
                    variant="ghost"
                    icon="delete"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    Remover
                  </CustomButton>
                </div>
              </div>
            </CustomCard>
          )
        })}
      </div>

      {filteredAlerts.length === 0 && (
        <CustomCard className="text-center py-12">
          <span className="mi text-6xl text-white/20 mb-4">notifications_off</span>
          <h3 className="text-xl font-semibold mb-2">Nenhum alerta</h3>
          <p className="text-white/60">
            {alerts.length === 0 ? 'Tudo está funcionando perfeitamente!' : 'Nenhum alerta corresponde aos filtros'}
          </p>
        </CustomCard>
      )}
    </div>
  )
}
