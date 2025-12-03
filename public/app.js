function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parsePercent(raw) {
  if (!raw) return null;
  // raw may be like '90%*' or '<10%' or '10%'
  const m = String(raw).match(/(\d{1,3})/);
  if (!m) {
    if (/</.test(raw)) return 5;
    return null;
  }
  let n = parseInt(m[1], 10);
  if (isNaN(n)) return null;
  if (n < 0) n = 0; if (n > 100) n = 100;
  return n;
}

function supplyColor(name) {
  const s = (name||'').toLowerCase();
  if (/black|preto/.test(s)) return '#111827';
  if (/cyan|ciano/.test(s)) return '#06b6d4';
  if (/magenta/.test(s)) return '#db2777';
  if (/yellow|amarelo/.test(s)) return '#f59e0b';
  return '#6b7280';
}

async function doCollectAndLoad() {
  const refreshBtn = document.getElementById('refresh');
  try {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Coletando';
    await fetch('/api/collect', { method: 'POST' });
  } catch (e) {
    console.error(e);
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Atualizar';
    await loadStatus();
  }
}

async function loadStatus() {
  const grid = document.getElementById('statusGrid');
  grid.innerHTML = '<div class="empty">Carregando...</div>';
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    document.getElementById('lastRun').textContent = 'Última coleta: ' + (data.lastRun || '-');

    const devices = (data.devices || []).filter(Boolean);

    // apply filters
    const q = (document.getElementById('globalSearch').value||'').toLowerCase();
    const fType = document.getElementById('filterType').value;
    const fStatus = document.getElementById('filterStatus').value;
    const threshold = parseInt(document.getElementById('lowThreshold').value || '15',10);

    const filtered = devices.filter(d => {
      if (!d) return false;
      if (q) {
        const s = ((d.deviceName||d.name||'') + ' ' + (d.deviceIp||d.url||'')).toLowerCase();
        if (!s.includes(q)) return false;
      }
      if (fType !== 'all') {
        if ((d.type||'mono') !== fType) return false;
      }
      if (fStatus !== 'all') {
        if ((d.status||'') !== fStatus) return false;
      }
      return true;
    });

    // nenhum dispositivo detectado ainda (data.devices vazio)
    if (!devices.length) {
      grid.innerHTML = `
        <div class="cta-empty">
          <h3>Sem dados coletados</h3>
          <p>Não há resultados salvos. Inicie uma varredura para detectar impressoras na sub-rede (10.12.86.x).</p>
          <div style="display:flex;gap:12px">
            <button id="startScan" class="btn-cta">Iniciar varredura</button>
            <button id="startScanLimited" class="btn">Varredura rápida (10 ips)</button>
          </div>
        </div>
      `;
      document.getElementById('startScan').addEventListener('click', async () => {
        // mostrar skeletons
        grid.innerHTML = '';
        for (let i=0;i<6;i++) {
          const s = document.createElement('div'); s.className='skeleton'; s.innerHTML = '<div class="line" style="width:60%"></div><div class="line" style="width:40%"></div><div class="line" style="width:80%"></div>';
          grid.appendChild(s);
        }
        await doCollectAndLoad();
      });
      document.getElementById('startScanLimited').addEventListener('click', async () => {
        // quick limited scan: call backend endpoint to trigger limited scan if available
        grid.innerHTML = '';
        for (let i=0;i<4;i++) {
          const s = document.createElement('div'); s.className='skeleton'; s.innerHTML = '<div class="line" style="width:60%"></div><div class="line" style="width:40%"></div>';
          grid.appendChild(s);
        }
        try {
          // try calling POST /api/collect?limit=10 - server ignores query but future enhancement
          await fetch('/api/collect', { method: 'POST' });
        } catch (e) {
          console.error(e);
        }
        await loadStatus();
      });
      return;
    }

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty">Nenhum dispositivo encontrado para os filtros selecionados.</div>';
      return;
    }

    // render cards
    grid.innerHTML = '';
    let okCount = 0, errCount = 0;
    for (const d of filtered) {
      if (d.status === 'ok') okCount++; else errCount++;
      const card = document.createElement('article');
      card.className = 'card';
      const title = escapeHtml(d.deviceName || d.name || '—');
      const ip = escapeHtml(d.deviceIp || d.url || '—');
      const statusLabel = d.status === 'ok' ? `<span class="status-ok"><i class="fa-solid fa-circle-check"></i> OK</span>` : `<span class="status-error"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(d.status||'erro')}</span>`;

      // supplies
      let suppliesHtml = '';
      if (d.supplies && d.supplies.length) {
        suppliesHtml = '<div class="supply-list">';
        for (const s of d.supplies) {
          const lvl = parsePercent(s.level);
          const raw = escapeHtml(s.level || '');
          const color = supplyColor(s.name);
          const barWidth = lvl !== null ? `${lvl}%` : '6%';
          suppliesHtml += `
            <div class="supply">
              <div class="label">${escapeHtml(s.name)}</div>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="progress" style="flex:1;background:#f1f5f9;border-radius:8px;overflow:hidden">
                  <i style="width:${barWidth};background:${color};display:block;height:100%"></i>
                </div>
                <div style="min-width:44px;text-align:right;font-weight:600;">${raw}</div>
              </div>
            </div>
          `;
        }
        suppliesHtml += '</div>';
      } else {
        suppliesHtml = '<div class="supply-list"><div class="empty">Nenhum consumível detectado</div></div>';
      }

      // trays
      let traysHtml = '';
      if (d.trays && d.trays.length) {
        traysHtml = '<ul class="trays">' + d.trays.map(t => `<li>${escapeHtml(t.name)} — ${escapeHtml(t.status)} ${escapeHtml(t.capacity||'')}</li>`).join('') + '</ul>';
      }

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h3>${title}</h3>
            <div class="meta">${ip} • ${escapeHtml(d.title||'')}</div>
          </div>
          <div>${statusLabel}</div>
        </div>
        ${suppliesHtml}
        ${traysHtml}
        <div style="margin-top:10px;font-size:12px;color:#475569">Última atualização: ${escapeHtml(d.timestamp||'')}</div>
      `;
      grid.appendChild(card);
    }

    document.getElementById('statusSummary').textContent = `Total: ${filtered.length} • OK: ${okCount} • Erros: ${errCount}`;

  } catch (e) {
    grid.innerHTML = `<div class="empty">Erro ao carregar: ${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('refresh').addEventListener('click', doCollectAndLoad);
document.getElementById('applyFilters').addEventListener('click', loadStatus);
document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('globalSearch').value = '';
  document.getElementById('filterType').value = 'all';
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('lowThreshold').value = '15';
  document.getElementById('thresholdValue').textContent = '15';
  loadStatus();
});
document.getElementById('lowThreshold').addEventListener('input', (e)=>{
  document.getElementById('thresholdValue').textContent = e.target.value;
});

// test ping
document.getElementById('testBtn').addEventListener('click', async () => {
  const ip = document.getElementById('testIp').value.trim();
  if (!ip) return alert('Informe IP ou URL');
  const out = document.getElementById('statusGrid');
  out.innerHTML = '<div class="empty">Testando ' + escapeHtml(ip) + '...</div>';
  try {
    const res = await fetch(`/api/ping?url=${encodeURIComponent(ip)}`);
    const j = await res.json();
    if (!j.ok) { out.innerHTML = `<div class="empty">Erro: ${escapeHtml(j.error||JSON.stringify(j))}</div>`; return; }
    // render single card
    const d = j.device;
    const fake = { lastRun: new Date().toISOString(), devices: [d] };
    // reuse rendering by temporarily calling loadStatus with mock data: simply insert device into grid
    const grid = document.getElementById('statusGrid');
    grid.innerHTML = '';
    const card = document.createElement('article'); card.className='card';
    card.innerHTML = `<h3>${escapeHtml(d.deviceName||d.name||'')}</h3><div class="meta">${escapeHtml(d.deviceIp||d.url||'')}</div>`;
    grid.appendChild(card);
  } catch (e) {
    document.getElementById('statusGrid').innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
});

// Auto refresh every 30s for the dashboard view (data still updates by server cron every 30m)
setInterval(loadStatus, 30 * 1000);
window.addEventListener('load', loadStatus);
 
