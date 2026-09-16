'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

function readConsent(): ConsentState {
  try {
    const consent = localStorage.getItem('cookie_consent');
    if (consent === 'all') return { analytics: true, marketing: true };
    if (consent === 'custom') {
      const raw = localStorage.getItem('cookie_config');
      const config = raw ? JSON.parse(raw) : {};
      return { analytics: !!config.analytics, marketing: !!config.marketing };
    }
    return { analytics: false, marketing: false };
  } catch {
    return { analytics: false, marketing: false };
  }
}

// Loads non-essential trackers (GA4, Metricool, Google AdSense) only once the
// visitor has actually granted the matching cookie category, per the cookie
// preferences panel in the footer. Revoking a previously granted category is
// handled by CookieBanner forcing a reload, since these scripts don't expose
// a reliable way to unload themselves once they've run.
export function ConsentScripts() {
  const [consent, setConsent] = useState<ConsentState>({ analytics: false, marketing: false });

  useEffect(() => {
    setConsent(readConsent());
    const onUpdate = () => setConsent(readConsent());
    window.addEventListener('cookie-consent-updated', onUpdate);
    return () => window.removeEventListener('cookie-consent-updated', onUpdate);
  }, []);

  return (
    <>
      {consent.analytics && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-1NQYDLFL5K"
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-1NQYDLFL5K');`}
          </Script>
          <Script
            src="https://tracker.metricool.com/resources/be.js"
            strategy="afterInteractive"
          />
          <Script id="metricool-init" strategy="afterInteractive">
            {`(function () {
  var tries = 0;
  var maxTries = 20;
  function initMetricool() {
    if (window.beTracker && typeof window.beTracker.t === 'function') {
      window.beTracker.t({ hash: 'e35a301a11e6a0c6fd2c3f6f77ea4522' });
      return;
    }
    tries += 1;
    if (tries < maxTries) {
      setTimeout(initMetricool, 250);
    }
  }
  initMetricool();
})();`}
          </Script>
        </>
      )}
      {consent.marketing && (
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6875978505250043"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
