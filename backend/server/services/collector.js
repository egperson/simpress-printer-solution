const axios = require('axios');
const { parseDeviceFromHtml } = require('../utils/parser');

// Helper: mapWithConcurrency
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

async function collect(printersConfig, opts = {}) {
    const limit = (opts && opts.limit) ? Number(opts.limit) : null;

    let staticPrinters = [];
    let scanConfig = null;

    if (Array.isArray(printersConfig)) {
        staticPrinters = printersConfig;
    } else if (printersConfig) {
        if (Array.isArray(printersConfig.printers)) {
            staticPrinters = printersConfig.printers;
        }
        if (printersConfig.scan && printersConfig.scan.enabled) {
            scanConfig = printersConfig.scan;
        }
    }

    let targets = [];
    const prefixLocationMap = new Map(); // Map prefix to location label

    // 1. Add static printers
    for (const p of staticPrinters) {
        targets.push({ name: p.name, ip: p.ip || p.url });
    }

    // 2. Add scan printers if enabled
    if (scanConfig) {
        // Normalize prefixes to always be objects with { prefix, label }
        let prefixObjects = [];
        const rawPrefixes = scanConfig.prefixes || [scanConfig.base || '10.12.86.'];

        for (const item of rawPrefixes) {
            if (typeof item === 'string') {
                // Backward compatibility: string format
                prefixObjects.push({ prefix: item, label: null });
            } else if (item && typeof item === 'object' && item.prefix) {
                // New format: object with prefix and label
                prefixObjects.push({ prefix: item.prefix, label: item.label || null });
            }
        }

        // Build prefix to label map
        for (const obj of prefixObjects) {
            prefixLocationMap.set(obj.prefix, obj.label);
        }

        const start = scanConfig.start || 1;
        const end = scanConfig.end || 254;
        const protocol = scanConfig.protocol || 'https';

        // For each prefix, generate IPs
        for (const obj of prefixObjects) {
            const prefix = obj.prefix;
            for (let i = start; i <= end; i++) {
                const ip = `${protocol}://${prefix}${i}`;
                targets.push({ name: `${prefix}${i}`, ip, prefix });
            }
        }
    }

    // Deduplicate by IP/URL
    const uniqueTargets = [];
    const seen = new Set();
    for (const t of targets) {
        if (!t.ip) continue;
        if (seen.has(t.ip)) continue;
        seen.add(t.ip);
        uniqueTargets.push(t);
    }

    // Apply limit if specified
    let finalTargets = uniqueTargets;
    if (limit && Number.isFinite(limit)) {
        finalTargets = uniqueTargets.slice(0, limit);
    }

    const concurrency = (scanConfig && scanConfig.concurrency) ? scanConfig.concurrency : 15;

    // Worker function
    async function worker(item) {
        const url = item.ip;
        const device = { name: item.name || url, url, timestamp: new Date().toISOString() };

        // Determine location from prefix
        if (item.prefix && prefixLocationMap.has(item.prefix)) {
            const label = prefixLocationMap.get(item.prefix);
            if (label) {
                device.location = label;
            }
        }

        try {
            const res = await axios.get(url, { timeout: 7000 });
            device.status = 'ok';
            device.statusCode = res.status;
            const html = res.data;

            // Use the parser
            const parsed = parseDeviceFromHtml(url, html);
            // Merge parsed data into device
            Object.assign(device, parsed);

        } catch (err) {
            device.status = 'error';
            device.error = err.message;
            if (err.response) device.statusCode = err.response.status;
        }
        return device;
    }

    const results = await mapWithConcurrency(finalTargets, worker, concurrency);

    // Filter only successful devices (remove errors)
    const successfulDevices = results.filter(d => d.status === 'ok');

    return { lastRun: new Date().toISOString(), devices: successfulDevices };

}

module.exports = { collect };
