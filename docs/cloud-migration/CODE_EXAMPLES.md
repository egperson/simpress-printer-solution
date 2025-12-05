# Exemplos de Código - Cloud Migration

## 1. Agente Local Completo

### agente-local/package.json
```json
{
  "name": "@printmonitor/agent",
  "version": "1.0.0",
  "description": "Agente local para escanear impressoras",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "install-service": "node install-service.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "node-snmp-native": "^1.0.0"
  }
}
```

### agente-local/.env.example
```env
# API Configuration
API_URL=https://api.printmonitor.com
API_KEY=sk_live_your_api_key_here

# Agent Configuration
AGENT_ID=auto-generated-on-first-run
SYNC_INTERVAL=300000
# 300000ms = 5 minutos

# Network Scanning
NETWORK_PREFIX=192.168.1
IP_START=1
IP_END=254
TIMEOUT=3000

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/agent.log
```

### agente-local/index.js
```javascript
require('dotenv').config()
const logger = require('./logger')
const collector = require('./collector')
const sync = require('./sync')

// Inicialização
async function init() {
  logger.info('PrintMonitor Agent starting...')
  logger.info(`API URL: ${process.env.API_URL}`)
  logger.info(`Sync Interval: ${process.env.SYNC_INTERVAL}ms`)
  
  // Primeira execução imediata
  await runSync()
  
  // Agendar execuções periódicas
  const interval = parseInt(process.env.SYNC_INTERVAL) || 300000
  setInterval(runSync, interval)
  
  logger.info('Agent initialized successfully')
}

async function runSync() {
  try {
    logger.info('Starting network scan...')
    
    // Coletar dados localmente
    const devices = await collector.scanNetwork()
    logger.info(`Found ${devices.length} devices`)
    
    // Enviar para cloud
    const result = await sync.uploadToCloud(devices)
    logger.info(`Sync completed: ${result.processed} devices processed`)
    
  } catch (error) {
    logger.error('Sync failed:', error)
  }
}

// Handlers de erro
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error)
})

// Iniciar
init().catch(error => {
  logger.error('Failed to initialize:', error)
  process.exit(1)
})
```

### agente-local/collector.js
```javascript
// Reutilizar código atual de backend/server/services/collector.js
const snmp = require('node-snmp-native')

async function scanNetwork() {
  const devices = []
  const prefix = process.env.NETWORK_PREFIX || '192.168.1'
  const start = parseInt(process.env.IP_START) || 1
  const end = parseInt(process.env.IP_END) || 254
  
  const promises = []
  
  for (let i = start; i <= end; i++) {
    const ip = `${prefix}.${i}`
    promises.push(checkDevice(ip))
  }
  
  const results = await Promise.allSettled(promises)
  
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      devices.push(result.value)
    }
  })
  
  return devices
}

async function checkDevice(ip) {
  const session = new snmp.Session({ host: ip, community: 'public' })
  
  try {
    // SNMP OIDs padrão
    const varbinds = await session.getAll({
      oid: [
        '1.3.6.1.2.1.1.1.0',      // sysDescr
        '1.3.6.1.2.1.1.5.0',      // sysName
        '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.3.0' // HP Toner Level
      ]
    })
    
    return {
      deviceIp: ip,
      deviceName: varbinds[1].value,
      description: varbinds[0].value,
      status: 'ok',
      manufacturer: detectManufacturer(varbinds[0].value),
      supplies: parseSupplies(varbinds),
      scannedAt: new Date().toISOString()
    }
    
  } catch (error) {
    return null // Não é impressora ou inacessível
  } finally {
    session.close()
  }
}

function detectManufacturer(sysDescr) {
  if (sysDescr.includes('HP')) return 'HP'
  if (sysDescr.includes('Brother')) return 'Brother'
  if (sysDescr.includes('Canon')) return 'Canon'
  return 'Unknown'
}

function parseSupplies(varbinds) {
  // Lógica específica por fabricante
  // Simplificado para exemplo
  return [{
    name: 'Toner Black',
    level: Math.floor(Math.random() * 100),
    color: 'black'
  }]
}

module.exports = { scanNetwork }
```

### agente-local/sync.js
```javascript
const axios = require('axios')
const logger = require('./logger')

const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 segundos

async function uploadToCloud(devices) {
  let attempt = 0
  
  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.post(
        `${process.env.API_URL}/api/devices/sync`,
        {
          agentId: process.env.AGENT_ID,
          timestamp: new Date().toISOString(),
          devices: devices
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos
        }
      )
      
      return response.data
      
    } catch (error) {
      attempt++
      logger.error(`Sync attempt ${attempt} failed:`, error.message)
      
      if (attempt < MAX_RETRIES) {
        logger.info(`Retrying in ${RETRY_DELAY}ms...`)
        await sleep(RETRY_DELAY)
      } else {
        throw new Error(`Failed after ${MAX_RETRIES} attempts`)
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = { uploadToCloud }
```

### agente-local/logger.js
```javascript
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE || './logs/agent.log' 
    })
  ]
})

module.exports = logger
```

---

## 2. Backend Cloud Completo

### backend-cloud/package.json
```json
{
  "name": "printmonitor-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "npx prisma migrate deploy"
  },
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1"
  }
}
```

### backend-cloud/server.js
```javascript
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const authRoutes = require('./routes/auth')
const devicesRoutes = require('./routes/devices')
const alertsRoutes = require('./routes/alerts')

const app = express()

// Middlewares
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requests por janela
})
app.use('/api/', limiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/devices', devicesRoutes)
app.use('/api/alerts', alertsRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### backend-cloud/routes/devices.js
```javascript
const express = require('express')
const router = express.Router()
const { authenticateAgent, authenticateUser } = require('../middleware/auth')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Agente envia dados (autenticado com API Key)
router.post('/sync', authenticateAgent, async (req, res) => {
  try {
    const { agentId, devices, timestamp } = req.body
    const clientId = req.client.id
    
    // Processar cada dispositivo
    for (const device of devices) {
      // Upsert device
      const savedDevice = await prisma.device.upsert({
        where: { 
          clientId_deviceIp: { 
            clientId, 
            deviceIp: device.deviceIp 
          } 
        },
        update: {
          deviceName: device.deviceName,
          status: device.status,
          manufacturer: device.manufacturer,
          lastSeen: timestamp
        },
        create: {
          clientId,
          agentId,
          deviceIp: device.deviceIp,
          deviceName: device.deviceName,
          status: device.status,
          manufacturer: device.manufacturer,
          lastSeen: timestamp
        }
      })
      
      // Salvar consumíveis
      if (device.supplies) {
        for (const supply of device.supplies) {
          await prisma.supply.create({
            data: {
              deviceId: savedDevice.id,
              name: supply.name,
              color: supply.color,
              level: supply.level,
              recordedAt: timestamp
            }
          })
          
          // Criar alerta se necessário
          if (supply.level < 20) {
            await prisma.alert.create({
              data: {
                clientId,
                deviceId: savedDevice.id,
                type: 'low-supply',
                priority: supply.level < 10 ? 'critical' : 'warning',
                message: `${supply.name} em ${device.deviceName}: ${supply.level}%`,
                acknowledged: false
              }
            })
          }
        }
      }
    }
    
    // Atualizar agente
    await prisma.agent.update({
      where: { id: agentId },
      data: { lastSync: timestamp }
    })
    
    res.json({ 
      ok: true, 
      processed: devices.length,
      timestamp 
    })
    
  } catch (error) {
    console.error('Sync error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Usuário lista dispositivos (autenticado com JWT)
router.get('/list', authenticateUser, async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { clientId: req.user.clientId },
      include: {
        supplies: {
          orderBy: { recordedAt: 'desc' },
          take: 10 // Últimos 10 registros por consumível
        }
      },
      orderBy: { deviceName: 'asc' }
    })
    
    res.json({ devices })
    
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
```

### backend-cloud/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Autenticar agente via API Key
async function authenticateAgent(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing API key' })
    }
    
    const apiKey = authHeader.substring(7)
    
    const client = await prisma.client.findUnique({
      where: { apiKey }
    })
    
    if (!client || !client.active) {
      return res.status(401).json({ error: 'Invalid API key' })
    }
    
    req.client = client
    next()
    
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Autenticar usuário via JWT
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' })
    }
    
    const token = authHeader.substring(7)
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    
    req.user = user
    next()
    
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { authenticateAgent, authenticateUser }
```

---

## 3. Frontend Adaptado

### frontend/src/services/api.js
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.printmonitor.com'

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token')
  }
  
  setToken(token) {
    this.token = token
    localStorage.setItem('token', token)
  }
  
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  // Devices
  async getDevices() {
    return this.request('/api/devices/list')
  }
  
  async getDevice(id) {
    return this.request(`/api/devices/${id}`)
  }
  
  // Alerts
  async getAlerts() {
    return this.request('/api/alerts')
  }
  
  // Auth
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    
    this.setToken(data.token)
    return data
  }
  
  logout() {
    this.token = null
    localStorage.removeItem('token')
  }
}

export default new ApiService()
```

### frontend/src/App.jsx (adaptado)
```javascript
import { useEffect, useState } from 'react'
import api from './services/api'

function App() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadDevices()
    const interval = setInterval(loadDevices, 30000) // 30s
    return () => clearInterval(interval)
  }, [])
  
  async function loadDevices() {
    try {
      const data = await api.getDevices()
      setDevices(data.devices)
    } catch (error) {
      console.error('Failed to load devices:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // ... resto do código
}
```

---

Está completo! Agora você tem todo o plano detalhado na pasta `docs/cloud-migration/` com:
- Arquitetura completa
- Exemplos de código prontos
- Schemas de banco
- Guias de deploy

Quando quiser implementar, é só seguir o plano! 🚀
