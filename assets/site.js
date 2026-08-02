(function () {
  "use strict";

  // ===== Mobile nav toggle =====
  var hamburger = document.querySelector(".hamburger");
  var mobileNav = document.querySelector(".mobile-nav");
  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      hamburger.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        hamburger.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  // ===== Active nav link (by current page path) =====
  var here = location.pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
  document.querySelectorAll(".main-nav a, .mobile-nav a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (!href || href.indexOf("#") === 0) return;
    var path = href.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
    if (path === here) a.classList.add("active");
  });

  // ===== Product category filter (san-pham.html) =====
  var chips = document.querySelectorAll(".chip[data-category]");
  var cards = document.querySelectorAll(".product-card[data-category]");
  if (chips.length && cards.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var cat = chip.getAttribute("data-category");
        cards.forEach(function (card) {
          var show = cat === "all" || card.getAttribute("data-category") === cat;
          card.style.display = show ? "" : "none";
        });
      });
    });
  }

  // ===== Milestone tabs (gioi-thieu.html) =====
  var mTabs = document.querySelectorAll(".milestone-tab[data-milestone]");
  var mPanels = document.querySelectorAll(".milestone-panel[data-milestone]");
  if (mTabs.length && mPanels.length) {
    mTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var id = tab.getAttribute("data-milestone");
        mTabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
        mPanels.forEach(function (p) {
          p.style.display = p.getAttribute("data-milestone") === id ? "" : "none";
        });
      });
    });
  }

  // ===== Floating contact widget =====
  var fabToggle = document.querySelector(".contact-fab-toggle");
  var fabMenu = document.querySelector(".contact-fab-menu");
  if (fabToggle && fabMenu) {
    fabToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = fabMenu.classList.toggle("open");
      fabToggle.classList.toggle("open", open);
    });
    document.addEventListener("click", function (e) {
      if (!fabMenu.classList.contains("open")) return;
      if (e.target.closest(".contact-fab")) return;
      fabMenu.classList.remove("open");
      fabToggle.classList.remove("open");
    });
  }

  // ===== Loading overlay fade-out =====
  function hideLoader() {
    var el = document.getElementById("__hnr_loading");
    if (!el || el.__hidden) return;
    el.__hidden = true;
    el.style.opacity = "0";
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
  }
  window.addEventListener("load", hideLoader);
  setTimeout(hideLoader, 2500);

  // ===== aria-label pass for icon-only links =====
  function label(el, text) { if (el && !el.getAttribute("aria-label")) el.setAttribute("aria-label", text); }
  document.querySelectorAll('a[href*="facebook.com"]').forEach(function (el) { label(el, "Facebook Hanori"); });
  document.querySelectorAll('a[href*="instagram.com"]').forEach(function (el) { label(el, "Instagram Hanori"); });
  document.querySelectorAll('a[href*="zalo.me"]').forEach(function (el) { label(el, "Chat Zalo với Hanori"); });
  document.querySelectorAll('a[href*="shopee.vn"]').forEach(function (el) { if (!el.textContent.trim()) label(el, "Mua trên Shopee"); });
})();
