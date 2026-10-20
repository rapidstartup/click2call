import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const VIBEDASH_PROJECT_ID = '179d870c-9043-4e64-95de-151edc007198';

declare global {
  interface Window {
    VibeDashRoadmap?: { init: (config: Record<string, unknown>) => void };
  }
}

const RoadmapPage = () => {
  useEffect(() => {
    const init = () =>
      window.VibeDashRoadmap?.init({
        projectId: VIBEDASH_PROJECT_ID,
        displayMode: 'inline',
        containerId: 'vibedash-roadmap',
        theme: 'auto',
      });
    if (window.VibeDashRoadmap) {
      init();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://vibedash.app/embed-roadmap.js"]'
    );
    if (existing) {
      existing.addEventListener('load', init, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://vibedash.app/embed-roadmap.js';
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  return (
    <main className="min-h-screen bg-surface px-4 py-xl sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-sm font-semibold text-signal">
          <Link to="/" className="hover:text-signal/80">Click2Call.ai</Link>
        </p>
        <h1 className="mb-6 mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">Roadmap</h1>
        <div id="vibedash-roadmap" style={{ width: '100%', minHeight: 700 }} />
      </div>
    </main>
  );
};

export default RoadmapPage;
