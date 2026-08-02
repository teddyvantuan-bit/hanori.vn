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

  // ===== Motion preferences =====
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  // ===== Sticky header scroll state =====
  var siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    var onScrollHeader = function () {
      siteHeader.classList.toggle("scrolled", window.scrollY > 12);
    };
    onScrollHeader();
    window.addEventListener("scroll", onScrollHeader, { passive: true });
  }

  // ===== Reveal on scroll (sections + staggered grids) =====
  var revealTargets = document.querySelectorAll(
    ".reveal, .values-grid, .commit-list, .product-grid, .stat-grid, .trust-grid, .hero-chips"
  );
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (t) { t.classList.add("in-view"); });
  } else if (revealTargets.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          Array.prototype.forEach.call(el.children, function (child, i) {
            child.style.transitionDelay = Math.min(i * 0.07, 0.5) + "s";
          });
          requestAnimationFrame(function () { el.classList.add("in-view"); });
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach(function (t) { io.observe(t); });
  }

  // ===== Animated stat counters =====
  var statNums = document.querySelectorAll(".stat-card .num");
  if (statNums.length && !reduceMotion) {
    var animateCount = function (el) {
      var text = el.textContent.trim();
      var match = text.match(/^(\d+)(\D*)$/);
      if (!match) return;
      var target = parseInt(match[1], 10);
      var suffix = match[2];
      var start = null;
      var duration = 900;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      var statIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            animateCount(entry.target);
            statIo.unobserve(entry.target);
          });
        },
        { threshold: 0.6 }
      );
      statNums.forEach(function (el) { statIo.observe(el); });
    }
  }

  // ===== Hero image parallax tilt (desktop, fine pointer only) =====
  var heroImage = document.querySelector(".hero-image");
  if (heroImage && isFinePointer && !reduceMotion) {
    var hero = document.querySelector(".hero");
    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      heroImage.style.transform =
        "perspective(800px) rotateY(" + (px * 6) + "deg) rotateX(" + (py * -6) + "deg)";
    });
    hero.addEventListener("mouseleave", function () {
      heroImage.style.transform = "perspective(800px) rotateY(0) rotateX(0)";
    });
  }

  // ===== Magnetic buttons (subtle pull toward cursor, replaces cursor gimmick) =====
  if (isFinePointer && !reduceMotion) {
    document.querySelectorAll(".btn-primary, .contact-fab-toggle").forEach(function (el) {
      el.classList.add("btn-magnetic");
      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = "translate(" + x * 0.18 + "px, " + y * 0.18 + "px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }

  // ===== Nav dropdown (Chính sách) =====
  document.querySelectorAll(".nav-dropdown").forEach(function (dd) {
    var toggle = dd.querySelector(".nav-dropdown-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = dd.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".nav-dropdown.open").forEach(function (dd) {
      if (!dd.contains(e.target)) dd.classList.remove("open");
    });
  });

  // ===== Footer accordion (mobile) =====
  document.querySelectorAll(".footer-col-toggle").forEach(function (toggle) {
    var links = toggle.nextElementSibling;
    if (!links || !links.classList.contains("footer-col-links")) return;
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
    });
  });

  // ===== Mobile nav accordion (Chính sách) =====
  document.querySelectorAll(".mobile-nav-toggle").forEach(function (toggle) {
    var targetId = toggle.getAttribute("data-target");
    var target = document.getElementById(targetId);
    if (!target) return;
    toggle.addEventListener("click", function () {
      var open = target.classList.toggle("open");
      toggle.classList.toggle("open", open);
    });
  });

  // ===== Scroll progress bar =====
  var progressBar = document.createElement("div");
  progressBar.className = "scroll-progress";
  document.body.appendChild(progressBar);
  var onScrollProgress = function () {
    var h = document.documentElement;
    var scrollable = h.scrollHeight - h.clientHeight;
    var pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
    progressBar.style.width = pct + "%";
  };
  onScrollProgress();
  window.addEventListener("scroll", onScrollProgress, { passive: true });

  // ===== Back to top =====
  var backToTop = document.createElement("button");
  backToTop.type = "button";
  backToTop.className = "back-to-top";
  backToTop.setAttribute("aria-label", "Lên đầu trang");
  backToTop.innerHTML =
    '<svg class="ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18"></circle></svg>' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(backToTop);
  var ringCircle = backToTop.querySelector(".ring circle");
  var onScrollBackToTop = function () {
    var h = document.documentElement;
    var scrollable = h.scrollHeight - h.clientHeight;
    var pct = scrollable > 0 ? h.scrollTop / scrollable : 0;
    backToTop.classList.toggle("visible", h.scrollTop > 400);
    if (ringCircle) ringCircle.style.strokeDashoffset = String(116 - pct * 116);
  };
  onScrollBackToTop();
  window.addEventListener("scroll", onScrollBackToTop, { passive: true });
  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  // ===== Word-reveal headings =====
  document.querySelectorAll(".word-reveal").forEach(function (el) {
    var text = el.textContent;
    el.innerHTML = text
      .split(" ")
      .map(function (w) { return '<span class="word">' + w + "&nbsp;</span>"; })
      .join("");
  });
  var wordRevealTargets = document.querySelectorAll(".word-reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    wordRevealTargets.forEach(function (t) { t.classList.add("in-view"); });
  } else if (wordRevealTargets.length) {
    var wrIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll(".word").forEach(function (w, i) {
            w.style.transitionDelay = i * 0.05 + "s";
          });
          entry.target.classList.add("in-view");
          wrIo.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    wordRevealTargets.forEach(function (t) { wrIo.observe(t); });
  }

  // ===== Legal page scrollspy =====
  var tocLinks = document.querySelectorAll(".legal-toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var sections = Array.prototype.map.call(tocLinks, function (a) {
      return document.querySelector(a.getAttribute("href"));
    }).filter(Boolean);
    var spyIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = "#" + entry.target.id;
          tocLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === id);
          });
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach(function (s) { spyIo.observe(s); });
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
