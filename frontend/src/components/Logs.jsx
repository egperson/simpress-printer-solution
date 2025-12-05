import React, { useState, useEffect } from 'react'
import CustomCard from './CustomCard'
import CustomSelect from './CustomSelect'
import CustomButton from './CustomButton'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockLogs = Array.from({ length: 200 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      level: ['info', 'warning', 'error', 'debug'][Math.floor(Math.random() * 4)],
      source: ['collector', 'server', 'database', 'api'][Math.floor(Math.random() * 4)],
      message: `Log message ${i + 1} - Operation completed successfully`
    }))
    setLogs(mockLogs)
  }, [])

  const getLevelIcon = (level) => {
    const icons = {
      info: { icon: 'info', color: 'blue' },
      warning: { icon: 'warning', color: 'yellow' },
      error: { icon: 'error', color: 'red' },
      debug: { icon: 'bug_report', color: 'gray' }
    }
    return icons[level] || icons.info
  }

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false
    if (filterSource !== 'all' && log.source !== filterSource) return false
    return true
  })

  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredLogs.length / pageSize)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs do Sistema</h1>
          <p className="text-white/60">Visualizar logs e eventos</p>
        </div>
        <CustomButton icon="download" variant="secondary">
          Exportar Logs
        </CustomButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['info', 'warning', 'error', 'debug'].map(level => {
          const count = logs.filter(l => l.level === level).length
          const levelInfo = getLevelIcon(level)
          return (
            <CustomCard key={level} hover className="text-center p-4">
              <span className={`mi text-4xl text-${levelInfo.color}-400`}>{levelInfo.icon}</span>
              <div className="text-2xl font-bold mt-2">{count}</div>
              <div className="text-sm text-white/60 capitalize">{level}</div>
            </CustomCard>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <CustomSelect
          label="Nível"
          value={filterLevel}
          onChange={setFilterLevel}
          icon="filter_list"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'info', label: 'Info', icon: 'info' },
            { value: 'warning', label: 'Warning', icon: 'warning' },
            { value: 'error', label: 'Error', icon: 'error' },
            { value: 'debug', label: 'Debug', icon: 'bug_report' }
          ]}
        />

        <CustomSelect
          label="Fonte"
          value={filterSource}
          onChange={setFilterSource}
          icon="source"
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'collector', label: 'Collector' },
            { value: 'server', label: 'Server' },
            { value: 'database', label: 'Database' },
            { value: 'api', label: 'API' }
          ]}
        />
      </div>

      {/* Logs Table */}
      <CustomCard>
        <div className="space-y-1">
          {paginatedLogs.map(log => {
            const levelInfo = getLevelIcon(log.level)
            return (
              <div key={log.id} className={`p-3 rounded hover:bg-white/5 transition border-l-2 border-${levelInfo.color}-500/50`}>
                <div className="flex items-start gap-3">
                  <span className={`mi text-${levelInfo.color}-400`}>{levelInfo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-xs text-white/50 mb-1">
                      <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      <span className={`px-2 py-0.5 rounded bg-${levelInfo.color}-500/20 text-${levelInfo.color}-300 uppercase font-semibold`}>
                        {log.level}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/10">
                        {log.source}
                      </span>
                    </div>
                    <div className="text-sm font-mono">{log.message}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <div className="text-sm text-white/60">
            Exibindo {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, filteredLogs.length)} de {filteredLogs.length}
          </div>
          <div className="flex gap-2">
            <CustomButton
              size="small"
              variant="secondary"
              icon="chevron_left"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            />
            <span className="px-3 py-1.5 text-sm">
              Página {page} de {totalPages}
            </span>
            <CustomButton
              size="small"
              variant="secondary"
              icon="chevron_right"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            />
          </div>
        </div>
      </CustomCard>
    </div>
  )
}
