import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const H = {};
vm.runInNewContext(readFileSync(new URL('../assets/products.js', import.meta.url), 'utf8'), { window: { HANORI: H }, HANORI: H });
export const catalog = new Map(H.products.map(p => [p.id, p]));
export const FREE_SHIPPING = 200000;
export class CheckoutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function requireValue(ok, message, status) { if (!ok) throw new CheckoutError(message, status); }
export function hash(value) { return createHash('sha256').update(value).digest('hex'); }
export function signPayOS(data, key) {
  const message = Object.keys(data).sort().filter(k => data[k] !== undefined).map(k => {
    let value = data[k];
    if (Array.isArray(value)) value = JSON.stringify(value.map(item => Object.fromEntries(Object.keys(item).sort().map(field => [field, item[field]]))));
    if (value === null || value === 'null' || value === 'undefined') value = '';
    return `${k}=${value}`;
  }).join('&');
  return createHmac('sha256', key).update(message).digest('hex');
}
export function verifyPayOS(data, signature, key) {
  if (!data || !key || !/^[a-f0-9]{64}$/i.test(signature || '')) return false;
  return timingSafeEqual(Buffer.from(signPayOS(data, key), 'hex'), Buffer.from(signature, 'hex'));
}
export function priceCart(cart) {
  requireValue(Array.isArray(cart) && cart.length > 0 && cart.length <= 50, 'Giỏ hàng không hợp lệ.');
  const seen = new Set();
  return cart.map(item => {
    const p = catalog.get(item.id);
    requireValue(p && !p.contactOnly, 'Sản phẩm chưa thể đặt trực tuyến.');
    requireValue(Number.isInteger(item.v) && item.v >= 0 && item.v < (p.variants?.length || 1), 'Phân loại không hợp lệ.');
    requireValue(Number.isInteger(item.qty) && item.qty >= 1 && item.qty <= 20, 'Mỗi phân loại tối đa 20 sản phẩm.');
    const variant = p.variants ? p.variants[item.v] : p;
    const identity = `${item.id}:${item.v}`;
    requireValue(!seen.has(identity), 'Phân loại bị lặp trong giỏ hàng.');
    seen.add(identity);
    requireValue(Number.isSafeInteger(variant.price) && variant.price > 0, 'Sản phẩm chưa có giá bán.');
    return { id: p.id, v: item.v, sku: variant.sku, name: p.name, variant: variant.name === p.name ? '' : variant.name || '', qty: item.qty, price: variant.price };
  });
}
export function packageFor(items, packages) {
  const parcels = items.map(item => {
    const parcel = packages[item.sku];
    requireValue(parcel && ['weight', 'length', 'width', 'height'].every(k => Number.isInteger(parcel[k]) && parcel[k] > 0), 'Sản phẩm đang chờ xác nhận kiện hàng. Vui lòng liên hệ Zalo.', 422);
    return { ...parcel, qty: item.qty };
  });
  if (parcels.length === 1 && parcels[0].qty === 1) {
    requireValue(parcels[0].weight < 20000, 'Kiện hàng lớn cần Hanori báo phí riêng qua Zalo.', 422);
    return Object.fromEntries(['weight', 'length', 'width', 'height'].map(k => [k, parcels[0][k]]));
  }
  // Enable only after the shop validates this stacking method using real cartons.
  const policy = packages._packing;
  requireValue(policy?.verified === true && ['extraWeight', 'padding'].every(k => Number.isInteger(policy[k]) && policy[k] >= 0), 'Hanori cần xác nhận đóng gói cho giỏ nhiều sản phẩm. Vui lòng liên hệ Zalo.', 422);
  const result = {
    weight: parcels.reduce((s, p) => s + p.weight * p.qty, 0) + policy.extraWeight,
    length: Math.max(...parcels.map(p => p.length)) + policy.padding,
    width: Math.max(...parcels.map(p => p.width)) + policy.padding,
    height: parcels.reduce((s, p) => s + p.height * p.qty, 0) + policy.padding
  };
  requireValue(result.weight < 20000, 'Kiện hàng lớn cần Hanori báo phí riêng qua Zalo.', 422);
  return result;
}
export function shippingTotals(subtotal, carrierFee) {
  requireValue(Number.isSafeInteger(carrierFee) && carrierFee >= 0, 'Chưa lấy được phí vận chuyển.', 502);
  const shipping = subtotal >= FREE_SHIPPING ? 0 : carrierFee;
  return { subtotal, carrierFee, shipping, total: subtotal + shipping };
}
export function customerDetails(input) {
  const customer = Object.fromEntries(['name', 'phone', 'addr', 'note'].map(k => [k, typeof input?.[k] === 'string' ? input[k].trim() : '']));
  customer.phone = customer.phone.replace(/[\s().-]/g, '').replace(/^\+84/, '0');
  requireValue(customer.name.length >= 2 && customer.name.length <= 100, 'Kiểm tra lại họ tên.');
  requireValue(/^0[35789]\d{8}$/.test(customer.phone), 'Số điện thoại chưa hợp lệ.');
  requireValue(customer.addr.length >= 8 && customer.addr.length <= 300 && customer.note.length <= 1000, 'Kiểm tra lại địa chỉ hoặc ghi chú.');
  return customer;
}
