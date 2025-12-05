import React, { useState } from 'react'
import CustomCard from './CustomCard'
import CustomSelect from './CustomSelect'
import CustomButton from './CustomButton'
import CustomInput from './CustomInput'

export default function Settings() {
  const [settings, setSettings] = useState({
    autoRefresh: 30,
    alertThreshold: 20,
    theme: 'dark',
    notifications: true,
    soundAlerts: false,
    emailNotifications: false,
    email: ''
  })

  function handleSave() {
    localStorage.setItem('monitor.settings', JSON.stringify(settings))
    alert('Configurações salvas com sucesso!')
  }

  function handleReset() {
    if (!confirm('Resetar todas as configurações?')) return
    const defaults = {
      autoRefresh: 30,
      alertThreshold: 20,
      theme: 'dark',
      notifications: true,
      soundAlerts: false,
      emailNotifications: false,
      email: ''
    }
    setSettings(defaults)
    localStorage.setItem('monitor.settings', JSON.stringify(defaults))
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-white/60">Personalize a aplicação</p>
        </div>
        <div className="flex gap-2">
          <CustomButton variant="secondary" icon="restore" onClick={handleReset}>
            Resetar
          </CustomButton>
          <CustomButton icon="save" onClick={handleSave}>
            Salvar Alterações
          </CustomButton>
        </div>
      </div>

      {/* General Settings */}
      <CustomCard title="Geral" icon="settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomInput
            label="Auto-Refresh (segundos)"
            type="number"
            value={settings.autoRefresh}
            onChange={(e) => setSettings({ ...settings, autoRefresh: parseInt(e.target.value) || 30 })}
            icon="refresh"
          />

          <CustomInput
            label="Limite de Alerta de Consumível (%)"
            type="number"
            value={settings.alertThreshold}
            onChange={(e) => setSettings({ ...settings, alertThreshold: parseInt(e.target.value) || 20 })}
            icon="warning"
          />
        </div>
      </CustomCard>

      {/* Appearance */}
      <CustomCard title="Aparência" icon="palette">
        <CustomSelect
          label="Tema"
          value={settings.theme}
          onChange={(theme) => setSettings({ ...settings, theme })}
          icon="brightness_6"
          options={[
            { value: 'dark', label: 'Escuro', icon: 'dark_mode' },
            { value: 'light', label: 'Claro', icon: 'light_mode' },
            { value: 'auto', label: 'Automático', icon: 'brightness_auto' }
          ]}
        />
      </CustomCard>

      {/* Notifications */}
      <CustomCard title="Notificações" icon="notifications">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded">
            <div>
              <div className="font-medium">Notificações do Sistema</div>
              <div className="text-sm text-white/60">Exibir alertas na interface</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded">
            <div>
              <div className="font-medium">Som de Alerta</div>
              <div className="text-sm text-white/60">Tocar som ao receber alertas</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundAlerts}
                onChange={(e) => setSettings({ ...settings, soundAlerts: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          <div className="p-3 bg-white/5 rounded">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium">E-mail de Alertas</div>
                <div className="text-sm text-white/60">Receber alertas por e-mail</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
            {settings.emailNotifications && (
              <CustomInput
                label="E-mail"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                icon="email"
                placeholder="seu@email.com"
              />
            )}
          </div>
        </div>
      </CustomCard>

      {/* Data Management */}
      <CustomCard title="Gerenciamento de Dados" icon="storage" variant="warning">
        <div className="space-y-3">
          <CustomButton variant="secondary" icon="download" className="w-full md:w-auto">
            Backup Completo
          </CustomButton>
          <CustomButton variant="secondary" icon="upload" className="w-full md:w-auto">
            Restaurar Backup
          </CustomButton>
          <CustomButton variant="danger" icon="delete_forever" className="w-full md:w-auto">
            Clear Limpar Todos os Dados
          </CustomButton>
        </div>
      </CustomCard>
    </div>
  )
}
