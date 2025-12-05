import React, { useState } from 'react'
import CustomCard from './CustomCard'
import CustomSelect from './CustomSelect'
import CustomButton from './CustomButton'

export default function Health({ devices = [] }) {
  const [filterHealth, setFilterHealth] = useState('all')
  const [sortBy, setSortBy] = useState('health')

  // Calculate health score for each device
  const getHealthScore = (device) => {
    let score = 100

    // Device status
    if (device.status !== 'ok') score -= 50

    // Supply levels
    if (device.supplies && device.supplies.length > 0) {
      const avgLevel = device.supplies.reduce((sum, s) => {
        const level = parseFloat((s.level || '').toString().replace('%', '')) || 0
        return sum + level
      }, 0) / device.supplies.length

      if (avgLevel < 10) score -= 30
      else if (avgLevel < 30) score -= 20
      else if (avgLevel < 50) score -= 10
    }

    return Math.max(0, Math.min(100, score))
  }

  const getHealthStatus = (score) => {
    if (score >= 80) return { label: 'Excelente', color: 'green', icon: 'check_circle' }
    if (score >= 60) return { label: 'Bom', color: 'blue', icon: 'info' }
    if (score >= 40) return { label: 'Atenção', color: 'yellow', icon: 'warning' }
    return { label: 'Crítico', color: 'red', icon: 'error' }
  }

  const devicesWithHealth = devices.map(d => ({
    ...d,
    healthScore: getHealthScore(d),
    healthStatus: getHealthStatus(getHealthScore(d))
  }))

  const filteredDevices = devicesWithHealth
    .filter(d => {
      if (filterHealth === 'all') return true
      if (filterHealth === 'excellent') return d.healthScore >= 80
      if (filterHealth === 'good') return d.healthScore >= 60 && d.healthScore < 80
      if (filterHealth === 'warning') return d.healthScore >= 40 && d.healthScore < 60
      if (filterHealth === 'critical') return d.healthScore < 40
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'health') return b.healthScore - a.healthScore
      if (sortBy === 'name') return (a.deviceName || a.name || '').localeCompare(b.deviceName || b.name || '')
      return 0
    })

  const avgHealth = devicesWithHealth.length > 0
    ? devicesWithHealth.reduce((sum, d) => sum + d.healthScore, 0) / devicesWithHealth.length
    : 0

  const healthCounts = {
    excellent: devicesWithHealth.filter(d => d.healthScore >= 80).length,
    good: devicesWithHealth.filter(d => d.healthScore >= 60 && d.healthScore < 80).length,
    warning: devicesWithHealth.filter(d => d.healthScore >= 40 && d.healthScore < 60).length,
    critical: devicesWithHealth.filter(d => d.healthScore < 40).length
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Saúde dos Dispositivos</h1>
          <p className="text-white/60">Monitoramento de saúde em tempo real</p>
        </div>
        <CustomButton icon="refresh" variant="secondary">
          Atualizar
        </CustomButton>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <CustomCard variant="default" hover className="text-center p-4">
          <div className="text-4xl font-bold">{Math.round(avgHealth)}%</div>
          <div className="text-sm text-white/60 mt-1">Saúde Média</div>
        </CustomCard>

        <CustomCard variant="success" hover className="text-center p-4">
          <span className="mi text-4xl text-green-400">check_circle</span>
          <div className="text-2xl font-bold text-green-400 mt-2">{healthCounts.excellent}</div>
          <div className="text-sm text-white/60 mt-1">Excelente</div>
        </CustomCard>

        <CustomCard variant="primary" hover className="text-center p-4">
          <span className="mi text-4xl text-blue-400">info</span>
          <div className="text-2xl font-bold text-blue-400 mt-2">{healthCounts.good}</div>
          <div className="text-sm text-white/60 mt-1">Bom</div>
        </CustomCard>

        <CustomCard variant="warning" hover className="text-center p-4">
          <span className="mi text-4xl text-yellow-400">warning</span>
          <div className="text-2xl font-bold text-yellow-400 mt-2">{healthCounts.warning}</div>
          <div className="text-sm text-white/60 mt-1">Atenção</div>
        </CustomCard>

        <CustomCard variant="danger" hover className="text-center p-4">
          <span className="mi text-4xl text-red-400">error</span>
          <div className="text-2xl font-bold text-red-400 mt-2">{healthCounts.critical}</div>
          <div className="text-sm text-white/60 mt-1">Crítico</div>
        </CustomCard>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <CustomSelect
          label="Filtrar por Saúde"
          value={filterHealth}
          onChange={setFilterHealth}
          icon="filter_list"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'excellent', label: 'Excelente (80-100%)', icon: 'check_circle' },
            { value: 'good', label: 'Bom (60-80%)', icon: 'info' },
            { value: 'warning', label: 'Atenção (40-60%)', icon: 'warning' },
            { value: 'critical', label: 'Crítico (0-40%)', icon: 'error' }
          ]}
        />

        <CustomSelect
          label="Ordenar Por"
          value={sortBy}
          onChange={setSortBy}
          icon="sort"
          options={[
            { value: 'health', label: 'Saúde (maior primeiro)' },
            { value: 'name', label: 'Nome (A-Z)' }
          ]}
        />
      </div>

      {/* Devices Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device, idx) => {
          const status = device.healthStatus
          const borderColor = {
            green: 'border-green-500/50',
            blue: 'border-blue-500/50',
            yellow: 'border-yellow-500/50',
            red: 'border-red-500/50'
          }[status.color]

          return (
            <CustomCard key={idx} hover className={`border-l-4 ${borderColor}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-base">{device.deviceName || device.name}</h3>
                  <p className="text-xs text-white/50">{device.deviceIp || device.url}</p>
                </div>
                <span className={`mi text-2xl text-${status.color}-400`}>{status.icon}</span>
              </div>

              {/* Health Score */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white/70">Saúde Geral</span>
                  <span className={`text-lg font-bold text-${status.color}-400`}>
                    {device.healthScore}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-${status.color}-500 transition-all duration-500`}
                    style={{ width: `${device.healthScore}%` }}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold bg-${status.color}-500/20 text-${status.color}-300`}>
                  {status.label}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${device.status === 'ok' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {device.status === 'ok' ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Supplies */}
              {device.supplies && device.supplies.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white/70">Consumíveis:</div>
                  {device.supplies.map((supply, si) => {
                    const level = parseFloat((supply.level || '').toString().replace('%', '')) || 0
                    return (
                      <div key={si} className="flex justify-between items-center text-xs">
                        <span className="text-white/60">{supply.name}</span>
                        <span className={`font-bold ${level < 10 ? 'text-red-400' : level < 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {level}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CustomCard>
          )
        })}
      </div>

      {filteredDevices.length === 0 && (
        <CustomCard className="text-center py-12">
          <span className="mi text-6xl text-white/20 mb-4">search_off</span>
          <h3 className="text-xl font-semibold mb-2">Nenhum dispositivo encontrado</h3>
          <p className="text-white/60">Tente ajustar os filtros</p>
        </CustomCard>
      )}
    </div>
  )
}
