import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { CheckoutError, requireValue, priceCart, packageFor, shippingTotals, customerDetails, hash, verifyPayOS } from './domain.mjs';

export function createCommerce({ env, store, providers, sheets, packages, now = Date.now }) {
  const locks = new Map();
  const locationCache = new Map();
  const ready = () => Boolean(env.GHN_TOKEN && env.GHN_SHOP_ID && env.GOOGLE_SERVICE_ACCOUNT_FILE && env.GOOGLE_SHEET_ID);
  const bankReady = () => ready() && Boolean(env.PAYOS_CLIENT_ID && env.PAYOS_API_KEY && env.PAYOS_CHECKSUM_KEY);
  async function locations(kind, parent) {
    const key = `${kind}:${parent || ''}`;
    if (locationCache.get(key)?.until > now()) return locationCache.get(key).data;
    const data = await providers.locations(kind, parent);
    locationCache.set(key, { data, until: now() + 3600000 });
    return data;
  }
  function publicOrder(order) {
    return { id: order.id, code: `HNR${order.orderCode}`, status: order.status, paymentMethod: order.paymentMethod, subtotal: order.subtotal, shipping: order.shipping, total: order.total, checkoutUrl: order.checkoutUrl || null };
  }
  async function reconcile(order) {
    if (order.status === 'PAID' || !order.paymentLinkId) return order;
    const payment = await providers.getPayment(order.orderCode);
    requireValue(payment.orderCode === order.orderCode && payment.id === order.paymentLinkId && payment.amount === order.total, 'Giao dịch không khớp đơn hàng.', 502);
    const latest = store.byId(order.id);
    if (latest.status === 'PAID') return latest;
    if (payment.status === 'PAID') {
      requireValue(Number.isSafeInteger(payment.amountPaid) && payment.amountPaid >= order.total && payment.amountRemaining === 0, 'Giao dịch chưa đủ số tiền.', 502);
      latest.status = 'PAID';
      latest.paidAt = new Date(now()).toISOString();
    } else if (payment.status === 'CANCELLED') latest.status = 'CANCELLED';
    else return latest;
    latest.updatedAt = new Date(now()).toISOString();
    store.save(latest);
    return latest;
  }
  async function makeOrder(body, key) {
    requireValue(/^[a-zA-Z0-9-]{32,80}$/.test(key || ''), 'Thiếu mã bảo vệ đơn hàng.');
    requireValue(typeof body.quoteId === 'string' && body.quoteId.length <= 80, 'Vui lòng tính lại phí vận chuyển.');
    const digest = hash(key);
    let order = store.byKey(digest);
    if (order) requireValue(order.quoteId === body.quoteId, 'Mã yêu cầu đã được dùng cho giỏ khác.', 409);
    else {
      const quote = store.getQuote(body.quoteId);
      requireValue(quote && quote.expires > now(), 'Báo phí đã hết hạn. Vui lòng tính lại.', 409);
      order = { ...quote, quoteId: body.quoteId, id: randomUUID(), orderCode: now() * 1000 + randomInt(1000), status: quote.paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING', createdAt: new Date(now()).toISOString(), updatedAt: new Date(now()).toISOString() };
      delete order.expires;
      store.create(order, digest, digest);
    }
    if (order.paymentMethod === 'COD') return publicOrder(order);
    requireValue(bankReady(), 'Chuyển khoản tự động đang được thiết lập. Bạn có thể chọn COD.', 503);
    if (!order.paymentLinkId) {
      // Retry with the SAME provider orderCode after a timeout, never create a second order.
      let link;
      try { link = await providers.createPayment(order); }
      catch (error) {
        // The provider may have accepted the original request before our connection failed.
        // A retry can recover its existing link after authenticating the provider response.
        const existing = await providers.getPayment(order.orderCode).catch(() => null);
        if (!existing || existing.orderCode !== order.orderCode || existing.amount !== order.total || typeof existing.id !== 'string') throw error;
        link = { paymentLinkId: existing.id, checkoutUrl: `https://pay.payos.vn/web/${encodeURIComponent(existing.id)}` };
      }
      order = { ...store.byId(order.id), ...link, updatedAt: new Date(now()).toISOString() };
      store.save(order);
    }
    return publicOrder(order);
  }
  let syncing = false;
  async function syncSheets() {
    if (syncing || !ready()) return;
    syncing = true;
    try {
      for (const order of store.dirty()) {
        try { await sheets.sync(order); store.clean(order); }
        catch { console.error('Google Sheet sync pending:', order.id); break; }
      }
    } finally { syncing = false; }
  }
  return {
    syncSheets,
    async handle({ method, path, query = new URLSearchParams(), body = {}, headers = {} }) {
      if (method === 'GET' && path === '/api/config') return { ready: ready(), paymentMethods: { COD: ready(), BANK: bankReady() }, freeShipThreshold: 200000 };
      requireValue(ready(), 'Thanh toán trực tuyến đang được thiết lập. Vui lòng liên hệ Hanori qua Zalo.', 503);
      if (method === 'GET' && path.startsWith('/api/locations/')) return { locations: await locations(path.split('/').pop(), query.get('parent')) };
      if (method === 'POST' && path === '/api/quote') {
        requireValue(['COD', 'BANK'].includes(body.paymentMethod), 'Chọn cách thanh toán.');
        requireValue(body.paymentMethod !== 'BANK' || bankReady(), 'Chuyển khoản tự động đang được thiết lập. Bạn có thể chọn COD.', 503);
        const items = priceCart(body.cart);
        const customer = customerDetails(body.customer);
        const province = (await locations('provinces')).find(x => x.id === body.destination?.province);
        requireValue(province, 'Chọn tỉnh/thành nhận hàng.');
        const ward = (await locations('wards', province.id)).find(x => x.id === body.destination?.ward);
        requireValue(ward, 'Chọn phường/xã nhận hàng.');
        const destination = { province: province.id, ward: ward.id, provinceName: province.name, wardName: ward.name, label: `${ward.name}, ${province.name}` };
        const parcel = packageFor(items, packages);
        const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
        let codAmount = body.paymentMethod === 'COD' ? subtotal : 0;
        let totals;
        for (let attempt = 0; attempt < 4; attempt++) {
          const fee = await providers.quote(items, destination, parcel, customer, codAmount);
          totals = shippingTotals(subtotal, fee);
          if (body.paymentMethod !== 'COD' || codAmount === totals.total) break;
          codAmount = totals.total;
          requireValue(attempt < 3, 'Chưa xác định được phí thu hộ. Vui lòng liên hệ Zalo.', 502);
        }
        const quoteId = randomBytes(24).toString('hex');
        const expires = now() + 15 * 60000;
        store.quote(quoteId, { items, customer, destination, parcel, paymentMethod: body.paymentMethod, ...totals, expires });
        return { quoteId, paymentMethod: body.paymentMethod, ...totals, expires };
      }
      if (method === 'POST' && path === '/api/orders') {
        const key = headers['idempotency-key'];
        if (!locks.has(key)) locks.set(key, { quoteId: body.quoteId, promise: makeOrder(body, key).finally(() => locks.delete(key)) });
        requireValue(locks.get(key).quoteId === body.quoteId, 'Mã yêu cầu đã được dùng cho giỏ khác.', 409);
        return await locks.get(key).promise;
      }
      if (method === 'GET' && /^\/api\/orders\/[a-f0-9-]{36}$/.test(path)) {
        const id = path.split('/').pop();
        const bearer = (headers.authorization || '').replace(/^Bearer /, '');
        requireValue(bearer && store.canRead(id, hash(bearer)), 'Không tìm thấy đơn hàng.', 404);
        const order = store.byId(id);
        // A return URL is never proof of payment; the merchant API is authoritative.
        return publicOrder(await reconcile(order));
      }
      if (method === 'POST' && path === '/api/webhooks/payos') {
        requireValue(verifyPayOS(body.data, body.signature, env.PAYOS_CHECKSUM_KEY), 'Chữ ký không hợp lệ.', 401);
        if (body.data.code !== '00' || body.data.currency !== 'VND') return { accepted: true };
        const order = store.byCode(body.data.orderCode);
        // payOS sends a signed sample when confirming the webhook URL.
        if (!order) return { accepted: true };
        requireValue(order.paymentLinkId === body.data.paymentLinkId, 'Giao dịch không khớp.', 400);
        await reconcile(order);
        return { accepted: true };
      }
      throw new CheckoutError('Không tìm thấy chức năng.', 404);
    }
  };
}
