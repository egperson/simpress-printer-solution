const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const { collect } = require('./server/services/collector');
const { parseDeviceFromHtml } = require('./server/utils/parser');

// Permitir HTTPS com certificados self-signed (rede local)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(express.json({ limit: '1mb' }));
const PORT = process.env.PORT || 3000;

const PRINTERS_FILE = path.join(__dirname, 'data', 'printers.json');
const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const DB_FILE = path.join(__dirname, 'data', 'history.db');

// --- Database Setup ---
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT,
    data TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT,
    type TEXT,
    deviceId TEXT,
    deviceName TEXT,
    payload TEXT
  )`);
});

// --- Helpers ---
function readPrinters() {
  try {
    return JSON.parse(fs.readFileSync(PRINTERS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { lastRun: null, devices: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// --- SSE & Alerts ---
const sseClients = [];
function broadcastAlert(alert) {
  try {
    const payload = JSON.stringify(alert);
    // save alert to DB
    db.run('INSERT INTO alerts (ts,type,deviceId,deviceName,payload) VALUES (?,?,?,?,?)',
      [new Date().toISOString(), alert.type || 'alert', alert.deviceId || '', alert.deviceName || '', payload],
      () => { }
    );
    for (const res of sseClients) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (e) { /* ignore */ }
    }
  } catch (e) { console.error('broadcast', e); }
}

// --- Collection Logic ---
async function runCollection(opts = {}) {
  const printersConfig = readPrinters();

  // Use the service to collect data
  const data = await collect(printersConfig, opts);

  // Persist to file
  writeData(data);

  // Persist to DB
  try {
    db.run('INSERT INTO snapshots (ts,data) VALUES (?,?)', [data.lastRun, JSON.stringify(data)], () => { });
  } catch (e) { console.error('db-insert', e); }

  // Check alerts
  try {
    const threshold = (printersConfig && printersConfig.threshold) ? Number(printersConfig.threshold) : (process.env.MONITOR_THRESHOLD ? Number(process.env.MONITOR_THRESHOLD) : 15);
    for (const d of data.devices) {
      if (!d.supplies) continue;
      for (const s of d.supplies) {
        const m = (s.level || '').toString().match(/(\d{1,3})/);
        if (m && Number(m[1]) <= threshold) {
          const alert = {
            type: 'low-supply',
            deviceId: d.deviceIp || d.url || d.name,
            deviceName: d.deviceName || d.name,
            supply: s.name,
            level: m[1],
            ts: new Date().toISOString()
          };
          broadcastAlert(alert);
          break;
        }
      }
    }
  } catch (e) { console.error('alert-check', e); }

  return data;
}

// --- Routes ---

// Ping/Test single URL
app.get('/api/ping', async (req, res) => {
  const q = req.query.url || req.query.ip || req.query.host;
  if (!q) return res.status(400).json({ ok: false, error: 'query param `url` or `ip` required' });

  const candidates = [];
  if (/^https?:\/\//i.test(q)) candidates.push(q);
  else {
    candidates.push(`https://${q}`);
    candidates.push(`http://${q}`);
  }

  for (const url of candidates) {
    try {
      const r = await axios.get(url, { timeout: 7000 });
      const device = parseDeviceFromHtml(url, r.data);
      device.status = 'ok';
      device.statusCode = r.status;
      return res.json({ ok: true, device });
    } catch (err) {
      if (url === candidates[candidates.length - 1]) {
        const info = { ok: false, error: err.message };
        if (err.response) info.statusCode = err.response.status;
        return res.status(502).json(info);
      }
    }
  }
});

// Status
app.get('/api/status', (req, res) => {
  const data = readData();
  res.json(data);
});

// Alerts Stream
app.get('/api/alerts/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write('\n');
  sseClients.push(res);
  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Alerts History
app.get('/api/alerts/history', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const deviceId = req.query.deviceId;
  const type = req.query.type;

  let sql = 'SELECT id, ts, type, deviceId, deviceName, payload FROM alerts';
  const params = [];
  const where = [];

  if (deviceId) { where.push('deviceId = ?'); params.push(deviceId); }
  if (type) { where.push('type = ?'); params.push(type); }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY ts DESC LIMIT ?';
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    const alerts = rows.map(r => {
      try {
        return {
          id: r.id,
          ts: r.ts,
          type: r.type,
          deviceId: r.deviceId,
          deviceName: r.deviceName,
          ...JSON.parse(r.payload)
        };
      } catch (e) {
        return { id: r.id, ts: r.ts, type: r.type, deviceId: r.deviceId, deviceName: r.deviceName };
      }
    });
    res.json({ ok: true, alerts });
  });
});

// History
app.get('/api/history', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  let sql = 'SELECT id, ts, data FROM snapshots';
  const params = [];
  const where = [];
  if (from) { where.push('ts >= ?'); params.push(from); }
  if (to) { where.push('ts <= ?'); params.push(to); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY ts DESC LIMIT ?'; params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    const out = rows.map(r => ({ id: r.id, ts: r.ts, data: JSON.parse(r.data) }));
    res.json({ ok: true, rows: out });
  });
});

// History per device
app.get('/api/history/device', (req, res) => {
  const device = req.query.device;
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  if (!device) return res.status(400).json({ ok: false, error: 'query param `device` required' });

  db.all('SELECT id, ts, data FROM snapshots ORDER BY ts DESC LIMIT ?', [limit], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    const out = rows.map(r => {
      try {
        const obj = JSON.parse(r.data);
        const dev = (obj.devices || []).find(d => {
          const id = (d.deviceIp || d.url || d.deviceName || d.name || '').toString();
          return id === device || id === decodeURIComponent(device) || (d.deviceIp === device) || (d.deviceName === device) || (d.name === device);
        });
        return { id: r.id, ts: r.ts, device: dev || null };
      } catch (e) { return { id: r.id, ts: r.ts, device: null }; }
    });
    res.json({ ok: true, rows: out });
  });
});

// Export History
app.get('/api/history/export', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 1000;
  db.all('SELECT ts, data FROM snapshots ORDER BY ts DESC LIMIT ?', [limit], (err, rows) => {
    if (err) return res.status(500).send('error ' + err.message);
    const csvRows = [];
    csvRows.push(['ts', 'device_count', 'ok_count', 'error_count'].join(','));
    for (const r of rows) {
      try {
        const obj = JSON.parse(r.data);
        const devices = obj.devices || [];
        const ok = devices.filter(d => d.status === 'ok').length;
        const errc = devices.length - ok;
        csvRows.push([`"${r.ts}"`, devices.length, ok, errc].join(','));
      } catch (e) { /* skip */ }
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="history.csv"');
    res.send(csvRows.join('\n'));
  });
});

// Server Info
app.get('/api/server/info', (req, res) => {
  const uptime = process.uptime();
  const data = readData();
  res.json({
    ok: true,
    version: '1.0.0',
    uptime: Math.floor(uptime),
    lastCollection: data.lastRun,
    nodeVersion: process.version
  });
});

// Printers Config
app.get('/api/printers', (req, res) => {
  try {
    const cfg = readPrinters();
    res.json({ ok: true, printers: cfg });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/printers', (req, res) => {
  try {
    const body = req.body;
    fs.writeFileSync(PRINTERS_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Clear Data
app.post('/api/clear-data', (req, res) => {
  try {
    writeData({ lastRun: null, devices: [] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Manual Collect
app.post('/api/collect', async (req, res) => {
  try {
    const limit = req.query && req.query.limit ? Number(req.query.limit) : undefined;
    const data = await runCollection({ limit });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Cron Schedule (every 15 mins)
cron.schedule('*/15 * * * *', () => {
  console.log('Agendador: iniciando coleta', new Date().toISOString());
  runCollection().then(() => console.log('Coleta concluída')).catch(e => console.error(e));
});

app.listen(PORT, () => {
  console.log(`Printer monitor protótipo rodando em http://localhost:${PORT}`);
});