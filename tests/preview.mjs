// Local QA only. All carrier quotes, orders, payments and Sheet writes are simulated.
// Never deploy this server. It binds localhost and imports no live credentials.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { createCommerce } from '../server/app.mjs';
import { createStore } from '../server/store.mjs';
import { catalog } from '../server/domain.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const payments = new Map(), store = createStore(':memory:');
const env = Object.fromEntries(['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY', 'GHN_TOKEN', 'GHN_SHOP_ID', 'GOOGLE_SERVICE_ACCOUNT_FILE', 'GOOGLE_SHEET_ID'].map(k => [k, 'SIMULATION_ONLY']));
const packages = { _packing: { verified: true, extraWeight: 100, padding: 2 } };
for (const p of catalog.values()) for (const v of p.variants || [p]) packages[v.sku] = { weight: 500, length: 20, width: 20, height: 10 };
const app = createCommerce({ env, store, packages, sheets: { async sync() {} }, providers: {
  async locations(kind) { return kind === 'provinces' ? [{ id: '1000001', name: 'Tỉnh kiểm thử' }] : [{ id: '1000002', name: 'Phường kiểm thử' }]; },
  async quote() { return 27000; },
  async createPayment(order) { payments.set(String(order.orderCode), { id: 'mock-' + order.orderCode, orderCode: order.orderCode, amount: order.total, amountPaid: 0, amountRemaining: order.total, status: 'PENDING' }); return { paymentLinkId: 'mock-' + order.orderCode, checkoutUrl: '/test-payment?code=' + order.orderCode }; },
  async getPayment(code) { return payments.get(String(code)); }
} });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8788');
  try {
    if (url.pathname === '/test-payment' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!/^\d+$/.test(code) || !payments.has(code)) throw new Error('Missing mock payment');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<h1>Thanh toán mô phỏng</h1><p>Bản kiểm thử tại máy, không chuyển tiền thật.</p><form action="/test-payment/confirm?code=${code}" method="POST"><button>Xác nhận thanh toán mô phỏng</button></form>`);
    }
    if (url.pathname === '/test-payment/confirm' && req.method === 'POST') {
      const payment = payments.get(url.searchParams.get('code'));
      if (!payment) throw new Error('Missing mock payment');
      payment.status = 'PAID'; payment.amountPaid = payment.amount; payment.amountRemaining = 0;
      res.writeHead(302, { Location: '/?hanoriPayment=return' }); return res.end();
    }
    if (url.pathname.startsWith('/api/')) {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const result = await app.handle({ method: req.method, path: url.pathname, query: url.searchParams, headers: req.headers, body: raw ? JSON.parse(raw) : {} });
      res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(result));
    }
    if (url.pathname.includes('..') || url.pathname.includes('\\') || url.pathname.split('/').some(x => x.startsWith('.'))) { res.writeHead(404); return res.end(); }
    let path = resolve(root, '.' + url.pathname);
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const relative = path.slice(root.length + 1);
    if (!(relative.startsWith('assets/') || relative.endsWith('index.html')) || !types[extname(path)] || !path.startsWith(root + '/')) { res.writeHead(404); return res.end(); }
    let content = await readFile(path);
    if (relative === 'assets/products.js') content = Buffer.from(content.toString().replace('commerceEnabled: false', 'commerceEnabled: true'));
    if (extname(path) === '.html') content = Buffer.from(content.toString().replace('<body', '<body').replace('</body>', '<div style="position:fixed;bottom:0;left:0;background:#7f1d1d;color:#fff;z-index:99999;padding:4px 12px;font:12px sans-serif;pointer-events:none">BẢN KIỂM THỬ — KHÔNG TẠO ĐƠN THẬT</div></body>'));
    res.setHeader('Content-Type', types[extname(path)]); res.setHeader('Cache-Control', 'no-store'); res.end(content);
  } catch (error) { res.writeHead(error.status || 500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); }
});
server.listen(8788, '127.0.0.1', () => console.log('Mock Hanori on http://localhost:8788 — NO LIVE TRANSACTIONS'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => { store.close(); process.exit(0); }));
