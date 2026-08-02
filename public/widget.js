(function mountClick2CallWidget() {
  const script = document.currentScript;
  const widgetId = script && script.dataset ? script.dataset.widgetId : '';
  const siteKey = script && script.dataset ? script.dataset.turnstileSiteKey : '';
  if (!script || !widgetId || !siteKey) {
    console.error('Click2Call widget requires data-widget-id and data-turnstile-site-key attributes.');
    return;
  }

  const challengeContainer = document.createElement('div');
  challengeContainer.setAttribute('aria-label', 'Click2Call browser verification');

  const iframe = document.createElement('iframe');
  iframe.src = `https://click2call.ai/embed/${encodeURIComponent(widgetId)}`;
  iframe.title = 'Click2Call widget';
  iframe.allow = 'microphone';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.setAttribute('sandbox', 'allow-forms allow-same-origin allow-scripts');
  iframe.style.width = '320px';
  iframe.style.height = '520px';
  iframe.style.border = '0';
  iframe.style.background = 'transparent';
  iframe.style.maxWidth = '100%';
  iframe.loading = 'lazy';

  script.parentNode?.insertBefore(challengeContainer, script.nextSibling);
  challengeContainer.parentNode?.insertBefore(iframe, challengeContainer.nextSibling);

  let challengeWidgetId = null;
  const postChallenge = (type, token) => {
    iframe.contentWindow?.postMessage({
      type,
      widgetId,
      token,
    }, 'https://click2call.ai');
  };

  const renderChallenge = () => {
    if (!window.turnstile || challengeWidgetId) return;
    challengeWidgetId = window.turnstile.render(challengeContainer, {
      sitekey: siteKey,
      action: 'turnstile-spin-v2',
      cData: widgetId.replace(/-/g, ''),
      appearance: 'interaction-only',
      theme: 'auto',
      callback: (token) => postChallenge('click2call-turnstile-token', token),
      'expired-callback': () => postChallenge('click2call-turnstile-expired'),
      'error-callback': () => postChallenge('click2call-turnstile-error'),
    });
  };

  iframe.addEventListener('load', () => {
    if (window.turnstile) {
      renderChallenge();
      return;
    }
    const existingScript = document.querySelector('script[data-click2call-turnstile]');
    if (existingScript) {
      existingScript.addEventListener('load', renderChallenge, { once: true });
      return;
    }
    const turnstileScript = document.createElement('script');
    turnstileScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    turnstileScript.async = true;
    turnstileScript.defer = true;
    turnstileScript.dataset.click2callTurnstile = 'true';
    turnstileScript.addEventListener('load', renderChallenge, { once: true });
    document.head.appendChild(turnstileScript);
  }, { once: true });
})();
