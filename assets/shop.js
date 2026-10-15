/* ============================================================
   Hanori — cửa hàng: giỏ hàng, chọn phân loại, đặt hàng
   Phụ thuộc: products.js (window.HANORI)
   ============================================================ */
(function () {
  "use strict";
  var H = window.HANORI;
  if (!H || !H.products) return;
  var CFG = H.config;
  var PRODUCTS = H.products;
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  /* ---------- Helpers ---------- */
  function vnd(n) { return (n || 0).toLocaleString("vi-VN") + "đ"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function minPrice(p) {
    if (p.variants) return Math.min.apply(null, p.variants.map(function (v) { return v.price; }));
    return p.price || 0;
  }
  function variantAt(p, i) {
    if (p.variants) return p.variants[i] || p.variants[0];
    return { name: "", sku: p.sku || "", price: p.price || 0, orig: p.orig || 0 };
  }
  var ICON_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
  var ICON_SHOPEE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /* ---------- Cart state ---------- */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem("hnr_cart")) || []; } catch (e) { cart = []; }
  // Ignore stale or malformed entries instead of breaking the whole shop.
  cart = (Array.isArray(cart) ? cart : []).filter(function (it) {
    var p = it && byId[it.id];
    return p && !p.contactOnly && Number.isInteger(it.qty) && it.qty > 0 &&
      it.qty <= 20 && Number.isInteger(it.v) && it.v >= 0 && it.v < (p.variants ? p.variants.length : 1);
  });
  function saveCart() { try { localStorage.setItem("hnr_cart", JSON.stringify(cart)); } catch (e) {} }
  function cartCount() { return cart.reduce(function (s, it) { return s + it.qty; }, 0); }
  function cartSubtotal() {
    return cart.reduce(function (s, it) {
      var p = byId[it.id]; if (!p) return s;
      return s + variantAt(p, it.v).price * it.qty;
    }, 0);
  }
  function addToCart(id, v, qty) {
    v = v || 0; qty = qty || 1;
    var ex = cart.find(function (it) { return it.id === id && it.v === v; });
    if (ex) ex.qty = Math.min(20, ex.qty + qty); else cart.push({ id: id, v: v, qty: Math.min(20, qty) });
    invalidateQuote();
    track('add_to_cart', { value: variantAt(byId[id], v).price * qty, currency: 'VND', items: analyticsItems([{ id: id, v: v, qty: qty }]) });
    saveCart(); renderCart(); bumpCart();
  }
  function setQty(idx, qty) {
    if (qty <= 0) cart.splice(idx, 1); else cart[idx].qty = Math.min(20, qty);
    invalidateQuote();
    saveCart(); renderCart();
  }

  /* ---------- Product card ---------- */
  function repVariant(p) {
    if (p.variants) return p.variants.reduce(function (a, b) { return b.price < a.price ? b : a; });
    return { price: p.price || 0, orig: p.orig || 0 };
  }
  function discountPct(p) {
    var r = repVariant(p);
    if (!r.orig || r.orig <= r.price) return 0;
    return Math.round((r.orig - r.price) / r.orig * 100);
  }
  function cardHTML(p) {
    var tagChip = p.badge ? '<span class="tag-chip">' + esc(p.badge) + "</span>" : "";
    var priceBlock, cta;
    if (p.contactOnly) {
      priceBlock = '<div class="product-price"><span class="pp-contact">Liên hệ báo giá</span></div>';
      cta =
        '<a href="' + CFG.zalo + '" target="_blank" rel="noopener" class="btn btn-primary btn-block btn-sm">Liên hệ báo giá</a>' +
        '<a href="' + CFG.shopee + '" target="_blank" rel="noopener" class="btn btn-outline btn-block btn-sm btn-shopee">' + ICON_SHOPEE + ' Mua trên Shopee</a>';
    } else {
      var mp = minPrice(p);
      var hasVar = !!p.variants;
      var orig = repVariant(p).orig;
      var pct = discountPct(p);
      priceBlock =
        '<div class="product-price">' +
        (hasVar ? '<span class="pp-from">từ</span> ' : "") +
        '<span class="pp-now">' + vnd(mp) + "</span>" +
        (orig && orig > mp ? '<span class="pp-old">' + vnd(orig) + "</span>" : "") +
        (pct ? '<span class="pp-off">-' + pct + "%</span>" : "") +
        "</div>";
      cta =
        '<button type="button" class="btn btn-primary btn-block btn-sm" data-add="' + p.id + '">' + ICON_CART + (hasVar ? " Chọn phân loại" : " Thêm vào giỏ") + "</button>" +
        '<a href="' + CFG.shopee + '" target="_blank" rel="noopener" class="btn btn-outline btn-block btn-sm btn-shopee">' + ICON_SHOPEE + " Mua trên Shopee</a>";
    }
    var note = p.note ? '<span class="product-note">' + esc(p.note) + "</span>" : "";
    return (
      '<div class="product-card" data-category="' + p.cat + '">' +
        '<a class="product-thumb" href="/san-pham/' + p.id + '/" aria-label="' + esc(p.name) + '">' +
          '<img src="' + p.img + '" alt="' + esc(p.name) + '" loading="lazy">' +
          '<span class="product-quickview">Xem chi tiết</span>' +
        "</a>" +
        '<div class="product-body">' +
          '<div class="product-meta"><span class="product-tag">' + esc(p.tag) + "</span>" + tagChip + "</div>" +
          '<h3 class="product-name"><a href="/san-pham/' + p.id + '/">' + esc(p.name) + "</a></h3>" +
          note +
          '<p class="product-desc">' + esc(p.desc) + "</p>" +
          priceBlock +
          '<div class="product-cta">' + cta + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderGrids() {
    var grid = document.querySelector("[data-shop-grid]");
    if (grid) grid.innerHTML = PRODUCTS.map(cardHTML).join("");
    document.querySelectorAll("[data-shop-featured]").forEach(function (feat) {
      var ids = (feat.getAttribute("data-shop-featured") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var list = ids.length ? ids.map(function (id) { return byId[id]; }).filter(Boolean) : PRODUCTS.slice(0, 6);
      feat.innerHTML = list.map(cardHTML).join("");
    });
  }

  /* ---------- Overlay / drawer / modal shells ---------- */
  function buildShell() {
    var el = document.createElement("div");
    el.innerHTML =
      '<div class="shop-overlay" data-close></div>' +
      '<aside class="cart-drawer" aria-label="Giỏ hàng"><div class="cart-inner"></div></aside>' +
      '<div class="pv-modal" aria-label="Chi tiết sản phẩm"><div class="pv-inner"></div></div>';
    document.body.appendChild(el);
  }

  function openOverlay(what) {
    document.querySelector(".shop-overlay").classList.add("open");
    document.body.classList.add("shop-lock");
    if (what) document.querySelector(what).classList.add("open");
  }
  function closeAll() {
    document.querySelectorAll(".shop-overlay,.cart-drawer,.pv-modal").forEach(function (e) { e.classList.remove("open"); });
    document.body.classList.remove("shop-lock");
  }

  /* ---------- Quick view ---------- */
  var pvState = { id: null, v: 0, qty: 1, mi: 1 };
  function gallery(p) {
    var n = p.g || 1, a = [];
    for (var i = 1; i <= n; i++) a.push("/assets/products/" + p.id + "/" + (i < 10 ? "0" + i : i) + ".webp");
    return a;
  }
  function openView(id) {
    var p = byId[id]; if (!p) return;
    pvState = { id: id, v: 0, qty: 1, mi: variantAt(p, 0).vimg || 1 };
    renderView();
    openOverlay(".pv-modal");
  }
  function renderView() {
    var p = byId[pvState.id];
    var inner = document.querySelector(".pv-inner");
    var variantsUI = "";
    if (p.variants) {
      variantsUI =
        '<div class="pv-variants"><span class="pv-label">Phân loại</span><div class="pv-chips">' +
        p.variants.map(function (vv, i) {
          return '<button type="button" class="pv-chip' + (i === pvState.v ? " active" : "") + '" data-v="' + i + '">' + esc(vv.name) + "</button>";
        }).join("") +
        "</div></div>";
    }
    var cur = variantAt(p, pvState.v);
    var priceUI, actionUI;
    if (p.contactOnly) {
      priceUI = '<div class="pv-price"><span class="pp-contact">Liên hệ báo giá</span></div>';
      actionUI =
        '<a href="' + CFG.zalo + '" target="_blank" rel="noopener" class="btn btn-primary btn-block">Liên hệ qua Zalo</a>' +
        '<a href="' + CFG.shopee + '" target="_blank" rel="noopener" class="btn btn-outline btn-block btn-shopee">' + ICON_SHOPEE + " Mua trên Shopee</a>";
    } else {
      priceUI =
        '<div class="pv-price"><span class="pp-now">' + vnd(cur.price) + "</span>" +
        (cur.orig && cur.orig > cur.price ? '<span class="pp-old">' + vnd(cur.orig) + "</span>" : "") + "</div>";
      actionUI =
        '<div class="pv-qty"><button type="button" data-q="-1">−</button><span class="pv-qnum">' + pvState.qty + "</span><button type=\"button\" data-q=\"1\">+</button></div>" +
        '<button type="button" class="btn btn-primary btn-block" data-pvadd>' + ICON_CART + " Thêm vào giỏ</button>" +
        '<a href="' + CFG.shopee + '" target="_blank" rel="noopener" class="btn btn-outline btn-block btn-shopee">' + ICON_SHOPEE + " Mua trên Shopee</a>";
    }
    var g = gallery(p);
    if (pvState.mi > g.length) pvState.mi = 1;
    var mainSrc = g[pvState.mi - 1] || p.img;
    var thumbs = g.map(function (src, i) {
      return '<button type="button" class="pv-thumb' + (i + 1 === pvState.mi ? " active" : "") + '" data-gi="' + (i + 1) + '"><img src="' + src + '" alt="" loading="lazy"></button>';
    }).join("");
    inner.innerHTML =
      '<button type="button" class="pv-close" data-close aria-label="Đóng">' + ICON_X + "</button>" +
      '<div class="pv-gallery">' +
        '<div class="pv-media">' +
          '<img src="' + mainSrc + '" alt="' + esc(p.name) + '">' +
          (g.length > 1 ?
            '<button type="button" class="pv-nav prev" data-pvnav="-1" aria-label="Ảnh trước"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
            '<button type="button" class="pv-nav next" data-pvnav="1" aria-label="Ảnh sau"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
            '<span class="pv-count">' + pvState.mi + "/" + g.length + "</span>"
            : "") +
        "</div>" +
        (g.length > 1 ? '<div class="pv-thumbs">' + thumbs + "</div>" : "") +
      "</div>" +
      '<div class="pv-info">' +
        '<span class="product-tag">' + esc(p.tag) + "</span>" +
        "<h3>" + esc(p.name) + "</h3>" +
        (p.note ? '<span class="product-note">' + esc(p.note) + "</span>" : "") +
        priceUI +
        '<p class="pv-desc">' + esc(p.desc) + "</p>" +
        '<div class="pv-meta"><span><strong>Chất liệu:</strong> ' + esc(p.material || "—") + "</span><span><strong>Kích thước:</strong> " + esc(p.sizes || "—") + "</span>" + (cur.sku ? "<span><strong>Mã:</strong> " + esc(cur.sku) + "</span>" : "") + "</div>" +
        variantsUI +
        '<div class="pv-actions">' + actionUI + "</div>" +
      "</div>";
  }

  /* ---------- Cart drawer ---------- */
  var view = "cart"; // cart | checkout | done
  var lastOrder = null;
  var checkoutDraft = { name: "", phone: "", addr: "", note: "", province: "", ward: "", paymentMethod: "COD" };
  var shippingQuote = null, checkoutKey = null, checkoutRevision = 0;
  var commerceBusy = false;
  function track(event, details) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: event, ecommerce: details });
  }
  function analyticsItems(list) {
    return list.map(function (it) { var p = byId[it.id], v = variantAt(p, it.v); return { item_id: v.sku || p.id, item_name: p.name, item_variant: v.name || '', price: v.price, quantity: it.qty }; });
  }
  function invalidateQuote() {
    shippingQuote = null; checkoutKey = null; checkoutRevision++;
    var button = document.querySelector('.co-form button[type="submit"]');
    if (button && CFG.commerceEnabled) button.textContent = 'Tính phí & xem tổng tiền';
    var result = document.querySelector('[data-shipping-result]');
    if (result) result.textContent = '';
  }
  function api(path, options) {
    return fetch(CFG.commerceApiBase + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {})).then(function (response) {
      return response.json().then(function (body) { if (!response.ok) throw new Error(body.error || 'Chưa kết nối được. Vui lòng thử lại.'); return body; });
    });
  }
  function loadLocations(form, kind, parent, selected) {
    var select = form.elements.namedItem(kind === 'provinces' ? 'province' : 'ward');
    select.disabled = true;
    select.innerHTML = '<option value="">Đang tải…</option>';
    return api('/locations/' + kind + (parent ? '?parent=' + encodeURIComponent(parent) : '')).then(function (data) {
      if (!form.isConnected || (kind === 'wards' && form.elements.province.value !== parent)) return;
      select.innerHTML = '<option value="">Chọn ' + (kind === 'provinces' ? 'tỉnh/thành' : 'phường/xã') + '</option>' + data.locations.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>'; }).join('');
      select.disabled = false;
      select.value = selected || '';
    }).catch(function (error) { select.innerHTML = '<option value="">Chưa tải được địa chỉ</option>'; toast(error.message); });
  }
  function rememberCheckout() {
    var form = document.querySelector(".co-form");
    if (!form) return;
    Object.keys(checkoutDraft).forEach(function (key) { var field = form.elements.namedItem(key); if (field) checkoutDraft[key] = field.value; });
  }
  function renderCart() {
    document.querySelectorAll("[data-cart-count]").forEach(function (b) {
      var n = cartCount();
      b.textContent = n;
      b.classList.toggle("has", n > 0);
    });
    var inner = document.querySelector(".cart-inner");
    if (!inner) return;
    if (view === "checkout") return renderCheckout();
    if (view === "done") return renderDone();

    if (!cart.length) {
      inner.innerHTML =
        '<div class="cart-head"><h3>Giỏ hàng</h3><button type="button" class="cart-x" data-close>' + ICON_X + "</button></div>" +
        '<div class="cart-empty"><p>Giỏ hàng đang trống.</p><a href="/san-pham/" class="btn btn-primary">Xem sản phẩm</a></div>';
      return;
    }
    var rows = cart.map(function (it, i) {
      var p = byId[it.id]; var cur = variantAt(p, it.v);
      return (
        '<div class="cart-row">' +
          '<img src="' + p.img + '" alt="">' +
          '<div class="cart-row-main">' +
            '<div class="cart-row-name">' + esc(p.name) + "</div>" +
            (cur.name ? '<div class="cart-row-var">' + esc(cur.name) + "</div>" : "") +
            '<div class="cart-row-price">' + vnd(cur.price) + "</div>" +
          "</div>" +
          '<div class="cart-row-right">' +
            '<button type="button" class="cart-del" data-del="' + i + '" aria-label="Xóa">' + ICON_X + "</button>" +
            '<div class="qty-step"><button type="button" data-dec="' + i + '">−</button><span>' + it.qty + "</span><button type=\"button\" data-inc=\"" + i + '">+</button></div>' +
          "</div>" +
        "</div>"
      );
    }).join("");
    inner.innerHTML =
      '<div class="cart-head"><h3>Giỏ hàng (' + cartCount() + ")</h3><button type=\"button\" class=\"cart-x\" data-close>" + ICON_X + "</button></div>" +
      '<div class="cart-list">' + rows + "</div>" +
      '<div class="cart-foot">' +
        '<div class="cart-sub"><span>Tạm tính</span><strong>' + vnd(cartSubtotal()) + "</strong></div>" +
        '<p class="cart-ship">' + esc(cartSubtotal() >= CFG.freeShipThreshold ? 'Đơn này được miễn phí vận chuyển.' : 'Mua thêm ' + vnd(CFG.freeShipThreshold - cartSubtotal()) + ' để được miễn phí vận chuyển. Phí hiện tại tính theo địa chỉ.') + "</p>" +
        '<button type="button" class="btn btn-primary btn-block" data-checkout>Tiến hành đặt hàng</button>' +
      "</div>";
  }

  function orderCode() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    var r = Math.random().toString(36).slice(2, 5).toUpperCase();
    return "HNR" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + r;
  }

  function renderCheckout() {
    rememberCheckout();
    invalidateQuote();
    var inner = document.querySelector(".cart-inner");
    var total = cartSubtotal();
    var rows = cart.map(function (it) {
      var p = byId[it.id]; var cur = variantAt(p, it.v);
      return '<div class="co-item"><span>' + esc(p.name) + (cur.name ? " · " + esc(cur.name) : "") + ' <em>×' + it.qty + "</em></span><span>" + vnd(cur.price * it.qty) + "</span></div>";
    }).join("");
    inner.innerHTML =
      '<div class="cart-head"><button type="button" class="cart-back" data-back>‹ Quay lại</button><h3>Đặt hàng</h3><button type="button" class="cart-x" data-close>' + ICON_X + "</button></div>" +
      '<div class="co-scroll">' +
        '<div class="co-summary">' + rows +
          '<div class="co-total"><span>Tổng tiền hàng</span><strong>' + vnd(total) + "</strong></div>" +
          '<p class="cart-ship">' + esc(CFG.shippingNote) + "</p>" +
        "</div>" +
        '<form class="co-form" novalidate>' +
          '<label>Họ và tên *<input name="name" required autocomplete="name" maxlength="100" placeholder="Nguyễn Văn A"></label>' +
          '<label>Số điện thoại *<input name="phone" required type="tel" autocomplete="tel" maxlength="20" placeholder="09xx xxx xxx"></label>' +
          (CFG.commerceEnabled ? '<label>Tỉnh/Thành *<select name="province" required><option value="">Chọn tỉnh/thành</option></select></label><label>Phường/Xã *<select name="ward" required disabled><option value="">Chọn tỉnh/thành trước</option></select></label>' : '') +
          '<label>Địa chỉ nhận hàng *<input name="addr" required autocomplete="street-address" maxlength="300" placeholder="' + (CFG.commerceEnabled ? 'Số nhà, đường hoặc thôn/tổ dân phố' : 'Số nhà, đường, phường/xã, tỉnh/thành') + '"></label>' +
          '<label>Ghi chú<textarea name="note" rows="2" maxlength="1000" placeholder="Thời gian nhận, hướng dẫn giao hàng, ..."></textarea></label>' +
          '<label>Thanh toán<select name="paymentMethod"><option value="COD">COD — nhận hàng rồi thanh toán</option><option value="BANK">' + (CFG.commerceEnabled ? 'Chuyển khoản tự động qua payOS' : 'Chuyển khoản sau khi shop xác nhận') + '</option></select></label>' +
          '<p class="co-shipping-result" data-shipping-result role="status" aria-live="polite"></p>' +
          '<button type="submit" class="btn btn-primary btn-block">' + (CFG.commerceEnabled ? 'Tính phí & xem tổng tiền' : 'Chuẩn bị nội dung gửi Hanori') + '</button>' +
          '<p class="co-hint">' + (CFG.commerceEnabled ? 'Bạn sẽ thấy tổng tiền gồm phí vận chuyển trước khi xác nhận. COD thu tiền khi giao hàng; chuyển khoản được xác nhận qua payOS.' : 'Hanori xác nhận đơn và phí vận chuyển qua Zalo trước khi giao hàng hoặc thanh toán.') + '</p>' +
          '<p class="co-hint">Thông tin được dùng để xử lý đơn theo <a href="/chinh-sach-bao-mat/" target="_blank" rel="noopener">chính sách bảo mật</a>. Xem <a href="/chinh-sach-doi-tra/" target="_blank" rel="noopener">đổi trả và bảo hành</a>.</p>' +
        "</form>" +
      "</div>";
    var form = inner.querySelector(".co-form");
    Object.keys(checkoutDraft).forEach(function (key) { var field = form.elements.namedItem(key); if (field) field.value = checkoutDraft[key]; });
    if (CFG.commerceEnabled) {
      api('/config').then(function (config) {
        if (!form.isConnected) return;
        var bankOption = form.querySelector('option[value="BANK"]');
        bankOption.disabled = !config.paymentMethods.BANK;
        if (!config.paymentMethods.BANK) { bankOption.textContent = 'Chuyển khoản tự động — đang thiết lập'; if (form.elements.paymentMethod.value === 'BANK') { form.elements.paymentMethod.value = 'COD'; invalidateQuote(); } }
      }).catch(function (error) { toast(error.message); });
      loadLocations(form, 'provinces', null, checkoutDraft.province);
      if (checkoutDraft.province) loadLocations(form, 'wards', checkoutDraft.province, checkoutDraft.ward);
      form.addEventListener('input', invalidateQuote);
      form.addEventListener('change', function (e) {
        invalidateQuote();
        if (e.target.name === 'province') {
          checkoutDraft.ward = '';
          if (e.target.value) loadLocations(form, 'wards', e.target.value, '');
          else { form.elements.ward.innerHTML = '<option value="">Chọn tỉnh/thành trước</option>'; form.elements.ward.disabled = true; }
        }
      });
    }
  }

  function renderDone() {
    var o = lastOrder;
    if (o.automatic) return renderAutomaticOrder();
    var inner = document.querySelector(".cart-inner");
    var itemsText = o.items.map(function (x) { return "• " + x.name + (x.variant ? " (" + x.variant + ")" : "") + " x" + x.qty + " = " + vnd(x.price * x.qty); }).join("\n");
    var orderText =
      "ĐƠN HÀNG HANORI\n" +
      "Mã đơn: " + o.code + "\n" +
      "Khách: " + o.name + " - " + o.phone + "\n" +
      "Địa chỉ: " + o.addr + "\n" +
      (o.note ? "Ghi chú: " + o.note + "\n" : "") +
      "------\n" + itemsText + "\n------\n" +
      "Tổng tiền hàng: " + vnd(o.total) + (o.shipping === 0 ? " — miễn phí vận chuyển\n" : " (chờ xác nhận phí vận chuyển)\n") +
      (o.paymentMethod === 'COD' ? 'Thanh toán: COD — thanh toán khi nhận hàng, sau khi Hanori xác nhận đơn.' : 'Thanh toán: CHƯA THANH TOÁN — chờ Hanori xác nhận tổng tiền và hướng dẫn chuyển khoản.');
    window.__hnrOrderText = orderText;
    inner.innerHTML =
      '<div class="cart-head"><h3>Gửi yêu cầu đặt hàng</h3><button type="button" class="cart-x" data-close>' + ICON_X + "</button></div>" +
      '<div class="co-scroll co-done">' +
        '<div class="done-badge">Nội dung đã sẵn sàng <strong>' + o.code + "</strong></div>" +
        '<p class="done-lead">Bạn cần gửi nội dung bên dưới qua Zalo để Hanori nhận yêu cầu. Shop sẽ xác nhận hàng, phí vận chuyển và tổng tiền.</p>' +
        '<p><strong>' + (o.paymentMethod === 'COD' ? 'COD — thanh toán khi nhận hàng' : 'Chuyển khoản sau khi shop xác nhận') + '</strong></p>' +
        '<p class="done-lead"><strong>Tiền hàng: ' + vnd(o.total) + '</strong><br>' + (o.shipping === 0 ? 'Phí vận chuyển: 0đ — đơn đủ điều kiện miễn phí.' : 'Phí vận chuyển: chờ shop báo theo địa chỉ.') + '</p>' +
        '<div class="done-actions">' +
          '<button type="button" class="btn btn-primary btn-block" data-send="zalo">Gửi đơn qua Zalo</button>' +
          '<button type="button" class="btn btn-outline btn-block" data-send="messenger">Gửi qua Messenger</button>' +
          '<button type="button" class="btn btn-outline btn-block" data-copyorder>Sao chép nội dung đơn</button>' +
        "</div>" +
        '<details class="order-text"><summary>Xem nội dung đơn</summary><pre>' + esc(orderText) + "</pre></details>" +
        '<button type="button" class="btn btn-ghost btn-block" data-newcart>Về giỏ hàng</button>' +
      "</div>";
  }

  function submitOrder(form) {
    if (commerceBusy) return;
    var f = form.elements;
    var name = f.name.value.trim(), phone = f.phone.value.trim(), addr = f.addr.value.trim(), note = f.note.value.trim();
    if (!name || !phone || !addr) {
      [f.name, f.phone, f.addr].forEach(function (i) { i.classList.toggle("err", !i.value.trim()); });
      return;
    }
    phone = phone.replace(/[\s().-]/g, "").replace(/^\+84/, "0");
    if (!/^0[35789]\d{8}$/.test(phone)) {
      f.phone.setCustomValidity("Nhập số điện thoại di động Việt Nam hợp lệ.");
      f.phone.reportValidity();
      f.phone.addEventListener("input", function () { f.phone.setCustomValidity(""); }, { once: true });
      return;
    }
    rememberCheckout();
    if (CFG.commerceEnabled) { submitAutomaticOrder(form); return; }
    var o = {
      code: orderCode(), name: name, phone: phone, addr: addr, note: note,
      total: cartSubtotal(), shipping: cartSubtotal() >= CFG.freeShipThreshold ? 0 : null, paymentMethod: f.paymentMethod.value, createdAt: new Date().toISOString(),
      items: cart.map(function (it) { var p = byId[it.id]; var cur = variantAt(p, it.v); return { id: it.id, sku: cur.sku, name: p.name, variant: cur.name, qty: it.qty, price: cur.price }; })
    };
    lastOrder = o;
    view = "done"; renderCart();
  }

  function submitAutomaticOrder(form) {
    var f = form.elements;
    if (!f.province.value || !f.ward.value) { toast('Vui lòng chọn tỉnh/thành và phường/xã.'); return; }
    if (!form.reportValidity()) return;
    var button = form.querySelector('button[type="submit"]');
    var result = form.querySelector('[data-shipping-result]');
    var revision = checkoutRevision;
    commerceBusy = true; button.disabled = true;
    if (!shippingQuote || shippingQuote.expires <= Date.now()) {
      button.textContent = 'Đang tính phí…';
      api('/quote', { method: 'POST', body: JSON.stringify({ cart: cart, customer: checkoutDraft, paymentMethod: f.paymentMethod.value, destination: { province: f.province.value, ward: f.ward.value } }) }).then(function (quote) {
        if (revision !== checkoutRevision || !form.isConnected) return;
        shippingQuote = quote; checkoutKey = window.crypto.randomUUID();
        result.textContent = 'Tiền hàng: ' + vnd(quote.subtotal) + ' · Phí vận chuyển: ' + vnd(quote.shipping) + ' · Tổng thanh toán: ' + vnd(quote.total);
        button.textContent = quote.paymentMethod === 'COD' ? 'Đặt đơn COD — ' + vnd(quote.total) : 'Đặt hàng & thanh toán ' + vnd(quote.total);
      }).catch(function (error) { result.textContent = error.message; button.textContent = 'Thử tính phí lại'; }).finally(function () { commerceBusy = false; button.disabled = false; });
      return;
    }
    button.textContent = 'Đang lưu đơn…';
    var orderKey = checkoutKey, purchasedCart = JSON.parse(JSON.stringify(cart)), purchasedItems = analyticsItems(cart);
    api('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': orderKey }, body: JSON.stringify({ quoteId: shippingQuote.quoteId }) }).then(function (order) {
      lastOrder = Object.assign({ automatic: true, key: orderKey, purchasedCart: purchasedCart, analyticsItems: purchasedItems }, order);
      if (order.paymentMethod === 'COD') removePurchasedCart(lastOrder);
      rememberPayment();
      track('order_created', { transaction_id: order.code, value: order.total, currency: 'VND', items: purchasedItems });
      view = 'done'; renderCart();
    }).catch(function (error) { result.textContent = error.message; button.textContent = 'Thử đặt hàng lại'; }).finally(function () { commerceBusy = false; button.disabled = false; });
  }
  function rememberPayment() {
    var o = lastOrder;
    try { sessionStorage.setItem('hnr_payment', JSON.stringify({ id: o.id, key: o.key, purchasedCart: o.purchasedCart, analyticsItems: o.analyticsItems, purchaseTracked: o.purchaseTracked })); } catch (e) {}
  }
  function removePurchasedCart(o) {
    (o.purchasedCart || []).forEach(function (item) { var existing = cart.find(function (x) { return x.id === item.id && x.v === item.v; }); if (existing) existing.qty -= item.qty; });
    cart = cart.filter(function (x) { return x.qty > 0; }); saveCart(); o.purchasedCart = [];
  }
  function renderAutomaticOrder() {
    var o = lastOrder;
    var paid = o.status === 'PAID';
    var cancelled = o.status === 'CANCELLED';
    var cod = o.paymentMethod === 'COD';
    document.querySelector('.cart-inner').innerHTML = '<div class="cart-head"><h3>Đơn hàng ' + esc(o.code) + '</h3><button type="button" class="cart-x" data-close>' + ICON_X + '</button></div>' +
      '<div class="co-scroll co-done"><div class="done-badge">' + (paid ? 'Đã xác nhận thanh toán' : cod ? 'Đã ghi nhận đơn COD — chờ shop xác nhận' : cancelled ? 'Thanh toán đã hủy' : 'Đã ghi nhận đơn — chờ thanh toán') + '</div>' +
      '<p>Tiền hàng: ' + vnd(o.subtotal) + '<br>Phí vận chuyển: ' + vnd(o.shipping) + '<br><strong>Tổng thanh toán: ' + vnd(o.total) + '</strong></p>' +
      (paid ? '<p>Hanori đã nhận được xác nhận thanh toán. Shop sẽ kiểm tra hàng và chuẩn bị giao. Bạn có thể trao đổi qua Zalo kèm mã đơn ở trên.</p>' : cod ? '<p>Thanh toán <strong>' + vnd(o.total) + '</strong> cho đơn vị giao hàng khi nhận hàng. Hanori sẽ kiểm tra hàng và liên hệ xác nhận trước khi gửi. Đơn này chưa được đánh dấu đã thanh toán.</p>' : cancelled ? '<p>Đơn đã ghi nhận, giao dịch thanh toán đã hủy. Liên hệ Hanori nếu bạn cần hỗ trợ.</p>' : '<p>Thanh toán qua trang bảo mật của payOS, sau đó quay lại đây kiểm tra trạng thái.</p><a class="btn btn-primary btn-block" href="' + esc(o.checkoutUrl) + '">Thanh toán qua payOS</a><button type="button" class="btn btn-outline btn-block" data-payment-check>Kiểm tra thanh toán</button>') +
      '<p data-payment-status role="status" aria-live="polite"></p><a class="btn btn-outline btn-block" href="' + CFG.zalo + '" target="_blank" rel="noopener">Hỗ trợ qua Zalo</a><button type="button" class="btn btn-ghost btn-block" data-newcart>Về giỏ hàng</button></div>';
  }
  function checkPayment() {
    var o = lastOrder;
    if (!o || !o.automatic || commerceBusy) return;
    commerceBusy = true;
    var status = document.querySelector('[data-payment-status]');
    if (status) status.textContent = 'Đang kiểm tra giao dịch…';
    api('/orders/' + encodeURIComponent(o.id), { headers: { Authorization: 'Bearer ' + o.key } }).then(function (updated) {
      lastOrder = Object.assign(o, updated);
      if (updated.status === 'PAID') {
        // Clear only the quantities belonging to this checkout, preserving later additions.
        removePurchasedCart(o);
        if (!o.purchaseTracked) { track('purchase', { transaction_id: o.code, value: o.subtotal, currency: 'VND', shipping: o.shipping, items: o.analyticsItems || [] }); o.purchaseTracked = true; }
        rememberPayment();
      }
      view = 'done'; renderCart();
      if (updated.status === 'PENDING') document.querySelector('[data-payment-status]').textContent = 'Chưa có xác nhận tiền về. Bạn có thể kiểm tra lại sau ít phút.';
    }).catch(function (error) { if (status) status.textContent = error.message; else toast(error.message); }).finally(function () { commerceBusy = false; });
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
    return Promise.resolve();
  }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "hnr-toast"; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () { t.classList.remove("show"); setTimeout(function () { t.remove(); }, 300); }, 1900);
  }

  /* ---------- Cart button in header ---------- */
  function mountCartButton() {
    document.querySelectorAll(".header-actions").forEach(function (ha) {
      if (ha.querySelector(".cart-btn")) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "cart-btn"; b.setAttribute("aria-label", "Giỏ hàng");
      b.innerHTML = ICON_CART + '<span class="cart-count" data-cart-count>0</span>';
      var ham = ha.querySelector(".hamburger");
      ha.insertBefore(b, ham || null);
    });
  }
  function bumpCart() {
    document.querySelectorAll(".cart-btn").forEach(function (b) {
      b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    });
  }

  /* ---------- Events ---------- */
  function onClick(e) {
    var t = e.target;
    var add = t.closest("[data-add]");
    if (add) {
      var id = add.getAttribute("data-add");
      if (byId[id] && byId[id].variants) { openView(id); return; }
      addToCart(id, 0, 1); toast("Đã thêm vào giỏ"); return;
    }
    var viewBtn = t.closest("[data-view]");
    if (viewBtn) { openView(viewBtn.getAttribute("data-view")); return; }
    var cartBtn = t.closest(".cart-btn");
    if (cartBtn) { rememberCheckout(); view = "cart"; renderCart(); openOverlay(".cart-drawer"); return; }
    if (t.closest("[data-close]")) { closeAll(); return; }

    // quick view interactions
    var chip = t.closest(".pv-chip");
    if (chip) {
      pvState.v = +chip.getAttribute("data-v");
      var pp = byId[pvState.id]; var vv = pp.variants && pp.variants[pvState.v];
      if (vv && vv.vimg) pvState.mi = vv.vimg;
      renderView(); return;
    }
    var gi = t.closest("[data-gi]");
    if (gi) { pvState.mi = +gi.getAttribute("data-gi"); renderView(); return; }
    var nav = t.closest("[data-pvnav]");
    if (nav) {
      var pn = byId[pvState.id]; var tot = pn.g || 1;
      pvState.mi = ((pvState.mi - 1 + (+nav.getAttribute("data-pvnav"))) % tot + tot) % tot + 1;
      renderView();
      var act = document.querySelector(".pv-thumb.active");
      if (act && act.scrollIntoView) act.scrollIntoView({ block: "nearest", inline: "center" });
      return;
    }
    var q = t.closest("[data-q]");
    if (q) { pvState.qty = Math.min(20, Math.max(1, pvState.qty + +q.getAttribute("data-q"))); renderView(); return; }
    if (t.closest("[data-pvadd]")) { addToCart(pvState.id, pvState.v, pvState.qty); closeAll(); view = "cart"; renderCart(); openOverlay(".cart-drawer"); return; }

    // cart interactions
    var del = t.closest("[data-del]"); if (del) { setQty(+del.getAttribute("data-del"), 0); return; }
    var inc = t.closest("[data-inc]"); if (inc) { var i1 = +inc.getAttribute("data-inc"); setQty(i1, cart[i1].qty + 1); return; }
    var dec = t.closest("[data-dec]"); if (dec) { var i2 = +dec.getAttribute("data-dec"); setQty(i2, cart[i2].qty - 1); return; }
    if (t.closest("[data-checkout]")) { if (cart.length) { track('begin_checkout', { value: cartSubtotal(), currency: 'VND', items: analyticsItems(cart) }); view = "checkout"; renderCart(); } return; }
    if (t.closest("[data-back]")) { rememberCheckout(); view = "cart"; renderCart(); return; }
    if (t.closest("[data-newcart]")) { view = "cart"; renderCart(); return; }

    // done view
    if (t.closest('[data-payment-check]')) { checkPayment(); return; }
    var send = t.closest("[data-send]");
    if (send) {
      copyText(window.__hnrOrderText).then(function () {
        toast("Đã sao chép đơn — dán vào khung chat rồi gửi nhé!");
        window.open(send.getAttribute("data-send") === "zalo" ? CFG.zalo : CFG.messenger, "_blank", "noopener");
      });
      return;
    }
    if (t.closest("[data-copyorder]")) { copyText(window.__hnrOrderText).then(function () { toast("Đã sao chép nội dung đơn"); }); return; }
    var cp = t.closest("[data-copy]"); if (cp) { copyText(cp.getAttribute("data-copy")).then(function () { toast("Đã sao chép"); }); return; }
  }
  function onSubmit(e) {
    var form = e.target.closest(".co-form");
    if (!form) return;
    e.preventDefault();
    submitOrder(form);
  }

  /* ---------- CSKH chat widget ---------- */
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  function mountCSKH() {
    var w = document.createElement("div");
    w.className = "cskh";
    w.innerHTML =
      '<div class="cskh-panel" role="dialog" aria-label="Hỗ trợ khách hàng">' +
        '<div class="cskh-head">' +
          '<div class="cskh-ava">H</div>' +
          '<div class="cskh-id"><strong>Hanori · CSKH</strong><span><i class="dot"></i>Thường trả lời ngay</span></div>' +
          '<button type="button" class="cskh-x" data-cskh-close aria-label="Đóng">' + ICON_X + "</button>" +
        "</div>" +
        '<div class="cskh-body">' +
          '<div class="cskh-msg">Chào bạn 👋 Hanori có thể giúp gì cho bạn? Nhắn cho tụi mình qua kênh tiện nhất nhé!</div>' +
          '<div class="cskh-actions">' +
            '<a href="' + CFG.zalo + '" target="_blank" rel="noopener" class="cskh-btn zalo">Chat Zalo</a>' +
            '<a href="' + CFG.messenger + '" target="_blank" rel="noopener" class="cskh-btn mess">Nhắn Messenger</a>' +
            '<a href="tel:' + CFG.phone + '" class="cskh-btn call">Gọi ' + CFG.phoneDisplay + "</a>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<button type="button" class="cskh-launch" data-cskh-toggle aria-label="Hỗ trợ">' + ICON_CHAT + "</button>";
    document.body.appendChild(w);
    var open = false;
    function set(o) { open = o; w.classList.toggle("open", o); }
    w.addEventListener("click", function (e) {
      if (e.target.closest("[data-cskh-toggle]")) set(!open);
      else if (e.target.closest("[data-cskh-close]")) set(false);
    });
    document.addEventListener("click", function (e) {
      if (open && !e.target.closest(".cskh")) set(false);
    });
  }

  /* ---------- Init ---------- */
  renderGrids();
  buildShell();
  mountCartButton();
  mountCSKH();
  renderCart();
  if (CFG.commerceEnabled && new URLSearchParams(location.search).has('hanoriPayment')) {
    try {
      var pendingPayment = JSON.parse(sessionStorage.getItem('hnr_payment'));
      if (pendingPayment && pendingPayment.id && pendingPayment.key) {
        lastOrder = Object.assign({ automatic: true }, pendingPayment);
        openOverlay('.cart-drawer'); checkPayment();
      }
    } catch (e) {}
  }
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
})();
