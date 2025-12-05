import React, { useState, useEffect } from 'react'
import CustomCard from './CustomCard'
import CustomButton from './CustomButton'
import CustomCheckbox from './CustomCheckbox'

export default function AutoReorder({ data }) {
  const [rules, setRules] = useState([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('monitor.reorder')
      if (raw) setRules(JSON.parse(raw))
    } catch (e) { console.error(e) }
  }, [])

  function saveRules(newRules) {
    localStorage.setItem('monitor.reorder', JSON.stringify(newRules))
    setRules(newRules)
  }

  function toggleRule(id) {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    saveRules(updated)
  }

  function deleteRule(id) {
    if (!confirm('Remover regra?')) return
    saveRules(rules.filter(r => r.id !== id))
  }

  const devices = (data && data.devices) || []
  const suggestedOrders = devices
    .filter(d => d.supplies && d.supplies.some(s => {
      const level = parseFloat((s.level || '').toString().replace('%', '')) || 0
      return level < 15
    }))
    .slice(0, 5)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos Automáticos</h1>
          <p className="text-white/60">Gerenciar reposição automática de consumíveis</p>
        </div>
        <CustomButton icon="add" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nova Regra'}
        </CustomButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-cyan-400">rule</span>
          <div className="text-2xl font-bold mt-2">{rules.length}</div>
          <div className="text-sm text-white/60">Regras Ativas</div>
        </CustomCard>

        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-yellow-400">shopping_cart</span>
          <div className="text-2xl font-bold mt-2">{suggestedOrders.length}</div>
          <div className="text-sm text-white/60">Pedidos Sugeridos</div>
        </CustomCard>

        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-green-400">check_circle</span>
          <div className="text-2xl font-bold mt-2">12</div>
          <div className="text-sm text-white/60">Pedidos Este Mês</div>
        </CustomCard>

        <CustomCard hover className="text-center p-4">
          <span className="mi text-4xl text-blue-400">savings</span>
          <div className="text-2xl font-bold mt-2">R$ 2.4k</div>
          <div className="text-sm text-white/60">Economia Total</div>
        </CustomCard>
      </div>

      {/* Suggested Orders */}
      {suggestedOrders.length > 0 && (
        <CustomCard title="Pedidos Sugeridos" subtitle="Dispositivos com baixo consumível" icon="lightbulb" variant="warning">
          <div className="space-y-3">
            {suggestedOrders.map((device, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded border border-yellow-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{device.deviceName || device.name}</h3>
                    <p className="text-xs text-white/50">{device.deviceIp || device.url}</p>
                  </div>
                  <CustomButton size="small" icon="shopping_cart">
                    Pedir Agora
                  </CustomButton>
                </div>
                <div className="space-y-2">
                  {device.supplies
                    .filter(s => parseFloat((s.level || '').toString().replace('%', '')) < 15)
                    .map((supply, si) => {
                      const level = parseFloat((supply.level || '').toString().replace('%', '')) || 0
                      return (
                        <div key={si} className="flex items-center justify-between text-sm">
                          <span className="text-white/70">{supply.name}</span>
                          <div className="flex items-center gap-3">
                            <span className={`font-bold ${level < 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                              {level}%
                            </span>
                            <span className="text-xs text-white/50">~R$ 150,00</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </CustomCard>
      )}

      {/* Auto-Reorder Rules */}
      <CustomCard title="Regras de Pedido Automático" icon="smart_toy">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <span className="mi text-5xl mb-2">rule_folder</span>
            <p>Nenhuma regra configurada</p>
            <CustomButton className="mt-4" icon="add" onClick={() => setShowForm(true)}>
              Criar Primeira Regra
            </CustomButton>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className={`p-4 rounded border ${rule.enabled ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-start gap-3">
                  <CustomCheckbox
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{rule.name}</h3>
                    <p className="text-sm text-white/70 mt-1">
                      Quando <strong>{rule.supply}</strong> atingir <strong>{rule.threshold}%</strong>, pedir <strong>{rule.quantity}</strong> unidade(s)
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-white/50">
                      <span>Fornecedor: {rule.supplier}</span>
                      <span>Preço estimado: R$ {rule.price}</span>
                    </div>
                  </div>
                  <CustomButton size="small" variant="ghost" icon="delete" onClick={() => deleteRule(rule.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CustomCard>

      {/* Order History */}
      <CustomCard title="Histórico de Pedidos" subtitle="Últimos 30 dias" icon="history">
        <div className="space-y-2">
          {[
            { date: '05/12/2024', item: 'Toner HP 85A', qty: 3, value: '450,00', status: 'Entregue' },
            { date: '01/12/2024', item: 'Toner Brother TN-450', qty: 2, value: '280,00', status: 'Em Trânsito' },
            { date: '28/11/2024', item: 'Papel A4 - 5 Resmas', qty: 5, value: '125,00', status: 'Entregue' }
          ].map((order, idx) => (
            <div key={idx} className="p-3 bg-white/5 rounded hover:bg-white/10 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{order.item}</div>
                  <div className="text-xs text-white/50 mt-1">
                    {order.date} • Qtd: {order.qty}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">R$ {order.value}</div>
                  <div className={`text-xs mt-1 ${order.status === 'Entregue' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {order.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CustomCard>
    </div>
  )
}
