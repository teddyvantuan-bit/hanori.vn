import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { CheckoutError, requireValue, signPayOS, verifyPayOS } from './domain.mjs';

export async function jsonRequest(url, options = {}, request = fetch) {
  const response = await request(url, { ...options, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new CheckoutError('Dịch vụ đang bận. Vui lòng thử lại.', 502);
  try { return await response.json(); } catch { throw new CheckoutError('Dịch vụ trả về dữ liệu không hợp lệ.', 502); }
}
export function createProviders(env, request = fetch) {
  const payHeaders = { 'Content-Type': 'application/json', 'x-client-id': env.PAYOS_CLIENT_ID, 'x-api-key': env.PAYOS_API_KEY };
  async function payment(path, options = {}) {
    const body = await jsonRequest(`https://api-merchant.payos.vn/v2/payment-requests${path}`, { ...options, headers: payHeaders }, request);
    requireValue(body.code === '00' && verifyPayOS(body.data, body.signature, env.PAYOS_CHECKSUM_KEY), 'Chưa xác minh được phản hồi thanh toán.', 502);
    return body.data;
  }
  async function ghn(path, data) {
    const body = await jsonRequest(`${env.GHN_BASE_URL || 'https://online-gateway.ghn.vn'}/shiip/public-api/${path}`, {
      method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Token: env.GHN_TOKEN, ShopId: String(env.GHN_SHOP_ID) }, ...(data ? { body: JSON.stringify(data) } : {})
    }, request);
    requireValue(body.code === 200, 'Chưa lấy được thông tin giao hàng.', 502);
    return body.data;
  }
  return {
    async createPayment(order) {
      const body = { orderCode: order.orderCode, amount: order.total, description: `H${String(order.orderCode).slice(-8)}`, returnUrl: `${env.PUBLIC_ORIGIN}/?hanoriPayment=return`, cancelUrl: `${env.PUBLIC_ORIGIN}/?hanoriPayment=cancel` };
      body.signature = signPayOS(body, env.PAYOS_CHECKSUM_KEY);
      const data = await payment('', { method: 'POST', body: JSON.stringify(body) });
      requireValue(data.orderCode === order.orderCode && data.amount === order.total && data.currency === 'VND' && /^https:\/\/pay\.payos\.vn\//.test(data.checkoutUrl || '') && typeof data.paymentLinkId === 'string', 'Thông tin thanh toán không khớp.', 502);
      return { paymentLinkId: data.paymentLinkId, checkoutUrl: data.checkoutUrl };
    },
    getPayment: code => payment(`/${code}`),
    async locations(kind, parent) {
      if (kind === 'provinces') return (await ghn('v3/master-data/province/all?offset=0&limit=200') || []).filter(x => x.status === 1).map(x => ({ id: String(x._id), name: x.name }));
      requireValue(/^\d{1,10}$/.test(parent || ''), 'Chọn địa chỉ trước.');
      if (kind === 'wards') return (await ghn(`v3/master-data/ward/all-by-province-id?province_id=${parent}&offset=0&limit=200`) || []).filter(x => x.status === 1).map(x => ({ id: String(x._id), name: x.name }));
      throw new CheckoutError('Không tìm thấy địa chỉ.', 404);
    },
    async quote(items, destination, parcel, customer, codAmount = 0) {
      // Preview validates the new two-level address and quotes without creating a shipment.
      const fee = await ghn('v2/shipping-order/preview', { ...parcel, payment_type_id: 1, required_note: 'KHONGCHOXEMHANG', service_type_id: 2, is_new_to_address: true, to_name: customer.name, to_phone: customer.phone, to_address: `${customer.addr}, ${destination.label}`, to_province_name: destination.provinceName, to_ward_name: destination.wardName, insurance_value: items.reduce((sum, item) => sum + item.price * item.qty, 0), cod_amount: codAmount, content: 'Đồ gia dụng Hanori', items: items.map(x => ({ name: x.name, code: x.sku, quantity: x.qty, price: x.price })) });
      return fee.total_fee;
    }
  };
}

export function createSheets(env, request = fetch) {
  let cachedToken = null;
  async function token() {
    if (cachedToken && cachedToken.until > Date.now()) return cachedToken.value;
    const credentials = JSON.parse(readFileSync(env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
    const jwt = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key, 'base64url')}`;
    const result = await jsonRequest('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString() }, request);
    requireValue(result.access_token, 'Chưa kết nối được bảng đơn hàng.', 502);
    cachedToken = { value: result.access_token, until: Date.now() + 3300000 };
    return cachedToken.value;
  }
  async function api(path, options = {}) {
    return jsonRequest(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}${path}`, { ...options, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' } }, request);
  }
  async function put(range, values) {
    return api(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values }) });
  }
  return {
    async sync(order) {
      // Idempotent upsert by order ID. A single worker owns this spreadsheet.
      // RAW prevents customer input beginning with '=' becoming a spreadsheet formula.
      const range = "'Đơn hàng'!A2:A10000";
      const result = await api(`/values/${encodeURIComponent(range)}`);
      const values = result.values || [];
      const code = `HNR${order.orderCode}`;
      const index = values.findIndex(row => row[0] === code);
      const row = index < 0 ? values.length + 2 : index + 2;
      requireValue(row <= 10000, 'Bảng đơn hàng đã đầy.', 503);
      const details = order.items.map(x => `${x.sku} | ${x.variant} | SL ${x.qty} | ${x.price} VND`).join('\n');
      await put(`'Đơn hàng'!A${row}:P${row}`, [[code, order.createdAt, order.customer.name, order.customer.phone, order.customer.addr, order.subtotal, order.shipping, order.total, order.status === 'PAID' ? 'Đã thanh toán' : order.status === 'COD_PENDING' ? 'COD — chờ thu tiền' : order.status === 'CANCELLED' ? 'Đã hủy thanh toán' : 'Chờ thanh toán', details, order.paymentLinkId || '', order.customer.note, order.updatedAt, order.carrierFee, order.destination.label, order.paymentMethod]]);
    }
  };
}
