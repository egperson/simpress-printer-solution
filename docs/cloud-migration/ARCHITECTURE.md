# Plano de Migração para Cloud - Arquitetura Híbrida

## Visão Geral

Migração do sistema atual (monolítico local) para arquitetura híbrida com:
- **Agente Local**: Escaneia rede interna
- **Backend Cloud**: API REST, armazenamento, lógica
- **Frontend Cloud**: Interface web acessível de qualquer lugar

---

## Arquitetura Atual vs. Futura

### Atual (Monolítico Local)
```
┌─────────────────────────────────┐
│  Rede Local (192.168.x.x)       │
│                                 │
│  ┌──────────┐  ┌──────────┐   │
│  │Impressora│  │Impressora│   │
│  └────▲─────┘  └────▲─────┘   │
│       │             │          │
│  ┌────┴──────────────┴─────┐  │
│  │   Backend Local          │  │
│  │   (Node.js)              │  │
│  └────────▲─────────────────┘  │
│           │                     │
│  ┌────────┴─────────────────┐  │
│  │   Frontend Local          │  │
│  │   (React)                 │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
Acesso: localhost:5173
```

### Futura (Híbrida Cloud)
```
┌─────────────────────────────────┐
│  Rede Local - Cliente A         │
│                                 │
│  ┌──────────┐  ┌──────────┐   │
│  │Impressora│  │Impressora│   │
│  └────▲─────┘  └────▲─────┘   │
│       │             │          │
│  ┌────┴──────────────┴─────┐  │
│  │   Agente Local           │  │
│  │   (Lightweight Node.js)  │  │
│  └────────┬─────────────────┘  │
└───────────┼─────────────────────┘
            │ HTTPS
            ▼
┌───────────────────────────────────┐
│        Cloud (AWS/GCP/Azure)      │
│                                   │
│  ┌─────────────────────────────┐ │
│  │   Backend API                │ │
│  │   (Node.js + Express)        │ │
│  │   - /api/devices/sync       │ │
│  │   - /api/devices/list       │ │
│  │   - /api/alerts             │ │
│  └──────┬──────────────────────┘ │
│         │                         │
│  ┌──────▼──────────────────────┐ │
│  │   Database                   │ │
│  │   (PostgreSQL/MongoDB)       │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │   Frontend Web               │ │
│  │   (React - Static)           │ │
│  └─────────────────────────────┘ │
└───────────────────────────────────┘
Acesso: https://printmonitor.com
```

---

## Componentes Detalhados

### 1. Agente Local

**Responsabilidades**:
- Escanear rede local a cada X minutos
- Coletar dados de impressoras (SNMP)
- Enviar dados para cloud via HTTPS
- Manter configuração local (cache)
- Retry automático em caso de falha

**Tecnologias**:
- Node.js (mesmo código atual de coleta)
- PM2 (manter rodando como serviço)
- Winston (logging)
- Axios (comunicação HTTP)

**Instalação**:
- Windows: Serviço do Windows
- Linux: Systemd service
- Docker: Container local

### 2. Backend Cloud

**Responsabilidades**:
- Receber dados dos agentes
- Armazenar histórico
- Processar alertas
- Expor API REST
- Autenticação/Autorização
- Multi-tenancy (múltiplos clientes)

**Tecnologias**:
- Node.js + Express
- PostgreSQL (dados estruturados)
- Redis (cache)
- JWT (autenticação)
- Docker + Kubernetes

**Endpoints Principais**:
```
POST   /api/auth/login
POST   /api/devices/sync          # Agente envia dados
GET    /api/devices/list/:clientId
GET    /api/devices/:id
GET    /api/alerts/:clientId
POST   /api/inventory/items
GET    /api/reports/:type
```

### 3. Frontend Cloud

**Responsabilidades**:
- Interface web responsiva
- Dashboard multi-cliente (admin)
- Relatórios e gráficos
- Gerenciamento de alertas

**Tecnologias**:
- React (código atual!)
- Hospedagem: Vercel/Netlify/S3+CloudFront
- Build otimizado

---

## Modelo de Dados

### Database Schema

```sql
-- Clientes (Multi-tenancy)
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  api_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP,
  active BOOLEAN
);

-- Agentes
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  name VARCHAR(255),
  ip_address VARCHAR(45),
  version VARCHAR(20),
  last_sync TIMESTAMP
);

-- Dispositivos
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  agent_id UUID REFERENCES agents(id),
  device_name VARCHAR(255),
  device_ip VARCHAR(45),
  device_type VARCHAR(50),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  status VARCHAR(20),
  last_seen TIMESTAMP,
  created_at TIMESTAMP
);

-- Consumíveis (Histórico)
CREATE TABLE supplies (
  id UUID PRIMARY KEY,
  device_id UUID REFERENCES devices(id),
  name VARCHAR(255),
  color VARCHAR(50),
  level INTEGER,
  recorded_at TIMESTAMP
);

-- Alertas
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  device_id UUID REFERENCES devices(id),
  type VARCHAR(50),
  priority VARCHAR(20),
  message TEXT,
  acknowledged BOOLEAN,
  created_at TIMESTAMP
);
```

---

## Fluxo de Dados Completo

### 1. Coleta (Agente → Cloud)

```javascript
// agente-local/sync.js
async function syncDevicesToCloud() {
  const devices = await scanLocalNetwork() // Código atual
  
  const response = await axios.post(
    'https://api.printmonitor.com/api/devices/sync',
    {
      agentId: process.env.AGENT_ID,
      timestamp: new Date().toISOString(),
      devices: devices
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  console.log(`Synced ${devices.length} devices`)
}

// Executar a cada 5 minutos
setInterval(syncDevicesToCloud, 5 * 60 * 1000)
```

### 2. Recepção (Cloud Backend)

```javascript
// backend-cloud/routes/devices.js
router.post('/sync', authenticateAgent, async (req, res) => {
  const { agentId, devices, timestamp } = req.body
  const clientId = req.client.id // Do token JWT
  
  try {
    // Salvar dispositivos
    for (const device of devices) {
      await Device.upsert({
        clientId,
        agentId,
        deviceName: device.deviceName,
        deviceIp: device.deviceIp,
        status: device.status,
        lastSeen: timestamp,
        ...device
      })
      
      // Salvar consumíveis
      for (const supply of device.supplies || []) {
        await Supply.create({
          deviceId: device.id,
          name: supply.name,
          level: supply.level,
          recordedAt: timestamp
        })
        
        // Verificar alertas
        if (supply.level < 20) {
          await Alert.create({
            clientId,
            deviceId: device.id,
            type: 'low-supply',
            priority: supply.level < 10 ? 'critical' : 'warning',
            message: `${supply.name} baixo: ${supply.level}%`
          })
        }
      }
    }
    
    // Atualizar timestamp do agente
    await Agent.update({ lastSync: timestamp }, { where: { id: agentId } })
    
    res.json({ ok: true, processed: devices.length })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})
```

### 3. Consumo (Frontend)

```javascript
// frontend/src/hooks/useDevices.js
export function useDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchDevices() {
      const response = await fetch('/api/devices/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      setDevices(data.devices)
      setLoading(false)
    }
    
    fetchDevices()
    const interval = setInterval(fetchDevices, 30000) // Auto-refresh
    return () => clearInterval(interval)
  }, [])
  
  return { devices, loading }
}
```

---

## Segurança

### 1. Autenticação do Agente

```javascript
// Agente usa API Key única por cliente
headers: {
  'Authorization': 'Bearer sk_live_abc123...'
}

// Backend valida e extrai clientId
const client = await Client.findOne({ 
  where: { apiKey: token } 
})
```

### 2. Autenticação de Usuários

```javascript
// Login tradicional
POST /api/auth/login
{
  email: "admin@empresa.com",
  password: "***"
}

// Retorna JWT
{
  token: "eyJhbGciOiJIUzI1NiIs...",
  clientId: "uuid-cliente"
}
```

### 3. HTTPS Obrigatório

- Certificado SSL (Let's Encrypt)
- Todas as comunicações criptografadas
- API Keys rotacionáveis

---

## Deployment

### 1. Agente Local

```bash
# Instalação em servidor Windows/Linux da empresa
npm install -g @printmonitor/agent

# Configuração
printmonitor-agent init
# Insere API Key
# Configura intervalo de sync

# Iniciar como serviço
printmonitor-agent start
```

### 2. Backend Cloud

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: printmonitor/backend:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://...
      JWT_SECRET: ...
    
  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
```

### 3. Frontend

```bash
# Build
npm run build

# Deploy (Vercel)
vercel deploy --prod

# Ou S3 + CloudFront
aws s3 sync dist/ s3://printmonitor-frontend/
```

---

## Migração Passo a Passo

### Fase 1: Preparação (1 semana)
- [ ] Criar schemas de banco de dados
- [ ] Desenvolver API REST básica
- [ ] Implementar autenticação JWT
- [ ] Criar endpoint `/sync`

### Fase 2: Agente Local (1 semana)
- [ ] Extrair código de coleta atual
- [ ] Adicionar lógica de sync HTTP
- [ ] Implementar retry logic
- [ ] Criar instalador (Windows/Linux)

### Fase 3: Backend Cloud (2 semanas)
- [ ] Endpoints CRUD completos
- [ ] Sistema de alertas
- [ ] Histórico de consumíveis
- [ ] Multi-tenancy

### Fase 4: Frontend Adaptado (1 semana)
- [ ] Remover chamadas locais
- [ ] Adicionar autenticação
- [ ] Adaptar para API REST
- [ ] Adicionar dashboard multi-cliente (admin)

### Fase 5: Testes e Deploy (1 semana)
- [ ] Testes integração
- [ ] Deploy cloud
- [ ] Instalação agente em produção
- [ ] Monitoramento

---

## Custos Estimados (Mensal)

| Item | Opção | Custo |
|------|-------|-------|
| **Backend** | AWS EC2 t3.small | $15 |
| **Database** | AWS RDS PostgreSQL | $25 |
| **Redis** | AWS ElastiCache | $15 |
| **Frontend** | Vercel/Netlify | $0-20 |
| **Storage** | AWS S3 | $5 |
| **Domínio** | Route53 + SSL | $2 |
| **TOTAL** | | **~$62-82/mês** |

Escala: +$30-50 a cada 1000 impressoras

---

## Vantagens da Arquitetura

✅ **Escalável**: Adicionar clientes sem tocar infraestrutura
✅ **Seguro**: Dados não saem da rede até agente enviar
✅ **Multi-site**: Suporta múltiplas empresas/filiais
✅ **Acessível**: Web de qualquer lugar
✅ **Histórico**: Banco centralizado com tendências
✅ **SaaS Ready**: Modelo de assinatura possível

---

## Próximos Passos

Quando decidir implementar:

1. Criar repositório `printmonitor-cloud`
2. Scaffold backend (Express + Prisma/Sequelize)
3. Extrair lógica de coleta para `printmonitor-agent`
4. Adaptar frontend para consumir API REST
5. Deploy MVP em Heroku/Railway (grátis para teste)
6. Testar com 1 cliente piloto

**Tempo estimado**: 4-6 semanas para MVP funcional
