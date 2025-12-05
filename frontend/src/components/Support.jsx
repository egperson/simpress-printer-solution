import React, { useState } from 'react'
import CustomCard from './CustomCard'
import CustomInput from './CustomInput'
import CustomButton from './CustomButton'

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium'
  })

  function handleSubmit(e) {
    e.preventDefault()
    alert('Ticket de suporte enviado com sucesso!')
    setFormData({ name: '', email: '', subject: '', message: '', priority: 'medium' })
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold">Suporte</h1>
        <p className="text-white/60">Central de ajuda e contato</p>
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CustomCard hover className="text-center p-6">
          <span className="mi text-5xl text-cyan-400 mb-3">email</span>
          <h3 className="font-semibold mb-2">E-mail</h3>
          <p className="text-sm text-white/60">suporte@printmonitor.com</p>
          <CustomButton size="small" variant="secondary" className="mt-3">
            Enviar E-mail
          </CustomButton>
        </CustomCard>

        <CustomCard hover className="text-center p-6">
          <span className="mi text-5xl text-green-400 mb-3">phone</span>
          <h3 className="font-semibold mb-2">Telefone</h3>
          <p className="text-sm text-white/60">(11) 3000-0000</p>
          <CustomButton size="small" variant="secondary" className="mt-3">
            Ligar Agora
          </CustomButton>
        </CustomCard>

        <CustomCard hover className="text-center p-6">
          <span className="mi text-5xl text-blue-400 mb-3">chat</span>
          <h3 className="font-semibold mb-2">Chat</h3>
          <p className="text-sm text-white/60">Segunda a Sexta, 9h-18h</p>
          <CustomButton size="small" variant="secondary" className="mt-3">
            Iniciar Chat
          </CustomButton>
        </CustomCard>
      </div>

      {/* Support Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomCard title="Abrir Ticket de Suporte" icon="support_agent">
          <form onSubmit={handleSubmit} className="space-y-4">
            <CustomInput
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              icon="person"
              required
            />

            <CustomInput
              label="E-mail *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon="email"
              required
            />

            <CustomInput
              label="Assunto *"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              icon="subject"
              required
            />

            <div className="custom-input">
              <label className="custom-input-label">Mensagem *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white min-h-[120px]"
                required
              />
            </div>

            <CustomButton type="submit" icon="send" className="w-full">
              Enviar Ticket
            </CustomButton>
          </form>
        </CustomCard>

        <div className="space-y-6">
          {/* FAQ */}
          <CustomCard title="Perguntas Frequentes" icon="help">
            <div className="space-y-3">
              {[
                { q: 'Como adicionar uma nova impressora?', a: 'Acesse Dispositivos > Nova Impressora e siga o assistente.' },
                { q: 'Como alterar alertas de toner?', a: 'Vá em Configurações > Alertas e ajuste os limites.' },
                { q: 'Como exportar relatórios?', a: 'Na aba Relatórios, selecione o tipo e clique em Exportar.' },
                { q: 'Suporte a múltiplas redes?', a: 'Sim, configure em Configurações > Rede.' }
              ].map((faq, idx) => (
                <details key={idx} className="p-3 bg-white/5 rounded cursor-pointer">
                  <summary className="font-semibold flex items-center gap-2">
                    <span className="mi text-cyan-400">help_outline</span>
                    {faq.q}
                  </summary>
                  <p className="text-sm text-white/70 mt-2 ml-7">{faq.a}</p>
                </details>
              ))}
            </div>
          </CustomCard>

          {/* Documentation */}
          <CustomCard title="Documentação" icon="menu_book">
            <div className="space-y-2">
              {[
                { title: 'Guia de Início Rápido', icon: 'rocket_launch' },
                { title: 'Manual do Usuário', icon: 'book' },
                { title: 'API Documentation', icon: 'code' },
                { title: 'Troubleshooting', icon: 'build' }
              ].map((doc, idx) => (
                <div key={idx} className="p-3 bg-white/5 rounded hover:bg-white/10 transition cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="mi text-cyan-400">{doc.icon}</span>
                    <span>{doc.title}</span>
                  </div>
                  <span className="mi text-white/40">arrow_forward</span>
                </div>
              ))}
            </div>
          </CustomCard>
        </div>
      </div>
    </div>
  )
}
