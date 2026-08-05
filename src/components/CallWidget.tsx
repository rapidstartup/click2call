import Vapi from '@vapi-ai/web';
import { ArrowRight, CheckCircle2, Mic, Phone, PhoneOff, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

import { AudioSettings } from './AudioSettings';

export type CallWidgetMode = 'embed' | 'demo';

interface CallWidgetProps {
  acceptParentChallenge?: boolean;
  widgetId?: string;
  /** demo = homepage conversion experience; embed = customer widget */
  mode?: CallWidgetMode;
  className?: string;
  onCallStart?: () => void;
  onCallEnd?: (outcome: 'completed' | 'error' | 'cancelled') => void;
}

interface TurnstileApi {
  remove(widgetId: string): void;
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const isDev = import.meta.env.DEV;

const getSocketUrl = () => {
  if (isDev) {
    return {
      url: 'http://localhost:3002',
      options: { secure: false as const },
    };
  }
  return {
    url: import.meta.env.VITE_SOCKET_SERVER_URL || 'https://io.click2call.ai',
    options: {
      secure: true as const,
      rejectUnauthorized: false,
      path: '/socket.io/',
    },
  };
};

const { url: SOCKET_SERVER_URL, options: defaultOptions } = getSocketUrl();
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function capErrorDetails(error: unknown): { upgradeUrl: string } | null {
  const textParts: string[] = [];
  const seen = new Set<object>();
  let upgradeUrl: string | undefined;

  const visit = (value: unknown, depth: number): void => {
    if (depth > 4 || value === null || value === undefined) return;
    if (typeof value === 'string') {
      textParts.push(value);
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed !== value) visit(parsed, depth + 1);
      } catch {
        return;
      }
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      textParts.push(String(value));
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);

    const record = value as Record<string, unknown>;
    if (typeof record.upgradeUrl === 'string' && record.upgradeUrl.trim()) {
      upgradeUrl = record.upgradeUrl.trim();
    }
    if (typeof record.upgrade_url === 'string' && record.upgrade_url.trim()) {
      upgradeUrl = record.upgrade_url.trim();
    }
    if (value instanceof Error) visit(value.message, depth + 1);
    ['message', 'response', 'responseBody', 'body', 'data', 'status', 'statusCode', 'code', 'upgradeUrl', 'upgrade_url']
      .forEach((key) => visit(record[key], depth + 1));
  };

  visit(error, 0);
  const text = textParts.join(' ').toLowerCase();
  if (!text.includes('cap_reached') && !text.includes('allowance') && !text.includes('402')) {
    return null;
  }
  return { upgradeUrl: upgradeUrl || '/pricing' };
}

function getEmbeddingOrigin(): string {
  const ancestorOrigin = window.location.ancestorOrigins?.[0];
  if (ancestorOrigin) return ancestorOrigin;
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // Fall through to the hosted page origin.
    }
  }
  return window.location.origin;
}

const CallWidget: React.FC<CallWidgetProps> = ({
  acceptParentChallenge = false,
  widgetId,
  mode = 'embed',
  className = '',
  onCallStart,
  onCallEnd,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('Checking browser…');
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [embeddingOrigin, setEmbeddingOrigin] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [widgetCallToken, setWidgetCallToken] = useState<string | null>(null);
  const [hasUsedPublicCall, setHasUsedPublicCall] = useState(false);
  const [hasTriedCall, setHasTriedCall] = useState(false);
  const [showConversion, setShowConversion] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [callError, setCallError] = useState<string | null>(null);
  const [upsellUrl, setUpsellUrl] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const isCallingRef = useRef(false);
  const callAttemptRef = useRef(0);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const challengeConsumedRef = useRef(false);
  const capHandledAttemptRef = useRef(0);

  useEffect(() => {
    isCallingRef.current = isCalling;
  }, [isCalling]);

  useEffect(() => {
    if (!acceptParentChallenge || !widgetId) return;

    const receiveParentChallenge = (event: MessageEvent) => {
      if (event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
      const message = event.data as { type?: unknown; token?: unknown; widgetId?: unknown };
      if (message.widgetId !== widgetId) return;

      if (message.type === 'click2call-turnstile-token' && typeof message.token === 'string') {
        challengeConsumedRef.current = false;
        setEmbeddingOrigin(event.origin);
        setTurnstileToken(message.token);
        setStatus('Authorizing widget…');
      } else if (message.type === 'click2call-turnstile-expired') {
        setTurnstileToken(null);
        setStatus('Browser verification expired');
      } else if (message.type === 'click2call-turnstile-error') {
        setTurnstileToken(null);
        setStatus('Browser verification failed');
      }
    };

    window.addEventListener('message', receiveParentChallenge);
    setStatus('Checking browser…');
    return () => window.removeEventListener('message', receiveParentChallenge);
  }, [acceptParentChallenge, widgetId]);

  useEffect(() => {
    if (!widgetId) {
      setStatus('Demo widget is not configured');
      return;
    }
    if (acceptParentChallenge) return;
    if (!TURNSTILE_SITE_KEY) {
      setStatus('Browser verification is not configured');
      return;
    }

    let cancelled = false;
    let turnstileScript: HTMLScriptElement | null = null;
    const renderChallenge = () => {
      if (
        cancelled ||
        !window.turnstile ||
        !turnstileContainerRef.current ||
        turnstileWidgetIdRef.current
      ) {
        return;
      }
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: 'turnstile-spin-v2',
        cData: widgetId.replace(/-/g, ''),
        appearance: 'interaction-only',
        theme: 'auto',
        callback: (token: string) => {
          challengeConsumedRef.current = false;
          setEmbeddingOrigin(getEmbeddingOrigin());
          setTurnstileToken(token);
          setStatus('Authorizing widget…');
        },
        'expired-callback': () => {
          if (challengeConsumedRef.current) return;
          setTurnstileToken(null);
          setStatus('Browser verification expired');
        },
        'error-callback': () => {
          if (challengeConsumedRef.current) return;
          setTurnstileToken(null);
          setStatus('Browser verification failed');
        },
      });
    };

    if (window.turnstile) {
      renderChallenge();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-click2call-turnstile]'
      );
      const script = existingScript || document.createElement('script');
      turnstileScript = script;
      script.addEventListener('load', renderChallenge);
      if (!existingScript) {
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.click2callTurnstile = 'true';
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      turnstileScript?.removeEventListener('load', renderChallenge);
      const challengeId = turnstileWidgetIdRef.current;
      if (challengeId && window.turnstile) window.turnstile.remove(challengeId);
      turnstileWidgetIdRef.current = null;
    };
  }, [acceptParentChallenge, widgetId]);

  useEffect(() => {
    let connectedSocket: Socket | null = null;
    let cancelled = false;

    const connectSocket = async () => {
      if (!widgetId) {
        setStatus('Demo widget is not configured');
        return;
      }
      if (!turnstileToken || !embeddingOrigin) return;

      const tokenResponse = await fetch(
        `${SOCKET_SERVER_URL}/widget-call-token/${encodeURIComponent(widgetId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeddingOrigin, turnstileToken }),
        }
      );
      if (!tokenResponse.ok) throw new Error('Unable to authorize this widget');
      const tokenPayload = (await tokenResponse.json()) as { token?: unknown };
      if (typeof tokenPayload.token !== 'string') {
        throw new Error('Widget authorization response was invalid');
      }
      if (cancelled) return;

      setWidgetCallToken(tokenPayload.token);
      challengeConsumedRef.current = true;
      const challengeId = turnstileWidgetIdRef.current;
      if (!acceptParentChallenge && challengeId && window.turnstile) {
        window.turnstile.remove(challengeId);
      }
      turnstileWidgetIdRef.current = null;

      connectedSocket = io(SOCKET_SERVER_URL, {
        ...defaultOptions,
        auth: { widgetToken: tokenPayload.token },
        transports: ['websocket', 'polling'] as string[],
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        upgrade: true,
        autoConnect: true,
      });

      connectedSocket.on('connect', () => {
        setIsConnected(true);
        setStatus(mode === 'demo' ? 'Ready — talk to our AI demo' : 'Ready');
      });
      connectedSocket.on('disconnect', () => {
        setIsConnected(false);
        if (!isCallingRef.current) setStatus('Reconnecting…');
      });
      connectedSocket.on('connect_error', () => {
        setIsConnected(false);
        setStatus('Connection error. Retrying…');
      });
      connectedSocket.on('error', () => {
        setIsConnected(false);
        setStatus('Connection error occurred');
      });
      connectedSocket.on('call-status', (data: { status: string; message: string }) => {
        setStatus(data.message);
      });
      connectedSocket.on('call-established', () => {
        setStatus(mode === 'demo' ? 'You are live with Clicko' : 'Call connected');
        setIsCalling(true);
      });
      connectedSocket.on('call-ended', () => setIsCalling(false));

      setSocket(connectedSocket);
    };

    void connectSocket().catch((error: unknown) => {
      console.error('Widget connection failed:', error);
      setStatus('Unable to connect this widget');
      setIsConnected(false);
      const challengeId = turnstileWidgetIdRef.current;
      if (!acceptParentChallenge && challengeId && window.turnstile) {
        window.turnstile.reset(challengeId);
      }
      setTurnstileToken(null);
    });

    return () => {
      cancelled = true;
      setWidgetCallToken(null);
      connectedSocket?.close();
    };
  }, [acceptParentChallenge, embeddingOrigin, mode, turnstileToken, widgetId]);

  const finishCall = useCallback(
    (outcome: 'completed' | 'error' | 'cancelled', message?: string) => {
      const vapi = vapiRef.current;
      vapiRef.current = null;
      if (vapi) {
        try {
          vapi.stop();
        } catch {
          // The provider session may already be closed.
        }
      }

      if (socket?.connected) {
        socket.emit('signal', {
          type: 'call-end',
          timestamp: Date.now(),
          widgetId,
        });
      }

      setIsCalling(false);
      setHasTriedCall(true);
      if (outcome === 'error') {
        setCallError(message || 'Call failed. Please reload and try again.');
        setStatus('Could not complete call');
      } else {
        setCallError(null);
        setStatus(mode === 'demo' ? 'Demo complete — claim your widget' : 'Call ended');
      }
      if (mode === 'demo') setShowConversion(true);
      onCallEnd?.(outcome);
    },
    [mode, onCallEnd, socket, widgetId]
  );

  const handleCapReached = useCallback((error: unknown, attemptId: number): boolean => {
    const details = capErrorDetails(error);
    if (!details) return false;
    if (capHandledAttemptRef.current === attemptId) return true;
    capHandledAttemptRef.current = attemptId;

    const vapi = vapiRef.current;
    vapiRef.current = null;
    if (vapi) {
      try {
        vapi.stop();
      } catch {
        void 0;
      }
    }
    if (socket?.connected) {
      socket.emit('signal', {
        type: 'call-end',
        timestamp: Date.now(),
        widgetId,
      });
    }
    setIsCalling(false);
    setHasTriedCall(true);
    setCallError(null);
    setShowConversion(false);
    setUpsellUrl(details.upgradeUrl);
    setStatus('Monthly allowance reached');
    onCallEnd?.('error');
    return true;
  }, [onCallEnd, socket, widgetId]);

  const startCall = async () => {
    if (!socket || !isConnected || !widgetCallToken || !widgetId || hasUsedPublicCall) return;
    const attemptId = ++callAttemptRef.current;

    try {
      setHasUsedPublicCall(true);
      setHasTriedCall(true);
      setCallError(null);
      setUpsellUrl(null);
      capHandledAttemptRef.current = 0;
      setShowConversion(false);
      setIsCalling(true);
      setStatus('Connecting you…');
      onCallStart?.();

      socket.once('vapi-config', async (config: { assistantId: string }) => {
        if (attemptId !== callAttemptRef.current) return;
        try {
          // Route the Web SDK through Click2Call. The short-lived widget token
          // is the only credential the browser receives.
          const vapi = new Vapi(widgetCallToken, `${SOCKET_SERVER_URL}/vapi-proxy`);
          vapiRef.current = vapi;
          vapi.on('call-end', () => {
            if (attemptId === callAttemptRef.current && capHandledAttemptRef.current !== attemptId) {
              finishCall('completed');
            }
          });
          vapi.on('error', (error: Error) => {
            console.error('VAPI call error:', error);
            if (attemptId === callAttemptRef.current) {
              if (!handleCapReached(error, attemptId)) {
                finishCall('error', 'Voice session failed. Check mic permissions and reload to retry.');
              }
            }
          });

          const call = await vapi.start(config.assistantId);
          if (attemptId !== callAttemptRef.current) return;
          if (!call) throw new Error('Failed to start VAPI call');
          setStatus(mode === 'demo' ? 'You are live with Clicko' : 'Call connected');
        } catch (error: unknown) {
          console.error('Error initializing VAPI:', error);
          if (attemptId === callAttemptRef.current) {
            if (!handleCapReached(error, attemptId)) {
              finishCall('error', 'Could not start the AI assistant. Please reload and try again.');
            }
          }
        }
      });

      // Register the response listener before emitting so a fast server reply
      // cannot be lost.
      socket.emit('signal', {
        type: 'call-start',
        timestamp: Date.now(),
        widgetId,
      });

      window.setTimeout(() => {
        if (
          attemptId === callAttemptRef.current &&
          isCallingRef.current &&
          !vapiRef.current
        ) {
          finishCall('error', 'No assistant configuration received. Please reload and try again.');
        }
      }, 15000);
    } catch (error: unknown) {
      console.error('Error starting call:', error);
      finishCall('error', 'Failed to start call');
    }
  };

  const handleDeviceSelect = (type: 'input' | 'output', deviceId: string) => {
    console.log(`Selected ${type} device: ${deviceId}`);
  };

  const signupHref = leadEmail.trim()
    ? `/signup?email=${encodeURIComponent(leadEmail.trim())}&from=demo`
    : '/signup?from=demo';
  const isDemo = mode === 'demo';

  return (
     <div
       className={[
         'w-full max-w-[360px] overflow-hidden rounded-widget border border-border bg-paper shadow-xl',
         className,
       ].join(' ')}
     >
       <div className="h-1.5 bg-signal" />
      <div className="p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
             <div
               className={[
                 'flex h-11 w-11 items-center justify-center rounded-full',
                 isCalling
                   ? 'animate-pulse bg-success'
                   : isConnected
                     ? 'bg-signal'
                     : 'bg-border',
               ].join(' ')}
             >
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
               <h2 className="text-lg font-semibold leading-tight text-ink">
                 {isDemo ? 'Live demo' : 'Click2Call'}
               </h2>
               <p className="mt-0.5 text-xs text-muted">
                 {isDemo ? 'Talk to Clicko, our AI host' : 'Web calling widget'}
               </p>
            </div>
          </div>
        </div>

         <div className="mb-5 rounded-widget bg-surface px-4 py-3 text-center ring-1 ring-border">
           <div
             ref={turnstileContainerRef}
             className="cf-turnstile"
             data-action="turnstile-spin-v2"
           />
           <p className="text-sm font-medium text-ink">{status}</p>
           {isDemo && isConnected && !showConversion && !hasUsedPublicCall && !callError && (
             <div className="mt-2.5 flex items-center justify-center gap-1.5" aria-hidden="true">
               {[14, 22, 28, 22, 14].map((height, index) => (
                 <span
                   key={index}
                   className={[
                     'c2c-wave-bar block w-1 rounded-full bg-live',
                     isCalling ? 'c2c-wave-bar-active' : '',
                   ].join(' ')}
                   style={{ height, animationDelay: `${index * 0.14}s` }}
                 />
               ))}
             </div>
           )}
           {!isDemo && isConnected && !isCalling && !showConversion && !hasUsedPublicCall && (
             <p className="mt-1 text-xs text-muted">Press the call button to start</p>
           )}
           {callError && <p className="mt-2 text-xs text-error">{callError}</p>}
           {upsellUrl && (
             <div className='mt-3 rounded-card bg-surface p-3 text-left ring-1 ring-border'>
               <p className='text-xs font-semibold text-ink'>
                 This site's monthly call allowance is reached.
               </p>
               <a
                 href={upsellUrl}
                 target='_blank'
                 rel='noreferrer'
                 className='mt-2 inline-flex items-center gap-1 text-xs font-semibold text-signal hover:text-signal/80'
               >
                 Upgrade to keep calling
                 <ArrowRight className='h-3.5 w-3.5' />
               </a>
             </div>
           )}
         </div>

          <div className="mb-4">
            <div className="relative group">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-card border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface"
                onClick={() => setShowAudioSettings((value) => !value)}
              >
                <Mic className="h-3.5 w-3.5" />
                {showAudioSettings ? 'Hide audio settings' : 'Speaker / mic settings'}
              </button>
              {isDemo && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[240px] -translate-x-1/2 rounded-control bg-ink px-2.5 py-1.5 text-center text-[11px] leading-relaxed text-paper opacity-0 shadow-lg transition-opacity duration-short group-hover:opacity-100 sm:block"
                >
                  Allow microphone access when prompted — it takes about 10 seconds
                </span>
              )}
            </div>
           {showAudioSettings && (
             <div className="mt-3 overflow-hidden rounded-card border border-border">
               <AudioSettings onDeviceSelect={handleDeviceSelect} />
             </div>
           )}
         </div>

         {!showConversion && (
           <div className="flex justify-center">
             {!isCalling ? (
               <button
                 type="button"
                 onClick={startCall}
                 disabled={!isConnected || !widgetId || hasUsedPublicCall}
                 className={[
                   'flex w-full items-center justify-center gap-2 rounded-widget px-4 py-3 text-sm font-semibold transition-all',
                   !isConnected || !widgetId || hasUsedPublicCall
                     ? 'cursor-not-allowed bg-border text-muted'
                     : 'bg-signal text-paper shadow-md shadow-signal/25 hover:bg-signal/90 hover:shadow-lg hover:shadow-signal/30 active:scale-[0.99]',
                 ].join(' ')}
               >
                 <Phone className="h-4 w-4" />
                 {hasUsedPublicCall
                   ? 'Call completed'
                   : isDemo
                     ? 'Try free demo call'
                     : 'Start Call'}
               </button>
             ) : (
               <button
                 type="button"
                 onClick={() => finishCall('cancelled')}
                 className="flex w-full items-center justify-center gap-2 rounded-widget bg-error px-4 py-3 text-sm font-semibold text-paper shadow-md shadow-error/20 transition-all hover:bg-error/90"
               >
                 <PhoneOff className="h-4 w-4" />
                 End call
               </button>
             )}
           </div>
         )}

         {isDemo && showConversion && (
           <div className="mt-1 space-y-4">
             <div className="rounded-widget bg-surface p-4 ring-1 ring-border">
               <div className="flex items-start gap-2.5">
                 <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
                 <div>
                   <p className="text-sm font-semibold text-ink">
                     {callError ? 'Still want your own widget?' : 'That was your site, with AI answering.'}
                   </p>
                   <p className="mt-1 text-xs leading-relaxed text-muted">
                     Embed the same click-to-call experience on your site in minutes. Free to
                     start — no international toll-free numbers required.
                   </p>
                 </div>
               </div>
             </div>

             <form
               className="space-y-3"
               onSubmit={(event) => {
                 event.preventDefault();
                 window.location.href = signupHref;
               }}
             >
               <label htmlFor="demo-email" className="sr-only">
                 Work email
               </label>
               <input
                 id="demo-email"
                 type="email"
                 required
                 autoComplete="email"
                 placeholder="Work email"
                 value={leadEmail}
                 onChange={(event) => setLeadEmail(event.target.value)}
                 className="w-full rounded-widget border border-border px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
               />
               <button
                 type="submit"
                 className="flex w-full items-center justify-center gap-2 rounded-widget bg-signal px-4 py-3 text-sm font-semibold text-paper shadow-md shadow-signal/25 transition-all hover:bg-signal/90"
               >
                 <Sparkles className="h-4 w-4" />
                 Get my free widget
                 <ArrowRight className="h-4 w-4" />
               </button>
             </form>

             <div className="flex items-center justify-between gap-2 text-xs">
               <button
                 type="button"
                 onClick={() => window.location.reload()}
                 className="font-medium text-muted hover:text-ink"
               >
                 Reload demo
               </button>
               <Link to="/pricing" className="font-medium text-signal hover:text-signal/80">
                 See pricing
               </Link>
             </div>
           </div>
         )}

         {isDemo && !showConversion && !isCalling && !hasTriedCall && (
           <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
             After the demo you can create a free account and embed your own widget.
           </p>
         )}

         {!isDemo && (
           <p className="mt-4 text-center text-[11px] text-muted">
             Powered by{' '}
             <a
               href="https://click2call.ai"
               className="font-medium text-signal hover:underline"
               target="_blank"
               rel="noreferrer"
             >
               click2call.ai
             </a>
           </p>
         )}
      </div>
    </div>
  );
};

export default CallWidget;
