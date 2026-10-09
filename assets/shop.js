/* ============================================================
   Hanori — cửa hàng: giỏ hàng, quick-view, thanh toán VietQR
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
  function qrUrl(amount, info) {
    return "https://img.vietqr.io/image/" + CFG.bankBin + "-" + CFG.accountNo + "-compact2.png" +
      "?amount=" + encodeURIComponent(amount) +
      "&addInfo=" + encodeURIComponent(info) +
      "&accountName=" + encodeURIComponent(CFG.accountName);
  }
  var ICON_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
  var ICON_SHOPEE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /* ---------- Cart state ---------- */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem("hnr_cart")) || []; } catch (e) { cart = []; }
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
    if (ex) ex.qty += qty; else cart.push({ id: id, v: v, qty: qty });
    saveCart(); renderCart(); bumpCart();
  }
  function setQty(idx, qty) {
    if (qty <= 0) cart.splice(idx, 1); else cart[idx].qty = qty;
    saveCart(); renderCart();
  }

  /* ---------- Product card ---------- */
  function cardHTML(p) {
    var badge = p.badge ? '<span class="product-badge">' + esc(p.badge) + "</span>" : "";
    var priceBlock, cta;
    if (p.contactOnly) {
      priceBlock = '<div class="product-price"><span class="pp-contact">Liên hệ báo giá</span></div>';
      cta =
        '<a href="' + CFG.zalo + '" target="_blank" rel="noopener" class="btn btn-primary btn-block btn-sm">Liên hệ báo giá</a>' +
        '<a href="' + CFG.shopee + '" target="_blank" rel="noopener" class="btn btn-outline btn-block btn-sm btn-shopee">' + ICON_SHOPEE + ' Mua trên Shopee</a>';
    } else {
      var mp = minPrice(p);
      var hasVar = !!p.variants;
      var orig = hasVar ? 0 : p.orig;
      priceBlock =
        '<div class="product-price">' +
        (hasVar ? '<span class="pp-from">từ</span> ' : "") +
        '<span class="pp-now">' + vnd(mp) + "</span>" +
        (orig && orig > mp ? '<span class="pp-old">' + vnd(orig) + "</span>" : "") +
        "</div>";
      cta =
        '<button type="button" class="btn btn-primary btn-block btn-sm" data-add="' + p.id + '">' + ICON_CART + " Thêm vào giỏ</button>" +
        '<a href="' + CFG.shopee + '" target="_blank" rel="noopener" class="btn btn-outline btn-block btn-sm btn-shopee">' + ICON_SHOPEE + " Mua trên Shopee</a>";
    }
    var note = p.note ? '<span class="product-note">' + esc(p.note) + "</span>" : "";
    return (
      '<div class="product-card" data-category="' + p.cat + '">' +
        '<div class="product-thumb" data-view="' + p.id + '">' +
          badge +
          '<img src="' + p.img + '" alt="' + esc(p.name) + '" loading="lazy">' +
          '<span class="product-quickview">Xem chi tiết</span>' +
        "</div>" +
        '<div class="product-body">' +
          '<span class="product-tag">' + esc(p.tag) + "</span>" +
          '<h3 class="product-name" data-view="' + p.id + '">' + esc(p.name) + "</h3>" +
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
    var feat = document.querySelector("[data-shop-featured]");
    if (feat) {
      var ids = (feat.getAttribute("data-shop-featured") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var list = ids.length ? ids.map(function (id) { return byId[id]; }).filter(Boolean) : PRODUCTS.slice(0, 6);
      feat.innerHTML = list.map(cardHTML).join("");
    }
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
  var pvState = { id: null, v: 0, qty: 1 };
  function openView(id) {
    var p = byId[id]; if (!p) return;
    pvState = { id: id, v: 0, qty: 1 };
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
    inner.innerHTML =
      '<button type="button" class="pv-close" data-close aria-label="Đóng">' + ICON_X + "</button>" +
      '<div class="pv-media"><img src="' + p.img + '" alt="' + esc(p.name) + '"></div>' +
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
        '<div class="cart-empty"><p>Giỏ hàng đang trống.</p><a href="/san-pham.html" class="btn btn-primary">Xem sản phẩm</a></div>';
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
        '<p class="cart-ship">' + esc(CFG.shippingNote) + "</p>" +
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
          '<label>Họ và tên *<input name="name" required placeholder="Nguyễn Văn A"></label>' +
          '<label>Số điện thoại *<input name="phone" required inputmode="tel" placeholder="09xx xxx xxx"></label>' +
          '<label>Địa chỉ nhận hàng *<input name="addr" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"></label>' +
          '<label>Ghi chú<textarea name="note" rows="2" placeholder="Màu sắc, thời gian nhận, ..."></textarea></label>' +
          '<button type="submit" class="btn btn-primary btn-block">Xác nhận & hiện mã QR</button>' +
          '<p class="co-hint">Bấm xác nhận để nhận mã QR chuyển khoản và gửi đơn cho Hanori qua Zalo/Messenger.</p>' +
        "</form>" +
      "</div>";
  }

  function renderDone() {
    var o = lastOrder;
    var inner = document.querySelector(".cart-inner");
    var itemsText = o.items.map(function (x) { return "• " + x.name + (x.variant ? " (" + x.variant + ")" : "") + " x" + x.qty + " = " + vnd(x.price * x.qty); }).join("\n");
    var orderText =
      "ĐƠN HÀNG HANORI\n" +
      "Mã đơn: " + o.code + "\n" +
      "Khách: " + o.name + " - " + o.phone + "\n" +
      "Địa chỉ: " + o.addr + "\n" +
      (o.note ? "Ghi chú: " + o.note + "\n" : "") +
      "------\n" + itemsText + "\n------\n" +
      "Tổng tiền hàng: " + vnd(o.total) + " (chưa gồm ship)\n" +
      "Đã/đang chuyển khoản: " + CFG.bankName + " " + CFG.accountNo + " - " + CFG.accountName + "\n" +
      "Nội dung CK: " + o.code;
    window.__hnrOrderText = orderText;
    inner.innerHTML =
      '<div class="cart-head"><h3>Thanh toán</h3><button type="button" class="cart-x" data-close>' + ICON_X + "</button></div>" +
      '<div class="co-scroll co-done">' +
        '<div class="done-badge">✓ Đã tạo đơn <strong>' + o.code + "</strong></div>" +
        '<p class="done-lead">Quét mã QR dưới đây bằng app ngân hàng để chuyển khoản (đã điền sẵn số tiền), rồi bấm gửi đơn cho Hanori.</p>' +
        '<div class="qr-box"><img src="' + qrUrl(o.total, o.code) + '" alt="VietQR Techcombank" width="230" height="300" loading="lazy"></div>' +
        '<div class="bank-info">' +
          '<div><span>Ngân hàng</span><strong>' + CFG.bankName + "</strong></div>" +
          '<div><span>Số tài khoản</span><strong>' + CFG.accountNo + ' <button type="button" class="copy-btn" data-copy="' + CFG.accountNo + '">Sao chép</button></strong></div>' +
          '<div><span>Chủ tài khoản</span><strong>' + CFG.accountName + "</strong></div>" +
          '<div><span>Số tiền</span><strong>' + vnd(o.total) + ' <button type="button" class="copy-btn" data-copy="' + o.total + '">Sao chép</button></strong></div>' +
          '<div><span>Nội dung CK</span><strong>' + o.code + ' <button type="button" class="copy-btn" data-copy="' + o.code + '">Sao chép</button></strong></div>' +
        "</div>" +
        '<p class="done-lead"><strong>Gửi đơn cho Hanori để được xác nhận & báo phí ship:</strong></p>' +
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
    var f = form;
    var name = f.name.value.trim(), phone = f.phone.value.trim(), addr = f.addr.value.trim(), note = f.note.value.trim();
    if (!name || !phone || !addr) {
      [f.name, f.phone, f.addr].forEach(function (i) { i.classList.toggle("err", !i.value.trim()); });
      return;
    }
    var o = {
      code: orderCode(), name: name, phone: phone, addr: addr, note: note,
      total: cartSubtotal(), createdAt: new Date().toISOString(),
      items: cart.map(function (it) { var p = byId[it.id]; var cur = variantAt(p, it.v); return { id: it.id, sku: cur.sku, name: p.name, variant: cur.name, qty: it.qty, price: cur.price }; })
    };
    lastOrder = o;
    try {
      var all = JSON.parse(localStorage.getItem("hnr_orders")) || [];
      all.push(o); localStorage.setItem("hnr_orders", JSON.stringify(all));
    } catch (e) {}
    if (CFG.orderWebhook) {
      try {
        fetch(CFG.orderWebhook, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
      } catch (e) {}
    }
    view = "done"; renderCart();
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
    if (add) { addToCart(add.getAttribute("data-add"), 0, 1); toast("Đã thêm vào giỏ"); return; }
    var viewBtn = t.closest("[data-view]");
    if (viewBtn) { openView(viewBtn.getAttribute("data-view")); return; }
    var cartBtn = t.closest(".cart-btn");
    if (cartBtn) { view = "cart"; renderCart(); openOverlay(".cart-drawer"); return; }
    if (t.closest("[data-close]")) { closeAll(); return; }

    // quick view interactions
    var chip = t.closest(".pv-chip");
    if (chip) { pvState.v = +chip.getAttribute("data-v"); renderView(); return; }
    var q = t.closest("[data-q]");
    if (q) { pvState.qty = Math.max(1, pvState.qty + +q.getAttribute("data-q")); renderView(); return; }
    if (t.closest("[data-pvadd]")) { addToCart(pvState.id, pvState.v, pvState.qty); closeAll(); view = "cart"; renderCart(); openOverlay(".cart-drawer"); return; }

    // cart interactions
    var del = t.closest("[data-del]"); if (del) { setQty(+del.getAttribute("data-del"), 0); return; }
    var inc = t.closest("[data-inc]"); if (inc) { var i1 = +inc.getAttribute("data-inc"); setQty(i1, cart[i1].qty + 1); return; }
    var dec = t.closest("[data-dec]"); if (dec) { var i2 = +dec.getAttribute("data-dec"); setQty(i2, cart[i2].qty - 1); return; }
    if (t.closest("[data-checkout]")) { if (cart.length) { view = "checkout"; renderCart(); } return; }
    if (t.closest("[data-back]")) { view = "cart"; renderCart(); return; }
    if (t.closest("[data-newcart]")) { cart = []; saveCart(); view = "cart"; renderCart(); return; }

    // done view
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

  /* ---------- Init ---------- */
  renderGrids();
  buildShell();
  mountCartButton();
  renderCart();
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
})();
