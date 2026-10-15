import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { createStore } from './store.mjs';
import { createProviders, createSheets } from './providers.mjs';
import { createCommerce } from './app.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const env = process.env;
const origin = env.PUBLIC_ORIGIN || 'http://localhost:8787';
const store = createStore(env.DB_PATH || './data/hanori.sqlite');
const packages = JSON.parse(readFileSync(env.PACKAGES_FILE || new URL('./packages.json', import.meta.url), 'utf8'));
const app = createCommerce({ env: { ...env, PUBLIC_ORIGIN: origin }, store, providers: createProviders({ ...env, PUBLIC_ORIGIN: origin }), sheets: createSheets(env), packages });
const rate = new Map();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
function json(res, code, body) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/api/')) {
      if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { error: 'Nguồn yêu cầu không hợp lệ.' });
      const ip = req.socket.remoteAddress;
      const bucket = rate.get(ip) || { start: Date.now(), count: 0 };
      if (Date.now() - bucket.start >= 60000) { bucket.start = Date.now(); bucket.count = 0; }
      bucket.count++; rate.set(ip, bucket);
      if (bucket.count > 120) return json(res, 429, { error: 'Vui lòng chờ một phút rồi thử lại.' });
      let body = {};
      if (req.method === 'POST') {
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Định dạng yêu cầu không hợp lệ.' });
        const chunks = []; let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 32768) return json(res, 413, { error: 'Yêu cầu quá lớn.' });
          chunks.push(chunk);
        }
        try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { return json(res, 400, { error: 'Yêu cầu không hợp lệ.' }); }
        if (!body || Array.isArray(body) || typeof body !== 'object') return json(res, 400, { error: 'Yêu cầu không hợp lệ.' });
      }
      return json(res, 200, await app.handle({ method: req.method, path: url.pathname, query: url.searchParams, body, headers: req.headers }));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
    // Whitelist public content. Never serve .env, server code, DB, docs, or secret files.
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('..') || pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) return json(res, 404, {});
    const relative = pathname.replace(/^\//, '') || 'index.html';
    const publicPath = relative.startsWith('assets/') || /^(index\.html|robots\.txt|sitemap\.xml|404\.html|google[a-f0-9]+\.html)$/.test(relative) || /^(san-pham|tin-tuc|gioi-thieu|lien-he|dieu-khoan-su-dung|chinh-sach-[a-z-]+)(\/|$)/.test(relative);
    if (!publicPath) return json(res, 404, {});
    let path = resolve(root, relative);
    if ((await stat(path)).isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(308, { Location: `${url.pathname}/${url.search}` }); return res.end(); }
      path = resolve(path, 'index.html');
    }
    path = await realpath(path);
    if (!path.startsWith(root + sep) || !types[extname(path)]) return json(res, 404, {});
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)], 'Cache-Control': extname(path) === '.html' ? 'no-cache' : 'public, max-age=60' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
    if (status >= 500) console.error('Request failed:', error.name, error.code || status);
    json(res, status, { error: error.status ? error.message : 'Có lỗi kết nối. Vui lòng thử lại hoặc liên hệ Zalo.' });
  }
});
const timer = setInterval(() => {
  for (const [ip, bucket] of rate) if (Date.now() - bucket.start > 60000) rate.delete(ip);
  void app.syncSheets();
}, 15000).unref();
server.listen(Number(env.PORT || 8787), env.HOST || '127.0.0.1', () => console.log(`Hanori ready on port ${env.PORT || 8787}; payment activation requires provider credentials.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { clearInterval(timer); server.close(() => { store.close(); process.exit(0); }); });
