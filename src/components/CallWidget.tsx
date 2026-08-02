import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, PhoneOff, Mic, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import { AudioSettings } from './AudioSettings';
import Vapi from '@vapi-ai/web';

export type CallWidgetMode = 'embed' | 'demo';

interface CallWidgetProps {
  widgetId: string;
  /** demo = homepage conversion experience; embed = customer widget */
  mode?: CallWidgetMode;
  className?: string;
  onCallStart?: () => void;
  onCallEnd?: (outcome: 'completed' | 'error' | 'cancelled') => void;
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
    url: 'https://io.click2call.ai',
    options: {
      secure: true as const,
      rejectUnauthorized: false,
      path: '/socket.io/',
    },
  };
};

const { url: SOCKET_SERVER_URL, options: defaultOptions } = getSocketUrl();

const CallWidget: React.FC<CallWidgetProps> = ({
  widgetId,
  mode = 'embed',
  className = '',
  onCallStart,
  onCallEnd,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('Connecting…');
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [hasTriedCall, setHasTriedCall] = useState(false);
  const [showConversion, setShowConversion] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [callError, setCallError] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const isCallingRef = useRef(false);
  const callAttemptRef = useRef(0);

  useEffect(() => {
    isCallingRef.current = isCalling;
  }, [isCalling]);

  useEffect(() => {
    const socketOptions = {
      ...defaultOptions,
      transports: ['websocket', 'polling'] as string[],
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      autoConnect: true,
    };

    const newSocket = io(SOCKET_SERVER_URL, socketOptions);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setStatus(mode === 'demo' ? 'Ready — talk to our AI demo' : 'Ready');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      if (!isCallingRef.current) {
        setStatus('Reconnecting…');
      }
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
      setStatus('Connection error. Retrying…');
    });

    newSocket.on('error', () => {
      setIsConnected(false);
      setStatus('Connection error occurred');
    });

    newSocket.on('call-status', (data: { status: string; message: string }) => {
      setStatus(data.message);
    });

    newSocket.on('call-established', () => {
      setStatus(mode === 'demo' ? 'You are live with Clicko' : 'Call connected');
      setIsCalling(true);
    });

    newSocket.on('call-ended', () => {
      setIsCalling(false);
    });

    setSocket(newSocket);

    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {
          /* ignore */
        }
        vapiRef.current = null;
      }
      newSocket.close();
    };
  }, [mode]);

  const finishCall = useCallback(
    (outcome: 'completed' | 'error' | 'cancelled', message?: string) => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {
          /* ignore */
        }
        vapiRef.current = null;
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
        setCallError(message || 'Call failed. Try again or create your free account.');
        setStatus('Could not complete call');
      } else {
        setCallError(null);
        setStatus(
          mode === 'demo'
            ? 'Demo complete — claim your widget'
            : outcome === 'cancelled'
              ? 'Call ended'
              : 'Call ended'
        );
      }

      if (mode === 'demo') {
        setShowConversion(true);
      }

      onCallEnd?.(outcome);
    },
    [mode, onCallEnd, socket, widgetId]
  );

  const startCall = async () => {
    if (!socket || !isConnected || isCalling) return;

    const attemptId = ++callAttemptRef.current;

    try {
      setCallError(null);
      setShowConversion(false);
      setIsCalling(true);
      setStatus('Connecting you…');
      setHasTriedCall(true);
      onCallStart?.();

      socket.emit('signal', {
        type: 'call-start',
        timestamp: Date.now(),
        widgetId,
      });

      socket.once(
        'vapi-config',
        async (config: { apiKey: string; assistantId: string }) => {
          if (attemptId !== callAttemptRef.current) return;
          try {
            const vapi = new Vapi(config.apiKey);
            vapiRef.current = vapi;

            vapi.on('call-end', () => {
              if (attemptId === callAttemptRef.current) {
                finishCall('completed');
              }
            });

            vapi.on('error', (error: Error) => {
              console.error('VAPI call error:', error);
              if (attemptId === callAttemptRef.current) {
                finishCall(
                  'error',
                  'Voice session failed. Check mic permissions and try again.'
                );
              }
            });

            const call = await vapi.start(config.assistantId);
            if (attemptId !== callAttemptRef.current) return;
            if (!call) {
              throw new Error('Failed to start VAPI call');
            }

            setStatus(mode === 'demo' ? 'You are live with Clicko' : 'Call connected');
          } catch (error: unknown) {
            console.error('Error initializing VAPI:', error);
            if (attemptId === callAttemptRef.current) {
              finishCall(
                'error',
                'Could not start the AI assistant. Please try again in a moment.'
              );
            }
          }
        }
      );

      // If the server never returns vapi-config, surface after a timeout
      window.setTimeout(() => {
        if (
          attemptId === callAttemptRef.current &&
          isCallingRef.current &&
          !vapiRef.current
        ) {
          finishCall('error', 'No assistant configuration received. Please try again.');
        }
      }, 15000);
    } catch (error: unknown) {
      console.error('Error starting call:', error);
      finishCall('error', 'Failed to start call');
    }
  };

  const endCall = () => {
    finishCall('cancelled');
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
        'w-full max-w-[360px] rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 overflow-hidden',
        className,
      ].join(' ')}
    >
      {/* Top accent */}
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={[
                'flex h-11 w-11 items-center justify-center rounded-full',
                isCalling
                  ? 'bg-emerald-500 animate-pulse'
                  : isConnected
                    ? 'bg-blue-600'
                    : 'bg-slate-300',
              ].join(' ')}
            >
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                {isDemo ? 'Live demo' : 'Click2Call'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isDemo ? 'Talk to Clicko, our AI host' : 'Web calling widget'}
              </p>
            </div>
          </div>
          {isDemo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          )}
        </div>

        {/* Status */}
        <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-center ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-800">{status}</p>
          {isConnected && !isCalling && !showConversion && (
            <p className="mt-1 text-xs text-slate-500">
              {isDemo
                ? 'Allow microphone access when prompted — it takes ~10 seconds'
                : 'Press the call button to start'}
            </p>
          )}
          {callError && (
            <p className="mt-2 text-xs text-red-600">{callError}</p>
          )}
        </div>

        {/* Audio settings — collapsed by default */}
        <div className="mb-4">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={() => setShowAudioSettings((v) => !v)}
          >
            <Mic className="h-3.5 w-3.5" />
            {showAudioSettings ? 'Hide audio settings' : 'Speaker / mic settings'}
          </button>
          {showAudioSettings && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <AudioSettings onDeviceSelect={handleDeviceSelect} />
            </div>
          )}
        </div>

        {/* Call controls */}
        {!showConversion && (
          <div className="flex justify-center">
            {!isCalling ? (
              <button
                type="button"
                onClick={startCall}
                disabled={!isConnected}
                className={[
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                  !isConnected
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                    : 'bg-blue-600 text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.99]',
                ].join(' ')}
              >
                <Phone className="h-4 w-4" />
                {isDemo ? 'Try free demo call' : 'Start Call'}
              </button>
            ) : (
              <button
                type="button"
                onClick={endCall}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/20 hover:bg-red-700 transition-all"
              >
                <PhoneOff className="h-4 w-4" />
                End call
              </button>
            )}
          </div>
        )}

        {/* Conversion / opt-in (demo only) */}
        {isDemo && showConversion && (
          <div className="mt-1 space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 ring-1 ring-blue-100">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {callError ? 'Still want your own widget?' : 'That was your site, with AI answering.'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Embed the same click-to-call experience on your site in minutes.
                    Free to start — no international toll-free numbers required.
                  </p>
                </div>
              </div>
            </div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = signupHref;
              }}
            >
              <div>
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
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Get my free widget
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowConversion(false);
                  setStatus(isConnected ? 'Ready — talk to our AI demo' : 'Connecting…');
                }}
                className="font-medium text-slate-500 hover:text-slate-800"
              >
                Try demo again
              </button>
              <Link
                to="/pricing"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                See pricing
              </Link>
            </div>
          </div>
        )}

        {/* Soft conversion nudge before they call */}
        {isDemo && !showConversion && !isCalling && !hasTriedCall && (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            After the demo you can create a free account and embed your own widget.
          </p>
        )}

        {/* Soft conversion if they never called but connected */}
        {isDemo && !showConversion && !isCalling && hasTriedCall && (
          <div className="mt-4 text-center">
            <Link
              to="/signup?from=demo"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Skip demo — create free account
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Embed footer */}
        {!isDemo && (
          <p className="mt-4 text-center text-[11px] text-slate-400">
            Powered by{' '}
            <a
              href="https://click2call.ai"
              className="font-medium text-blue-600 hover:underline"
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
