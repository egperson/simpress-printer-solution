import React, { useState, useEffect } from 'react'
import CustomCard from './CustomCard'
import CustomSelect from './CustomSelect'
import CustomButton from './CustomButton'

export default function Dashboard({ data }) {
  const devices = (data && data.devices) || []
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedMetric, setSelectedMetric] = useState('all')

  // Stats calculations
  const totalDevices = devices.length
  const onlineDevices = devices.filter(d => d.status === 'ok').length
  const offlineDevices = totalDevices - onlineDevices
  const criticalSupplies = devices.filter(d =>
    d.supplies && d.supplies.some(s => {
      const level = parseFloat((s.level || '').toString().replace('%', '')) || 0
      return level < 10
    })
  ).length

  // Calculate average supply levels
  const avgSupplyLevel = devices.reduce((acc, d) => {
    if (!d.supplies || d.supplies.length === 0) return acc
    const avg = d.supplies.reduce((sum, s) => {
      const level = parseFloat((s.level || '').toString().replace('%', '')) || 0
      return sum + level
    }, 0) / d.supplies.length
    return acc + avg
  }, 0) / (devices.length || 1)

  // Get devices with low supplies for alerts
  const lowSupplyDevices = devices
    .filter(d => d.supplies && d.supplies.some(s => {
      const level = parseFloat((s.level || '').toString().replace('%', '')) || 0
      return level < 30
    }))
    .slice(0, 5)
    .map(d => ({
      name: d.deviceName || d.name,
      supplies: d.supplies.filter(s => {
        const level = parseFloat((s.level || '').toString().replace('%', '')) || 0
        return level < 30
      })
    }))

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-white/60">Visão geral do sistema</p>
        </div>
        <div className="flex gap-3">
          <CustomSelect
            value={timeRange}
            onChange={setTimeRange}
            icon="schedule"
            options={[
              { value: '24h', label: 'Últimas 24h' },
              { value: '7d', label: 'Últimos 7 dias' },
              { value: '30d', label: 'Últimos 30 dias' },
              { value: 'all', label: 'Todo período' }
            ]}
          />
          <CustomButton icon="refresh" variant="secondary" size="medium">
            Atualizar
          </CustomButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomCard variant="primary" hover>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="mi text-4xl text-cyan-400">print</span>
            </div>
            <div className="text-3xl font-bold text-cyan-400">{totalDevices}</div>
            <div className="text-sm text-white/60 mt-1">Dispositivos Totais</div>
          </div>
        </CustomCard>

        <CustomCard variant="success" hover>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="mi text-4xl text-green-400">check_circle</span>
            </div>
            <div className="text-3xl font-bold text-green-400">{onlineDevices}</div>
            <div className="text-sm text-white/60 mt-1">Online</div>
            <div className="text-xs text-white/40 mt-1">
              {totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0}% do total
            </div>
          </div>
        </CustomCard>

        <CustomCard variant="danger" hover>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="mi text-4xl text-red-400">error</span>
            </div>
            <div className="text-3xl font-bold text-red-400">{offlineDevices}</div>
            <div className="text-sm text-white/60 mt-1">Offline</div>
            <div className="text-xs text-white/40 mt-1">
              {totalDevices > 0 ? Math.round((offlineDevices / totalDevices) * 100) : 0}% do total
            </div>
          </div>
        </CustomCard>

        <CustomCard variant="warning" hover>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="mi text-4xl text-yellow-400">warning</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{criticalSupplies}</div>
            <div className="text-sm text-white/60 mt-1">Consumíveis Críticos</div>
            <div className="text-xs text-white/40 mt-1">
              {'<'} 10% de toner
            </div>
          </div>
        </CustomCard>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Alerts */}
        <CustomCard
          title="Top 5 Alertas"
          subtitle="Impressoras com consumíveis baixos"
          icon="report_problem"
          variant="warning"
        >
          {lowSupplyDevices.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <span className="mi text-5xl mb-2">check_circle</span>
              <p>Nenhum alerta no momento!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowSupplyDevices.map((device, idx) => (
                <div key={idx} className="p-3 bg-white/5 rounded border border-yellow-500/20">
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <span className="mi text-yellow-400">warning</span>
                    {device.name}
                  </div>
                  <div className="space-y-1">
                    {device.supplies.map((supply, si) => {
                      const level = parseFloat((supply.level || '').toString().replace('%', '')) || 0
                      return (
                        <div key={si} className="flex items-center justify-between text-sm">
                          <span className="text-white/70">{supply.name}</span>
                          <span className={`font-bold ${level < 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                            {level}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CustomCard>

        {/* Supply Level Indicator */}
        <CustomCard
          title="Nível Médio de Consumíveis"
          subtitle="Média geral do sistema"
          icon="battery_full"
        >
          <div className="text-center py-8">
            <div className="relative inline-flex items-center justify-center">
              <svg className="transform -rotate-90" width="200" height="200">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke={avgSupplyLevel > 70 ? '#10b981' : avgSupplyLevel > 30 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(avgSupplyLevel / 100) * 502.4} 502.4`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute">
                <div className="text-4xl font-bold">{Math.round(avgSupplyLevel)}%</div>
                <div className="text-sm text-white/60">Média</div>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Bom (&gt;70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Médio (30-70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Baixo (&lt;30%)</span>
              </div>
            </div>
          </div>
        </CustomCard>
      </div>

      {/* Quick Actions */}
      <CustomCard
        title="Ações Rápidas"
        icon="flash_on"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CustomButton variant="primary" icon="print" className="w-full">
            Ver Dispositivos
          </CustomButton>
          <CustomButton variant="secondary" icon="inventory_2" className="w-full">
            Inventário
          </CustomButton>
          <CustomButton variant="secondary" icon="assessment" className="w-full">
            Relatórios
          </CustomButton>
          <CustomButton variant="secondary" icon="settings" className="w-full">
            Configurações
          </CustomButton>
        </div>
      </CustomCard>

      {/* System Info */}
      <CustomCard
        title="Informações do Sistema"
        icon="info"
        variant="default"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white/5 rounded">
            <div className="text-sm text-white/60 mb-1">Última Atualização</div>
            <div className="font-semibold">
              {data?.lastRun ? new Date(data.lastRun).toLocaleString('pt-BR') : 'Nunca'}
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded">
            <div className="text-sm text-white/60 mb-1">Taxa de Sucesso</div>
            <div className="font-semibold text-green-400">
              {totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0}%
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded">
            <div className="text-sm text-white/60 mb-1">Economia Estimada</div>
            <div className="font-semibold text-cyan-400">
              R$ {(criticalSupplies * 150).toFixed(2)}
            </div>
          </div>
        </div>
      </CustomCard>
    </div>
  )
}
