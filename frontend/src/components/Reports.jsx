import React, { useState } from 'react'
import CustomCard from './CustomCard'
import CustomSelect from './CustomSelect'
import CustomButton from './CustomButton'
import CustomCheckbox from './CustomCheckbox'

export default function Reports({ data }) {
  const [reportType, setReportType] = useState('summary')
  const [dateRange, setDateRange] = useState('7d')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeDetails, setIncludeDetails] = useState(false)

  function generateReport() {
    alert(`Gerando relatório: ${reportType} - ${dateRange}`)
    // Aqui você implementaria a lógica real de geração
  }

  function exportPDF() {
    alert('Exportando para PDF...')
  }

  function exportExcel() {
    alert('Exportando para Excel...')
  }

  const devices = (data && data.devices) || []

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-white/60">Gerar e exportar relatórios personalizados</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-cyan-400">description</span>
          <div className="text-2xl font-bold mt-2">47</div>
          <div className="text-sm text-white/60">Relatórios Gerados</div>
        </CustomCard>

        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-green-400">schedule</span>
          <div className="text-2xl font-bold mt-2">5</div>
          <div className="text-sm text-white/60">Agendados</div>
        </CustomCard>

        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-blue-400">download</span>
          <div className="text-2xl font-bold mt-2">123</div>
          <div className="text-sm text-white/60">Downloads</div>
        </CustomCard>

        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-purple-400">share</span>
          <div className="text-2xl font-bold mt-2">8</div>
          <div className="text-sm text-white/60">Compartilhados</div>
        </CustomCard>
      </div>

      {/* Report Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomCard title="Configurar Relatório" icon="settings">
          <div className="space-y-4">
            <CustomSelect
              label="Tipo de Relatório"
              value={reportType}
              onChange={setReportType}
              icon="description"
              options={[
                { value: 'summary', label: 'Resumo Executivo', icon: 'summarize' },
                { value: 'detailed', label: 'Detalhado', icon: 'article' },
                { value: 'supplies', label: 'Consumíveis', icon: 'inventory_2' },
                { value: 'maintenance', label: 'Manutenção', icon: 'build' },
                { value: 'costs', label: 'Custos', icon: 'attach_money' }
              ]}
            />

            <CustomSelect
              label="Período"
              value={dateRange}
              onChange={setDateRange}
              icon="date_range"
              options={[
                { value: '24h', label: 'Últimas 24 horas' },
                { value: '7d', label: 'Últimos 7 dias' },
                { value: '30d', label: 'Últimos 30 dias' },
                { value: '90d', label: 'Últimos 90 dias' },
                { value: 'custom', label: 'Personalizado' }
              ]}
            />

            <div className="space-y-2">
              <CustomCheckbox
                label="Incluir Gráficos"
                checked={includeCharts}
                onChange={() => setIncludeCharts(!includeCharts)}
              />
              <CustomCheckbox
                label="Incluir Detalhes Técnicos"
                checked={includeDetails}
                onChange={() => setIncludeDetails(!includeDetails)}
              />
            </div>

            <div className="flex gap-2 mt-6">
              <CustomButton icon="visibility" onClick={generateReport} className="flex-1">
                Visualizar
              </CustomButton>
              <CustomButton icon="picture_as_pdf" variant="secondary" onClick={exportPDF}>
                PDF
              </CustomButton>
              <CustomButton icon="table_chart" variant="secondary" onClick={exportExcel}>
                Excel
              </CustomButton>
            </div>
          </div>
        </CustomCard>

        <CustomCard title="Preview do Relatório" icon="preview">
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-white/5 rounded">
              <h3 className="font-semibold mb-2">Resumo Geral</h3>
              <div className="space-y-2 text-white/70">
                <div className="flex justify-between">
                  <span>Total de Dispositivos:</span>
                  <span className="font-bold">{devices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Online:</span>
                  <span className="font-bold text-green-400">
                    {devices.filter(d => d.status === 'ok').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Com Alertas:</span>
                  <span className="font-bold text-yellow-400">
                    {devices.filter(d => d.supplies && d.supplies.some(s =>
                      parseFloat((s.level || '').toString().replace('%', '')) < 20
                    )).length}
                  </span>
                </div>
              </div>
            </div>

            {includeCharts && (
              <div className="p-4 bg-white/5 rounded">
                <h3 className="font-semibold mb-2">Gráficos Incluídos</h3>
                <ul className="space-y-1 text-white/70">
                  <li className="flex items-center gap-2">
                    <span className="mi text-sm">check</span>
                    Status dos Dispositivos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="mi text-sm">check</span>
                    Níveis de Consumíveis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="mi text-sm">check</span>
                    Tendências de Uso
                  </li>
                </ul>
              </div>
            )}

            {includeDetails && (
              <div className="p-4 bg-white/5 rounded">
                <h3 className="font-semibold mb-2">Detalhes Técnicos</h3>
                <div className="text-white/70">
                  Informações detalhadas sobre cada dispositivo, incluindo IPs, modelos, números de série e histórico completo.
                </div>
              </div>
            )}
          </div>
        </CustomCard>
      </div>

      {/* Recent Reports */}
      <CustomCard title="Relatórios Recentes" subtitle="Últimos 5 gerados" icon="history">
        <div className="space-y-2">
          {[
            { name: 'Resumo Mensal - Novembro', date: '2024-12-01', size: '2.4MB', type: 'PDF' },
            { name: 'Consumíveis - Semana 48', date: '2024-11-28', size: '850KB', type: 'Excel' },
            { name: 'Manutenções Realizadas', date: '2024-11-25', size: '1.2MB', type: 'PDF' },
            { name: 'Análise de Custos Q4', date: '2024-11-20', size: '3.1MB', type: 'PDF' },
            { name: 'Status Semanal', date: '2024-11-18', size: '650KB', type: 'Excel' }
          ].map((report, idx) => (
            <div key={idx} className="p-3 bg-white/5 rounded hover:bg-white/10 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="mi text-2xl text-cyan-400">
                    {report.type === 'PDF' ? 'picture_as_pdf' : 'table_chart'}
                  </span>
                  <div>
                    <div className="font-semibold">{report.name}</div>
                    <div className="text-xs text-white/50">
                      {report.date} • {report.size}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CustomButton size="small" variant="ghost" icon="download" />
                  <CustomButton size="small" variant="ghost" icon="share" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CustomCard>
    </div>
  )
}
