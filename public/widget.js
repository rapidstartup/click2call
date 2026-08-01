(function mountClick2CallWidget() {
  const script = document.currentScript;
  const widgetId = script && script.dataset ? script.dataset.widgetId : '';
  if (!script || !widgetId) {
    console.error('Click2Call widget requires a data-widget-id attribute.');
    return;
  }

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

  script.parentNode?.insertBefore(iframe, script.nextSibling);
})();
