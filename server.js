const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();

// Permitir HTTPS com certificados self-signed (rede local) — cuidado: inseguro fora da rede
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(express.json({ limit: '1mb' }));
const PORT = process.env.PORT || 3000;

const PRINTERS_FILE = path.join(__dirname, 'printers.json');
const DATA_FILE = path.join(__dirname, 'data.json');
const DB_FILE = path.join(__dirname, 'history.db');

// inicializar sqlite
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

// SSE clients
const sseClients = [];
function broadcastAlert(alert){
  try{
    const payload = JSON.stringify(alert);
    // save alert to DB
    db.run('INSERT INTO alerts (ts,type,deviceId,deviceName,payload) VALUES (?,?,?,?,?)', [new Date().toISOString(), alert.type||'alert', alert.deviceId||'', alert.deviceName||'', payload], ()=>{});
    for(const res of sseClients){
      try{
        res.write(`data: ${payload}\n\n`);
      }catch(e){ /* ignore */ }
    }
  }catch(e){ console.error('broadcast', e) }
}

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

async function collectOnce(opts = {}) {
  const printersConfig = readPrinters();
  const limit = (opts && opts.limit) ? Number(opts.limit) : null;
    let printers = [];
    if (Array.isArray(printersConfig)) printers = printersConfig; // legacy
    else if (printersConfig && Array.isArray(printersConfig.printers) && printersConfig.printers.length) {
      printers = printersConfig.printers;
    }

    // Helper: parse HTML de painel e retornar objeto device (reutilizável)
    function parseDeviceFromHtml(url, html) {
      const $ = cheerio.load(html);
      const device = { name: url, url, timestamp: new Date().toISOString() };
      device.title = $('title').first().text() || null;
      const homeName = $('#HomeDeviceName').text().trim();
      if (homeName) device.deviceName = homeName;
      const homeIp = $('#HomeDeviceIp').text().trim();
      if (homeIp) device.deviceIp = homeIp;
      const mainStatus = $('#MachineStatus').text().trim() || $('.status-message').first().text().trim();
      if (mainStatus) device.machineStatus = mainStatus;
      const supplies = [];
      $('.consumable').each((i, el) => {
        const name = $(el).find('h2').first().text().trim();
        const plr = $(el).find('.plr').first().text().trim();
        const gauge = $(el).find('.gauge span').first().text().trim();
        if (name) supplies.push({ name, level: plr || gauge || null });
      });
      if (supplies.length === 0) {
        for (let i = 0; i < 12; i++) {
          const n = $(`#SupplyName${i}`).text().trim();
          const p = $(`#SupplyPLR${i}`).text().trim();
          if (n) supplies.push({ name: n, level: p || null });
        }
      }
      // Heurísticas adicionais: buscar por labels/strings comuns quando não houver blocos consumable
      if (supplies.length === 0) {
        const bodyText = $('body').text();
        // procurar por padrões como "Preto: 40%" ou "Black - 40%" ou "Cyan 10%"
        const regex = /(?:(Preto|Black|Ciano|Cyan|Magenta|Amarelo|Yellow|Toner|Tinta)[\s:\-–]*)(?:<|&lt;)?\s*(\d{1,3}%)/gi;
        let m;
        const found = {};
        while ((m = regex.exec(bodyText)) !== null) {
          const rawName = m[1];
          const level = m[2];
          const name = rawName.replace(/Toner|Tinta/i, 'Toner').trim();
          // evitar duplicatas
          if (!found[name + level]) {
            supplies.push({ name, level });
            found[name + level] = true;
          }
        }
        // procurar por porcentagens próximas a palavras-chave de consumíveis
        if (supplies.length === 0) {
          const pctRegex = /(\d{1,3})%/g;
          let pct;
          while ((pct = pctRegex.exec(bodyText)) !== null) {
            // pegar contexto ao redor
            const start = Math.max(0, pct.index - 40);
            const snippet = bodyText.substring(start, pct.index + 4);
            const nameMatch = snippet.match(/(Preto|Black|Ciano|Cyan|Magenta|Amarelo|Yellow|Toner|Tinta)/i);
            if (nameMatch) {
              const name = nameMatch[0];
              const level = pct[0];
              supplies.push({ name, level });
            }
          }
        }
      }
      if (supplies.length) device.supplies = supplies;
      // Detectar tipo do dispositivo (color ou mono)
      if (device.supplies && device.supplies.length) {
        const names = device.supplies.map(s => String(s.name).toLowerCase()).join(' ');
        if (/magenta|amarelo|ciano|cyan|magenta|yellow/.test(names)) device.type = 'color';
        else device.type = 'mono';
      }
      const trays = [];
      $('#MediaTable tbody tr').each((i, tr) => {
        const name = $(tr).find('[id^="TrayBinName_"]').text().trim() || $(tr).find('td').first().text().trim();
        const status = $(tr).find('[id^="TrayBinStatus_"]').text().trim() || $(tr).find('td').eq(1).text().trim();
        const capacity = $(tr).find('[id^="TrayBinCapacity_"]').text().trim() || $(tr).find('td').eq(2).text().trim();
        const size = $(tr).find('[id^="TrayBinSize_"]').text().trim() || $(tr).find('td').eq(3).text().trim();
        const type = $(tr).find('[id^="TrayBinType_"]').text().trim() || $(tr).find('td').eq(4).text().trim();
        if (name) trays.push({ name, status, capacity, size, type });
      });
      if (trays.length) device.trays = trays;
      const usageText = $('#UsagePage').text() || $('body').text();
      const pagesMatch = usageText.match(/(Total pages|Total de páginas|Total pages)[^0-9]*(\d{1,10})/i);
      if (pagesMatch) device.pages = pagesMatch[2];
      return device;
    }

    // Endpoint para testar um host (ping/collect de um IP/url único)
    app.get('/api/ping', async (req, res) => {
      const q = req.query.url || req.query.ip || req.query.host;
      if (!q) return res.status(400).json({ ok: false, error: 'query param `url` or `ip` required' });

      // preparar lista de tentativas (tenta usar como enviado; se sem protocolo, tenta https e http)
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
          // se for a última tentativa, retorne o erro
          if (url === candidates[candidates.length - 1]) {
            const info = { ok: false, error: err.message };
            if (err.response) info.statusCode = err.response.status;
            return res.status(502).json(info);
          }
          // caso contrário, tentar próxima candidata
        }
      }
    });

    // Se houver configuração de scan e scan.enabled=true -> gerar lista de IPs
    if ((printersConfig && printersConfig.scan && printersConfig.scan.enabled) && (!printers || printers.length === 0 || true)) {
      const s = printersConfig.scan;
      const base = s.base || '10.12.86.';
      const start = s.start || 20;
      const end = s.end || 200;
      const protocol = s.protocol || 'https';
      const concurrency = s.concurrency || 15;

      let ipList = [];
      for (let i = start; i <= end; i++) {
        const ip = `${protocol}://${base}${i}`;
        ipList.push({ name: `Device ${i}`, ip });
      }
      if (limit && Number.isFinite(limit)) {
        ipList = ipList.slice(0, limit);
      }

      // Função para limitar concorrência
      async function mapWithConcurrency(items, worker, limit) {
        const results = new Array(items.length);
        let idx = 0;
        async function next() {
          const i = idx++;
          if (i >= items.length) return;
          try {
            results[i] = await worker(items[i]);
          } catch (e) {
            results[i] = { name: items[i].name || items[i].ip, url: items[i].ip, status: 'error', error: e.message };
          }
          return next();
        }
        const workers = [];
        const n = Math.min(limit, items.length);
        for (let k = 0; k < n; k++) workers.push(next());
        await Promise.all(workers);
        return results;
      }

      // worker: faz a coleta por item (reaproveita parsing)
      async function worker(item) {
        const url = item.ip;
        const device = { name: item.name || url, url, timestamp: new Date().toISOString() };
        try {
          const res = await axios.get(url, { timeout: 7000 });
          device.status = 'ok';
          device.statusCode = res.status;
          const html = res.data;
          const $ = cheerio.load(html);
          device.title = $('title').first().text() || null;

          const homeName = $('#HomeDeviceName').text().trim();
          if (homeName) device.deviceName = homeName;
          const homeIp = $('#HomeDeviceIp').text().trim();
          if (homeIp) device.deviceIp = homeIp;

          const mainStatus = $('#MachineStatus').text().trim() || $('.status-message').first().text().trim();
          if (mainStatus) device.machineStatus = mainStatus;

          const supplies = [];
          $('.consumable').each((i, el) => {
            const name = $(el).find('h2').first().text().trim();
            const plr = $(el).find('.plr').first().text().trim();
            const gauge = $(el).find('.gauge span').first().text().trim();
            if (name) supplies.push({ name, level: plr || gauge || null });
          });
          if (supplies.length === 0) {
            for (let i = 0; i < 12; i++) {
              const n = $(`#SupplyName${i}`).text().trim();
              const p = $(`#SupplyPLR${i}`).text().trim();
              if (n) supplies.push({ name: n, level: p || null });
            }
          }
          if (supplies.length) device.supplies = supplies;

          const trays = [];
          $('#MediaTable tbody tr').each((i, tr) => {
            const name = $(tr).find('[id^="TrayBinName_"]').text().trim() || $(tr).find('td').first().text().trim();
            const status = $(tr).find('[id^="TrayBinStatus_"]').text().trim() || $(tr).find('td').eq(1).text().trim();
            const capacity = $(tr).find('[id^="TrayBinCapacity_"]').text().trim() || $(tr).find('td').eq(2).text().trim();
            const size = $(tr).find('[id^="TrayBinSize_"]').text().trim() || $(tr).find('td').eq(3).text().trim();
            const type = $(tr).find('[id^="TrayBinType_"]').text().trim() || $(tr).find('td').eq(4).text().trim();
            if (name) trays.push({ name, status, capacity, size, type });
          });
          if (trays.length) device.trays = trays;

          const usageText = $('#UsagePage').text() || $('body').text();
          const pagesMatch = usageText.match(/(Total pages|Total de páginas|Total pages)[^0-9]*(\d{1,10})/i);
          if (pagesMatch) device.pages = pagesMatch[2];
        } catch (err) {
          device.status = 'error';
          device.error = err.message;
          if (err.response) device.statusCode = err.response.status;
        }
        return device;
      }

      const results = await mapWithConcurrency(ipList, worker, concurrency);
        const data = { lastRun: new Date().toISOString(), devices: results };
        writeData(data);
        try{
          // persistir snapshot em sqlite
          db.run('INSERT INTO snapshots (ts,data) VALUES (?,?)', [data.lastRun, JSON.stringify(data)], ()=>{});
        }catch(e){ console.error('db-insert', e) }
        // verificar consumíveis baixos e broadcast
        try{
          const threshold = (printersConfig && printersConfig.threshold) ? Number(printersConfig.threshold) : (process.env.MONITOR_THRESHOLD ? Number(process.env.MONITOR_THRESHOLD) : 15);
          for(const d of results){
            if(!d.supplies) continue;
            for(const s of d.supplies){
              const m = (s.level||'').toString().match(/(\d{1,3})/)
              if(m && Number(m[1]) <= threshold){
                const alert = { type: 'low-supply', deviceId: d.deviceIp||d.url||d.name, deviceName: d.deviceName||d.name, supply: s.name, level: m[1], ts: new Date().toISOString() }
                broadcastAlert(alert)
                break
              }
            }
          }
        }catch(e){ console.error('alert-check', e) }
        return data;
    }

    // Fallback: se houver lista explícita de printers, coletar sequencialmente (ou trocar por concorrência)
    const results = [];
    for (const p of printers) {
      const url = p.ip;
      const device = { name: p.name || url, url, timestamp: new Date().toISOString() };
      try {
        const res = await axios.get(url, { timeout: 8000 });
        device.status = 'ok';
        device.statusCode = res.status;
        const html = res.data;
        const $ = cheerio.load(html);
        device.title = $('title').first().text() || null;
      } catch (err) {
        device.status = 'error';
        device.error = err.message;
        if (err.response) device.statusCode = err.response.status;
      }
      results.push(device);
    }

    const data = { lastRun: new Date().toISOString(), devices: results };
    writeData(data);
    try{ db.run('INSERT INTO snapshots (ts,data) VALUES (?,?)', [data.lastRun, JSON.stringify(data)], ()=>{}); }catch(e){console.error(e)}
    return data;
  }
// Agendamento: a cada 30 minutos
cron.schedule('*/30 * * * *', () => {
  console.log('Agendador: iniciando coleta', new Date().toISOString());
  collectOnce().then(() => console.log('Coleta concluída')).catch(e => console.error(e));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  const data = readData();
  res.json(data);
});

// SSE endpoint para alerts
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
    if(idx !== -1) sseClients.splice(idx,1);
  });
});

// history endpoints
app.get('/api/history', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  let sql = 'SELECT id, ts, data FROM snapshots';
  const params = [];
  const where = [];
  if(from){ where.push('ts >= ?'); params.push(from); }
  if(to){ where.push('ts <= ?'); params.push(to); }
  if(where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY ts DESC LIMIT ?'; params.push(limit);
  db.all(sql, params, (err, rows)=>{
    if(err) return res.status(500).json({ ok:false, error: err.message });
    // parse data field
    const out = rows.map(r=>({ id: r.id, ts: r.ts, data: JSON.parse(r.data) }));
    res.json({ ok:true, rows: out });
  });
});

// history per device endpoint
app.get('/api/history/device', (req, res) => {
  const device = req.query.device;
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  if(!device) return res.status(400).json({ ok:false, error: 'query param `device` required' });
  db.all('SELECT id, ts, data FROM snapshots ORDER BY ts DESC LIMIT ?', [limit], (err, rows)=>{
    if(err) return res.status(500).json({ ok:false, error: err.message });
    const out = rows.map(r=>{
      try{
        const obj = JSON.parse(r.data);
        const dev = (obj.devices||[]).find(d => {
          const id = (d.deviceIp||d.url||d.deviceName||d.name||'').toString();
          return id === device || id === decodeURIComponent(device) || (d.deviceIp === device) || (d.deviceName === device) || (d.name === device);
        });
        return { id: r.id, ts: r.ts, device: dev || null };
      }catch(e){ return { id: r.id, ts: r.ts, device: null } }
    });
    res.json({ ok:true, rows: out });
  })
})

app.get('/api/history/export', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 1000;
  db.all('SELECT ts, data FROM snapshots ORDER BY ts DESC LIMIT ?', [limit], (err, rows)=>{
    if(err) return res.status(500).send('error '+err.message);
    // generate CSV with per-device counts per snapshot
    const csvRows = [];
    csvRows.push(['ts','device_count','ok_count','error_count'].join(','));
    for(const r of rows){
      try{
        const obj = JSON.parse(r.data);
        const devices = obj.devices || [];
        const ok = devices.filter(d=>d.status==='ok').length;
        const errc = devices.length - ok;
        csvRows.push([`"${r.ts}"`, devices.length, ok, errc].join(','));
      }catch(e){ /* skip */ }
    }
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="history.csv"');
    res.send(csvRows.join('\n'));
  })
});

// printers endpoints: read and write printers.json
app.get('/api/printers', (req, res) => {
  try{
    const cfg = readPrinters();
    res.json({ ok: true, printers: cfg });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }) }
});

app.post('/api/printers', (req, res) => {
  try{
    const body = req.body;
    fs.writeFileSync(PRINTERS_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json({ ok: true });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }) }
});

app.post('/api/clear-data', (req, res) => {
  try{
    writeData({ lastRun: null, devices: [] });
    res.json({ ok: true });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }) }
});

// Rota para disparo manual
app.post('/api/collect', async (req, res) => {
  try {
    const limit = req.query && req.query.limit ? Number(req.query.limit) : undefined;
    const data = await collectOnce({ limit });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Printer monitor protótipo rodando em http://localhost:${PORT}`);
});