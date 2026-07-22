(function () {
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.hidden = window.scrollY < 500;
    });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  var CONSENT_KEY = 'radar-ia-cookie-consent';

  function loadAdsense() {
    var client = window.__ADSENSE_CLIENT__;
    if (!client || client.indexOf('0000000000000000') !== -1) return;
    if (document.querySelector('script[data-adsense-loader]')) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + client;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-adsense-loader', '1');
    document.head.appendChild(script);
    script.onload = function () {
      document.querySelectorAll('ins.adsbygoogle').forEach(function () {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          /* no-op: ad blocker or slow network */
        }
      });
    };
  }

  var banner = document.getElementById('cookieBanner');
  var consent = null;
  try {
    consent = localStorage.getItem(CONSENT_KEY);
  } catch (e) {
    consent = null;
  }

  if (consent === 'accepted') {
    loadAdsense();
  } else if (!consent && banner) {
    banner.hidden = false;
  }

  var acceptBtn = document.getElementById('cookieAccept');
  var rejectBtn = document.getElementById('cookieReject');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function () {
      try {
        localStorage.setItem(CONSENT_KEY, 'accepted');
      } catch (e) {}
      if (banner) banner.hidden = true;
      loadAdsense();
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', function () {
      try {
        localStorage.setItem(CONSENT_KEY, 'rejected');
      } catch (e) {}
      if (banner) banner.hidden = true;
    });
  }
})();
