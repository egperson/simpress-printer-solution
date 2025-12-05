# Network Printer Solution

Sistema de monitoramento para impressoras em rede: gestão de suprimentos e status de dispositivos HP.

## 📁 Estrutura do Projeto

```
simpress-printer-solution/
├── backend/                    # Servidor Node.js
│   ├── server.js              # Servidor principal
│   ├── server/                # Módulos do servidor
│   │   ├── services/          # Lógica de negócio
│   │   │   └── collector.js   # Coleta de dados das impressoras
│   │   └── utils/             # Utilitários
│   │       └── parser.js      # Parser de HTML das impressoras
│   ├── data/                  # Dados persistentes
│   │   ├── data.json          # Dados coletados
│   │   ├── printers.json      # Configuração de impressoras
│   │   └── history.db         # Banco de dados SQLite
│   └── package.json           # Dependências do backend
│
└── frontend/                   # Aplicação React
    ├── src/
    │   ├── components/        # Componentes React
    │   ├── App.jsx            # Componente principal
    │   ├── main.jsx           # Entry point
    │   └── index.css          # Estilos globais
    ├── package.json           # Dependências do frontend
    └── vite.config.js         # Configuração Vite
```

## 🚀 Como Rodar

### Backend

```bash
cd backend
npm install
npm start
```

O servidor estará rodando em `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará rodando em `http://localhost:5173`

## 🔧 Configuração

### Configurar Impressoras (backend/data/printers.json)

```json
{
  "scan": {
    "enabled": true,
    "base": "10.12.86.",
    "start": 135,
    "end": 200,
    "protocol": "https",
    "concurrency": 15
  },
  "threshold": 15,
  "printers": []
}
```

**Opções:**
- `scan.enabled`: Ativa/desativa varredura automática de rede
- `scan.base`: Base do IP (ex: "10.12.86.")
- `scan.start/end`: Faixa de IPs para escanear
- `scan.protocol`: `http` ou `https`
- `scan.concurrency`: Número de requisições simultâneas
- `threshold`: Percentual mínimo para alertas de consumíveis
- `printers`: Lista manual de impressoras (opcional)

## 📡 API Endpoints

### Status
- `GET /api/status` - Status atual dos dispositivos
- `POST /api/collect` - Forçar coleta manual

### Alertas
- `GET /api/alerts/stream` - Stream SSE de alertas em tempo real
- `GET /api/alerts/history?limit=100&type=low-supply&deviceId=...` - Histórico

### Histórico
- `GET /api/history?from=...&to=...&limit=200` - Histórico de snapshots
- `GET /api/history/device?device=...&limit=200` - Histórico por dispositivo
- `GET /api/history/export?limit=1000` - Exportar CSV

### Servidor
- `GET /api/server/info` - Informações do servidor (uptime, versão, etc)

### Configuração
- `GET /api/printers` - Obter configuração
- `POST /api/printers` - Atualizar configuração

## ✨ Funcionalidades

### Dashboard
- Visão geral de todos os dispositivos
- Status online/offline
- Alertas de consumíveis baixos
- Distribuição por tipo (mono/color)

### Devices
- Lista detalhada de impressoras
- Informações de consumíveis e bandejas
- Histórico por dispositivo
- Testes de conectividade
- Exportação de dados

### Alertas
- Histórico completo de alertas
- Filtros por tipo e dispositivo
- Atualização automática

### Inventário
- Gerenciamento de estoque de consumíveis
- Importar/exportar JSON
- Rastreamento de uso

### Status
- Saúde do servidor
- Métricas de coleta
- Ações rápidas

### Suporte
- Informações do sistema
- Documentação de API
- Resolução de problemas

## 🔄 Atualização Automática

- **Frontend**: Atualiza a cada 30 segundos
- **Backend**: Coleta dados a cada 30 minutos (configurável em `server.js`)
- **Alertas**: Stream em tempo real via SSE

## 🛠 Tecnologias

### Backend
- Node.js + Express
- SQLite3 (histórico)
- Cheerio (parser HTML)
- Axios (HTTP client)
- node-cron (agendamento)

### Frontend
- React 18
- Vite
- TailwindCSS
- EventSource (SSE)

## 📝 Logs e Depuração

O servidor imprime logs no console:
- Início de coletas agendadas
- Conclusões de coleta
- Erros de processamento

## 🔐 Segurança

⚠️ **ATENÇÃO**: O código desabilita verificação de certificados SSL:
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
```

Isso é necessário para impressoras com certificados self-signed em rede local, mas **NÃO** deve ser usado em produção ou redes públicas.

## 📄 Licença

Mozilla Public License Version 2.0
