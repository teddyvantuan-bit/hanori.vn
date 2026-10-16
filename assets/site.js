/* Shared navigation and content behavior. Product/checkout state belongs to shop.js. */
(function () {
  'use strict';
  var header = document.querySelector('.site-header');
  var hamburger = document.querySelector('.hamburger');
  var menu = document.querySelector('.mobile-nav');
  function closeMenu(restoreFocus) {
    if (!menu) return;
    var wasOpen = menu.classList.contains('open');
    menu.classList.remove('open'); menu.inert = true;
    menu.setAttribute('aria-hidden', 'true');
    if (hamburger) { hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded','false'); }
    document.body.style.overflow = '';
    if (restoreFocus && wasOpen && hamburger) hamburger.focus();
  }
  if (menu && hamburger) {
    menu.id = menu.id || 'mobile-navigation';
    hamburger.setAttribute('aria-controls', menu.id);
    closeMenu(false);
    hamburger.addEventListener('click', function () {
      if (menu.classList.contains('open')) return closeMenu(true);
      menu.inert = false; menu.setAttribute('aria-hidden','false'); menu.classList.add('open');
      hamburger.classList.add('open'); hamburger.setAttribute('aria-expanded','true');
      document.body.style.overflow = 'hidden';
      var first = menu.querySelector('a'); if (first) first.focus();
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(false); });
    document.addEventListener('hanori:overlay', function () { closeMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
      if (e.key !== 'Tab') return;
      var items = Array.from(menu.querySelectorAll('a,button')).filter(function (el) { return el.getClientRects().length && !el.disabled; });
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); hamburger.focus(); }
      else if (!e.shiftKey && document.activeElement === items[items.length-1]) { e.preventDefault(); hamburger.focus(); }
      else if (document.activeElement === hamburger && e.shiftKey) { e.preventDefault(); items[items.length-1].focus(); }
    });
    window.matchMedia('(min-width: 1050px)').addEventListener('change', function(e) { if (e.matches) closeMenu(false); });
  }
  // Search is available without opening the menu.
  var actions = document.querySelector('.header-actions');
  if (actions && !actions.querySelector('.header-search')) {
    var search = document.createElement('a');
    search.className='header-search'; search.href='/san-pham/?focus=search'; search.setAttribute('aria-label','Tìm sản phẩm');
    search.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
    actions.insertBefore(search, actions.querySelector('.cart-btn') || actions.firstChild);
  }
  function insertNews(nav) {
    if (!nav || nav.querySelector('a[href="/tin-tuc/"]')) return;
    var ref=nav.querySelector('a[href="/lien-he/"]') || nav.querySelector('a[href="/san-pham/"]');
    if (!ref) return;
    var a=document.createElement('a'); a.href='/tin-tuc/'; a.textContent='Tin tức'; ref.after(a);
  }
  document.querySelectorAll('.main-nav,.mobile-nav,.footer-col-links').forEach(insertNews);
  var here=location.pathname.replace(/\/index\.html$/,'/');
  document.querySelectorAll('.main-nav a,.mobile-nav a').forEach(function(a) {
    var path=a.getAttribute('href');
    if (path===here || (path==='/san-pham/' && here.startsWith('/san-pham/')) || (path==='/tin-tuc/' && here.startsWith('/tin-tuc/'))) {
      a.classList.add('active'); a.setAttribute('aria-current','page');
    }
  });
  document.querySelectorAll('.nav-dropdown').forEach(function(dropdown) {
    var button=dropdown.querySelector('.nav-dropdown-toggle'); if (!button) return;
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',function() { button.setAttribute('aria-expanded', String(dropdown.classList.toggle('open'))); });
    dropdown.addEventListener('keydown',function(e) { if(e.key==='Escape') { dropdown.classList.remove('open');button.setAttribute('aria-expanded','false');button.focus(); } });
  });
  document.addEventListener('click',function(e) {
    document.querySelectorAll('.nav-dropdown.open').forEach(function(dropdown) { if(!dropdown.contains(e.target)) { dropdown.classList.remove('open');dropdown.querySelector('button').setAttribute('aria-expanded','false'); } });
  });
  document.querySelectorAll('.mobile-nav-toggle').forEach(function(button) {
    var target=document.getElementById(button.dataset.target); if(!target) return;
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',function() { button.setAttribute('aria-expanded',String(target.classList.toggle('open')));button.classList.toggle('open'); });
  });
  document.querySelectorAll('.footer-col-toggle').forEach(function(button) {
    var target=button.nextElementSibling; if(!target) return;
    var mobileFooter=window.matchMedia('(max-width: 640px)');
    function syncFooter() { var open=!mobileFooter.matches || target.classList.contains('open');target.inert=!open;button.setAttribute('aria-expanded',String(open)); }
    syncFooter();
    mobileFooter.addEventListener('change',syncFooter);
    button.addEventListener('click',function() { var open=target.classList.toggle('open');button.classList.toggle('open',open);syncFooter(); });
  });
  document.querySelectorAll('.milestone-tab[data-milestone]').forEach(function(tab) {
    tab.addEventListener('click',function() {
      document.querySelectorAll('.milestone-tab').forEach(function(t){t.classList.toggle('active',t===tab);});
      document.querySelectorAll('.milestone-panel').forEach(function(panel){panel.style.display=panel.dataset.milestone===tab.dataset.milestone?'':'none';});
    });
  });
  // Content is immediately readable, including with reduced motion or slow images.
  document.querySelectorAll('.reveal,.word-reveal,.values-grid,.commit-list,.product-grid,.stat-grid,.trust-grid,.hero-chips,.category-grid').forEach(function(el){el.classList.add('in-view');});
  var loader=document.getElementById('__hnr_loading'); if(loader) loader.remove();
  if (!document.getElementById('main-content')) {
    var main=document.querySelector('main,.page-hero,section'); if(main) main.id='main-content';
  }
  document.querySelectorAll('.skip-link').forEach(function(link){link.addEventListener('click',function(){var main=document.getElementById('main-content');if(main){main.tabIndex=-1;main.focus();}});});
  document.querySelectorAll('a[href*="zalo.me"]').forEach(function(a){if(!a.textContent.trim())a.setAttribute('aria-label','Chat Zalo với Hanori');});
  if(header) header.classList.add('storefront-header');
})();
