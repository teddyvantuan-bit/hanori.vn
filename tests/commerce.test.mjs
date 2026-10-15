import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createCommerce } from '../server/app.mjs';
import { createStore } from '../server/store.mjs';
import { catalog, priceCart, packageFor, shippingTotals, signPayOS, verifyPayOS, customerDetails } from '../server/domain.mjs';
import { createProviders } from '../server/providers.mjs';

const cart = [{ id: 'thung-gao-dong-ho', v: 0, qty: 1 }];
const customer = { name: 'Khách thử nghiệm', phone: '+84 962 818 892', addr: 'Địa chỉ thử nghiệm 123', note: '' };
const env = { PAYOS_CLIENT_ID: 'test', PAYOS_API_KEY: 'test', PAYOS_CHECKSUM_KEY: 'test-checksum', GHN_TOKEN: 'test', GHN_SHOP_ID: '1', GOOGLE_SERVICE_ACCOUNT_FILE: 'not-read-in-tests', GOOGLE_SHEET_ID: 'test-sheet', PUBLIC_ORIGIN: 'https://hanori.vn' };
function fixture(t, options = {}) {
  const store = createStore(':memory:');
  t.after(() => store.close());
  const state = { creates: 0, syncs: 0, payment: null, failSheets: false, failCreateAfterAccept: false };
  const providers = {
    async locations(kind, parent) { return kind === 'provinces' ? [{ id: '1000001', name: 'Tỉnh thử' }] : parent === '1000001' ? [{ id: '1000123', name: 'Phường thử' }] : []; },
    async quote() { return 27000; },
    async createPayment(order) {
      state.creates++;
      state.payment = { id: 'link-123', orderCode: order.orderCode, amount: order.total, amountPaid: 0, amountRemaining: order.total, status: 'PENDING' };
      if (state.failCreateAfterAccept) throw new Error('simulated connection loss');
      return { paymentLinkId: 'link-123', checkoutUrl: 'https://pay.payos.vn/web/link-123' };
    },
    async getPayment() { if (!state.payment) throw new Error('not found'); return state.payment; }
  };
  const sheets = { async sync() { state.syncs++; if (state.failSheets) throw new Error('offline'); } };
  const packages = { 'A1137-2': { weight: 800, length: 30, width: 20, height: 20 }, 'CA1464-1': { weight: 300, length: 15, width: 10, height: 10 } };
  const app = createCommerce({ env: options.env || env, store, providers, sheets, packages });
  async function quote(overrides = {}) {
    return app.handle({ method: 'POST', path: '/api/quote', body: { cart, customer, paymentMethod: 'BANK', destination: { province: '1000001', ward: '1000123' }, ...overrides } });
  }
  async function order(quoteId, key = randomUUID()) {
    return { order: await app.handle({ method: 'POST', path: '/api/orders', body: { quoteId }, headers: { 'idempotency-key': key } }), key };
  }
  async function status(id, key) { return app.handle({ method: 'GET', path: `/api/orders/${id}`, headers: { authorization: `Bearer ${key}` } }); }
  return { app, store, state, providers, quote, order, status };
}
test('free shipping applies exactly at 200,000 VND; carrier cost remains recorded', () => {
  assert.deepEqual(shippingTotals(199999, 27000), { subtotal: 199999, carrierFee: 27000, shipping: 27000, total: 226999 });
  assert.deepEqual(shippingTotals(200000, 27000), { subtotal: 200000, carrierFee: 27000, shipping: 0, total: 200000 });
  assert.throws(() => shippingTotals(100000, undefined));
});
test('server ignores client prices and rejects stale variants, quantities and duplicated rows', () => {
  assert.equal(priceCart([{ ...cart[0], price: 1 }])[0].price, 260000);
  for (const bad of [[], [{ id: 'missing', v: 0, qty: 1 }], [{ ...cart[0], v: 999 }], [{ ...cart[0], qty: -1 }], [{ ...cart[0], qty: 21 }], [cart[0], cart[0]]]) assert.throws(() => priceCart(bad));
  const contact = [...catalog.values()].find(p => p.contactOnly);
  if (contact) assert.throws(() => priceCart([{ id: contact.id, v: 0, qty: 1 }]));
});
test('no invented parcel weights; combined packing requires a verified shop policy', () => {
  const items = priceCart(cart);
  assert.throws(() => packageFor(items, {}));
  const packages = { 'A1137-2': { weight: 800, length: 30, width: 20, height: 20 } };
  assert.equal(packageFor(items, packages).weight, 800);
  const pair = [{ ...items[0], qty: 2 }];
  assert.throws(() => packageFor(pair, packages));
  assert.deepEqual(packageFor(pair, { ...packages, _packing: { verified: true, extraWeight: 100, padding: 2 } }), { weight: 1700, length: 32, width: 22, height: 42 });
});
test('phone normalization and customer validation', () => {
  assert.equal(customerDetails(customer).phone, '0962818892');
  assert.throws(() => customerDetails({ ...customer, phone: '123' }));
  assert.throws(() => customerDetails({ ...customer, addr: '' }));
});
test('payOS official signature fixture and tampering', () => {
  const data = { orderCode: 123, amount: 3000, description: 'VQRIO123', accountNumber: '12345678', reference: 'TF230204212323', transactionDateTime: '2023-02-04 18:25:00', currency: 'VND', paymentLinkId: '124c33293c43417ab7879e14c8d9eb18', code: '00', desc: 'Thành công', counterAccountBankId: '', counterAccountBankName: '', counterAccountName: '', counterAccountNumber: '', virtualAccountName: '', virtualAccountNumber: '' };
  const signature = '412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03';
  const key = '1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675';
  assert.equal(verifyPayOS(data, signature, key), true);
  assert.equal(verifyPayOS({ ...data, amount: 1 }, signature, key), false);
  assert.equal(verifyPayOS(data, 'invalid', key), false);
});
test('configuration stays closed while service accounts are absent', async t => {
  const { app } = fixture(t, { env: {} });
  assert.equal((await app.handle({ method: 'GET', path: '/api/config' })).ready, false);
  await assert.rejects(app.handle({ method: 'POST', path: '/api/quote', body: {} }), { status: 503 });
});
test('authoritative quote validates the destination and records free shipping', async t => {
  const { app, quote } = fixture(t);
  const result = await quote();
  assert.equal(result.total, 260000); assert.equal(result.shipping, 0); assert.equal(result.carrierFee, 27000);
  await assert.rejects(app.handle({ method: 'POST', path: '/api/quote', body: { cart, customer, destination: { province: '1000001', ward: 'unrelated' } } }), { status: 400 });
});
test('duplicate clicks create one durable order and one payment link', async t => {
  const f = fixture(t), q = await f.quote(), key = randomUUID();
  const [a, b] = await Promise.all([f.order(q.quoteId, key), f.order(q.quoteId, key)]);
  assert.equal(a.order.id, b.order.id); assert.equal(f.state.creates, 1);
  assert.equal((await f.order(q.quoteId, key)).order.id, a.order.id);
  assert.equal(f.state.creates, 1);
});
test('provider timeout recovers the same accepted payment instead of losing the order', async t => {
  const f = fixture(t), q = await f.quote(); f.state.failCreateAfterAccept = true;
  const { order } = await f.order(q.quoteId);
  assert.equal(order.checkoutUrl, 'https://pay.payos.vn/web/link-123');
  assert.equal(f.store.byId(order.id).status, 'PENDING');
});
test('expired or missing quote cannot create a payable order', async t => {
  const f = fixture(t);
  await assert.rejects(f.order('missing'), { status: 409 });
  assert.equal(f.state.creates, 0);
});
test('order lookup requires a secret, returns no customer PII, and return URL cannot mark paid', async t => {
  const f = fixture(t), q = await f.quote(), { order, key } = await f.order(q.quoteId);
  await assert.rejects(f.status(order.id, randomUUID()), { status: 404 });
  const result = await f.status(order.id, key);
  assert.equal(result.status, 'PENDING');
  assert.equal(result.customer, undefined); assert.equal(result.phone, undefined);
});
test('only verified complete payment marks paid; wrong link and amount fail', async t => {
  const f = fixture(t), q = await f.quote(), { order, key } = await f.order(q.quoteId);
  f.state.payment = { ...f.state.payment, status: 'PAID', amountPaid: 1, amountRemaining: 259999 };
  await assert.rejects(f.status(order.id, key), { status: 502 });
  assert.equal(f.store.byId(order.id).status, 'PENDING');
  f.state.payment.amountPaid = order.total; f.state.payment.amountRemaining = 0; f.state.payment.id = 'wrong-link';
  await assert.rejects(f.status(order.id, key), { status: 502 });
  f.state.payment.id = 'link-123';
  assert.equal((await f.status(order.id, key)).status, 'PAID');
});
test('signed webhook replay is idempotent and forged webhook is rejected', async t => {
  const f = fixture(t), q = await f.quote(), { order } = await f.order(q.quoteId);
  const saved = f.store.byId(order.id);
  f.state.payment = { ...f.state.payment, status: 'PAID', amountPaid: order.total, amountRemaining: 0 };
  const data = { orderCode: saved.orderCode, paymentLinkId: saved.paymentLinkId, amount: order.total, currency: 'VND', code: '00' };
  const payload = { data, signature: signPayOS(data, env.PAYOS_CHECKSUM_KEY) };
  await assert.rejects(f.app.handle({ method: 'POST', path: '/api/webhooks/payos', body: { ...payload, signature: '0'.repeat(64) } }), { status: 401 });
  await f.app.handle({ method: 'POST', path: '/api/webhooks/payos', body: payload });
  const paidAt = f.store.byId(order.id).paidAt;
  await f.app.handle({ method: 'POST', path: '/api/webhooks/payos', body: payload });
  assert.equal(f.store.byId(order.id).paidAt, paidAt);
});
test('spreadsheet outage keeps an order queued for retry, then clears after success', async t => {
  const f = fixture(t), q = await f.quote(); await f.order(q.quoteId);
  f.state.failSheets = true; await f.app.syncSheets(); assert.equal(f.store.dirty().length, 1);
  f.state.failSheets = false; await f.app.syncSheets(); assert.equal(f.store.dirty().length, 0);
  await f.app.syncSheets(); assert.equal(f.state.syncs, 2);
});
test('GHN uses two-level address lookup and preview; no shipping order is created', async () => {
  const calls = [];
  const request = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => url.includes('province/all') ? { code: 200, data: [{ _id: 1000001, name: 'Tỉnh thử', status: 1 }, { _id: 2, name: 'Đã xóa', status: 10 }] } : { code: 200, data: { total_fee: 27000 } } }; };
  const providers = createProviders(env, request);
  assert.deepEqual(await providers.locations('provinces'), [{ id: '1000001', name: 'Tỉnh thử' }]);
  const result = await providers.quote(priceCart(cart), { label: 'Phường thử, Tỉnh thử', provinceName: 'Tỉnh thử', wardName: 'Phường thử' }, { weight: 800, length: 30, width: 20, height: 20 }, customer);
  assert.equal(result, 27000); assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[1].url.endsWith('/preview'), true);
  assert.equal(JSON.parse(calls[1].options.body).is_new_to_address, true);
});
test('payOS adapter rejects an unsigned or tampered response', async () => {
  const provider = createProviders(env, async () => ({ ok: true, json: async () => ({ code: '00', data: { status: 'PAID' }, signature: '0'.repeat(64) }) }));
  await assert.rejects(provider.getPayment(123), { status: 502 });
});
test('COD records an unpaid order without creating a payOS link', async t => {
  const f = fixture(t), q = await f.quote({ paymentMethod: 'COD' }), { order, key } = await f.order(q.quoteId);
  assert.equal(order.status, 'COD_PENDING'); assert.equal(order.paymentMethod, 'COD');
  assert.equal(order.checkoutUrl, null); assert.equal(f.state.creates, 0);
  assert.equal((await f.status(order.id, key)).status, 'COD_PENDING');
});
test('COD below free shipping includes the delivery fee in the amount to collect', async t => {
  const f = fixture(t), amounts = [];
  f.providers.quote = async (_items, _destination, _parcel, _customer, codAmount) => { amounts.push(codAmount); return 27000; };
  const q = await f.quote({ paymentMethod: 'COD', cart: [{ id: 'tui-rac', v: 1, qty: 1 }] });
  assert.equal(q.subtotal, 49000); assert.equal(q.total, 76000); assert.equal(q.shipping, 27000);
  assert.deepEqual(amounts, [49000, 76000]);
  const { order } = await f.order(q.quoteId); assert.equal(order.total, 76000);
});
test('COD can operate while automatic bank payment is not activated', async t => {
  const f = fixture(t, { env: { ...env, PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '' } });
  const config = await f.app.handle({ method: 'GET', path: '/api/config' });
  assert.deepEqual(config.paymentMethods, { COD: true, BANK: false });
  const q = await f.quote({ paymentMethod: 'COD' }); assert.equal((await f.order(q.quoteId)).order.status, 'COD_PENDING');
  await assert.rejects(f.quote({ paymentMethod: 'BANK' }), { status: 503 });
});
test('a changed cart cannot reuse an existing idempotency key', async t => {
  const f = fixture(t), key = randomUUID(), q = await f.quote(); await f.order(q.quoteId, key);
  const second = await f.quote();
  await assert.rejects(f.order(second.quoteId, key), { status: 409 });
});
