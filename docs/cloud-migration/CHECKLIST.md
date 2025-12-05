# Checklist de Migração para Cloud

## Pré-Requisitos

- [ ] Conta AWS/GCP/Azure
- [ ] Domínio registrado
- [ ] Certificado SSL configurado
- [ ] Repositório Git configurado

---

## Fase 1: Setup Inicial (Semana 1)

### Database
- [ ] Criar instância PostgreSQL
- [ ] Executar migrations
- [ ] Configurar backups automáticos
- [ ] Testar conexão

### Backend API
- [ ] Criar projeto Node.js + Express
- [ ] Implementar autenticação JWT
- [ ] Criar endpoint `/health`
- [ ] Configurar CORS
- [ ] Deploy inicial (Heroku/Railway para teste)

### Primeiro Teste
- [ ] Fazer request manual com curl
- [ ] Verificar logs
- [ ] Testar rate limiting

---

## Fase 2: Endpoint Sync (Semana 2)

### Backend
- [ ] Criar rota `POST /api/devices/sync`
- [ ] Implementar middleware `authenticateAgent`
- [ ] Salvar devices no banco
- [ ] Salvar supplies com histórico
- [ ] Criar alertas automáticos

### Testes
- [ ] Unit tests com Jest
- [ ] Integration tests
- [ ] Load testing (100 devices)
- [ ] Verificar performance (<500ms)

---

## Fase 3: Agente Local (Semana 3)

### Desenvolvimento
- [ ] Extrair código de coleta atual
- [ ] Criar `agente-local/` package
- [ ] Implementar sync.js
- [ ] Adicionar retry logic
- [ ] Configurar Winston logger

### Instalação
- [ ] Criar script para Windows Service
- [ ] Criar script para Linux Systemd
- [ ] Testar instalação local
- [ ] Documentar processo

### Teste Integração
- [ ] Instalar agente em rede teste
- [ ] Verificar scan de impressoras
- [ ] Verificar sync com cloud
- [ ] Monitorar logs

---

## Fase 4: Frontend (Semana 4)

### Adaptação
- [ ] Criar `services/api.js`
- [ ] Remover chamadas localhost
- [ ] Implementar login/logout
- [ ] Adaptar todos os componentes
- [ ] Adicionar loading states

### Build & Deploy
- [ ] Configurar env vars
- [ ] Build otimizado
- [ ] Deploy Vercel/Netlify
- [ ] Testar produção

---

## Fase 5: Features Adicionais (Semana 5)

### Multi-Tenancy
- [ ] Admin dashboard
- [ ] Gestão de clientes
- [ ] Separação de dados
- [ ] Billing (opcional)

### Alertas Avançados
- [ ] Email notifications
- [ ] Webhook support
- [ ] Slack integration
- [ ] Custom thresholds por cliente

---

## Fase 6: Testes & Produção (Semana 6)

### Testes Finais
- [ ] Teste com cliente piloto
- [ ] Stress test (1000+ devices)
- [ ] Security audit
- [ ] Performance benchmarks

### Documentação
- [ ] API documentation
- [ ] User guide
- [ ] Admin guide
- [ ] Troubleshooting

### Go Live
- [ ] Migration plan comunicado
- [ ] Backup de dados atuais
- [ ] Deploy produção
- [ ] Monitoramento 24/7 primeira semana

---

## Pós-Produção

### Monitoring
- [ ] Setup New Relic/DataDog
- [ ] Configure alertas
- [ ] Dashboard de métricas
- [ ] Log aggregation (Papertrail/Loggly)

### Manutenção
- [ ] Backups testados semanalmente
- [ ] Updates de segurança mensais
- [ ] Performance reviews
- [ ] User feedback

---

## Rollback Plan

Se algo der errado:

1. **Imediato (< 1h)**:
   - [ ] Desativar agentes
   - [ ] Voltar para sistema local
   - [ ] Comunicar usuários

2. **Investigação**:
   - [ ] Revisar logs
   - [ ] Identificar root cause
   - [ ] Criar fix

3. **Retry**:
   - [ ] Deploy fix
   - [ ] Teste isolado
   - [ ] Retry migration

---

## Métricas de Sucesso

- [ ] 99.5%+ uptime
- [ ] < 500ms response time
- [ ] 0 data loss
- [ ] < 5% error rate
- [ ] Positive user feedback

---

## Custos Estimados

| Fase | Desenvolvimento | Cloud | Total |
|------|----------------|-------|-------|
| 1-2 | 40h | $0 (free tier) | 40h |
| 3-4 | 60h | $20 | 60h + $20 |
| 5-6 | 40h | $60 | 40h + $60 |
| **Total** | **140h** | **$80** | **~R$ 20k + $80/mês** |

(Assumindo R$ 150/h desenvolvedor)

---

## Contatos Importantes

- **DevOps**: [email]
- **Database Admin**: [email]
- **Security**: [email]
- **Support Lead**: [email]

---

## Próxima Revisão

Data: __________
Responsável: __________
Status: [ ] On Track [ ] At Risk [ ] Delayed
