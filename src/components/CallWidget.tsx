import React, { useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import { AudioSettings } from './AudioSettings';
import Vapi from '@vapi-ai/web';

interface SignalData {
  type: string;
  timestamp?: number;
  widgetId?: string;
  vapiConfig?: {
    publicKey: string;
    assistantId: string;
  };
}

interface CallWidgetProps {
  widgetId?: string;
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
const isSecure = window.location.protocol === 'https:';

// Force WSS in production, allow WS in dev
const getSocketUrl = () => {
  if (isDev) {
    return {
      url: 'http://localhost:3002',
      options: { secure: false }
    };
  }
  return {
    url: import.meta.env.VITE_SOCKET_SERVER_URL || 'https://io.click2call.ai',
    options: { 
      secure: true,
      rejectUnauthorized: false,
      path: '/socket.io/'
    }
  };
};

const { url: SOCKET_SERVER_URL, options: defaultOptions } = getSocketUrl();
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

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

// Debug logging
console.log('Socket Configuration:', {
  url: SOCKET_SERVER_URL,
  isSecure: isSecure,
  protocol: window.location.protocol,
  host: window.location.host,
  origin: window.location.origin,
  timestamp: new Date().toISOString()
});

console.log('Socket URL:', SOCKET_SERVER_URL);
console.log('Is Secure:', isSecure);
console.log('Protocol:', window.location.protocol);

const CallWidget: React.FC<CallWidgetProps> = ({ widgetId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('Checking browser…');
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [vapiClient, setVapiClient] = useState<Vapi | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [hasUsedPublicCall, setHasUsedPublicCall] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const challengeConsumedRef = useRef(false);

  useEffect(() => {
    if (!widgetId) {
      setStatus('Demo widget is not configured');
      return;
    }
    if (!TURNSTILE_SITE_KEY) {
      setStatus('Browser verification is not configured');
      return;
    }

    let cancelled = false;
    let turnstileScript: HTMLScriptElement | null = null;
    const renderChallenge = () => {
      if (cancelled || !window.turnstile || !turnstileContainerRef.current || turnstileWidgetIdRef.current) return;
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: 'turnstile-spin-v2',
        cData: widgetId.replace(/-/g, ''),
        appearance: 'interaction-only',
        theme: 'auto',
        callback: (token: string) => {
          challengeConsumedRef.current = false;
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
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-click2call-turnstile]');
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
      const widgetIdToRemove = turnstileWidgetIdRef.current;
      if (widgetIdToRemove && window.turnstile) window.turnstile.remove(widgetIdToRemove);
      turnstileWidgetIdRef.current = null;
    };
  }, [widgetId]);

  useEffect(() => {
    let newSocket: Socket | null = null;
    let cancelled = false;

    const connectSocket = async () => {
      if (!widgetId) {
        setStatus('Demo widget is not configured');
        return;
      }
      if (!turnstileToken) return;

      const tokenResponse = await fetch(`${SOCKET_SERVER_URL}/widget-call-token/${encodeURIComponent(widgetId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeddingOrigin: getEmbeddingOrigin(),
          turnstileToken,
        }),
      });
      if (!tokenResponse.ok) throw new Error('Unable to authorize this widget');
      const tokenPayload = await tokenResponse.json() as { token?: unknown };
      if (typeof tokenPayload.token !== 'string') throw new Error('Widget authorization response was invalid');
      if (cancelled) return;
      challengeConsumedRef.current = true;
      const challengeId = turnstileWidgetIdRef.current;
      if (challengeId && window.turnstile) window.turnstile.remove(challengeId);
      turnstileWidgetIdRef.current = null;

      const socketOptions = {
        ...defaultOptions,
        auth: { widgetToken: tokenPayload.token },
        transports: ['websocket', 'polling'],  // Allow polling fallback
        reconnectionAttempts: 5,  // Increase retry attempts
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,  // Cap maximum delay
        timeout: 20000,  // Increase timeout
        forceNew: true,
        rememberUpgrade: true,
        timestampRequests: true,
        upgrade: true,
        autoConnect: true,
        // Add additional debug options
        debug: true
      };

      console.log('Connecting with options:', {
        url: SOCKET_SERVER_URL,
        transports: socketOptions.transports,
        timestamp: new Date().toISOString()
      });

      const connectedSocket = io(SOCKET_SERVER_URL, socketOptions);
      newSocket = connectedSocket;

      // Debug transport state using socket.io events
      connectedSocket.on("connect_error", (error) => {
      console.log('Connection error:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

      connectedSocket.on("connect", () => {
      console.log('Socket connected:', {
        id: connectedSocket.id,
        timestamp: new Date().toISOString()
      });
      setIsConnected(true);  // Set connection state to true
      setStatus('Ready');  // Update status to show we're ready
    });

      // Debug packet events
      connectedSocket.io.on("packet", (packet) => {
      console.log('Socket packet:', {
        type: packet.type,
        data: packet.data,
        timestamp: new Date().toISOString()
      });
    });

      // Debug engine packet events
      connectedSocket.io.engine.on("packet", (packet) => {
      console.log('Engine packet:', {
        type: packet.type,
        data: packet.data,
        timestamp: new Date().toISOString()
      });
    });

      // Debug upgrading
      connectedSocket.io.engine.on("upgrading", (transport) => {
      console.log('Socket upgrading:', {
        transport: transport.name,
        timestamp: new Date().toISOString()
      });
    });

      // Debug upgrade complete
      connectedSocket.io.engine.on("upgrade", (transport) => {
      console.log('Socket upgraded:', {
        transport: transport.name,
        timestamp: new Date().toISOString()
      });
    });

      connectedSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', {
        reason,
        wasConnected: connectedSocket.connected,
        timestamp: new Date().toISOString()
      });
      setIsConnected(false);
      setStatus('Reconnecting...');
    });

      connectedSocket.on('connect_error', (error) => {
      console.log('Connection error:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      setStatus('Connection error. Retrying...');
      setIsConnected(false);
    });

      connectedSocket.on('error', (error) => {
      console.error('Socket error:', {
        error: error.toString(),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      setStatus('Connection error occurred');
      setIsConnected(false);
    });

      connectedSocket.on('signal', (data: SignalData) => {
      console.log('Signal received:', {
        data,
        timestamp: new Date().toISOString()
      });
    });

    // Handle call status updates
      connectedSocket.on('call-status', (data: { status: string, message: string }) => {
      console.log('Call status update:', data);
      setStatus(data.message);
    });

    // Handle call established
      connectedSocket.on('call-established', () => {
      setStatus('Call connected');
      setIsCalling(true);
    });

    // Handle call ended
      connectedSocket.on('call-ended', () => {
      setStatus('Call ended. Reload the widget to start another call.');
      setIsCalling(false);
    });

      setSocket(connectedSocket);
    };

    void connectSocket().catch((error: unknown) => {
      console.error('Widget connection failed:', error);
      setStatus('Unable to connect this widget');
      setIsConnected(false);
      const challengeId = turnstileWidgetIdRef.current;
      if (challengeId && window.turnstile) window.turnstile.reset(challengeId);
      setTurnstileToken(null);
    });

    return () => {
      cancelled = true;
      console.log('Cleaning up socket connection');
      newSocket?.close();
    };
  }, [turnstileToken, widgetId]);

  const startCall = async () => {
    if (!socket || !isConnected || hasUsedPublicCall) return;

    try {
      setHasUsedPublicCall(true);
      setIsCalling(true);
      setStatus('Initiating call...');

      // Listen for VAPI configuration if the widget is configured for VAPI
      socket.once('vapi-config', async (config: { publicKey: string; assistantId: string }) => {
        try {
          // Initialize VAPI client
          const vapi = new Vapi(config.publicKey);

          // Set up event handlers
          vapi.on('call-end', () => {
            endCall();
          });

          vapi.on('error', (error: Error) => {
            console.error('VAPI call error:', error);
            setStatus('Call error occurred');
            endCall();
          });

          // Start VAPI call with assistant ID
          const call = await vapi.start(config.assistantId);
          if (!call) {
            throw new Error('Failed to start VAPI call');
          }

          setVapiClient(vapi);

        } catch (error: unknown) {
          console.error('Error initializing VAPI:', error);
          setStatus('Failed to connect to AI assistant');
          endCall();
        }
      });

      // Register the one-shot response listener before emitting to avoid losing
      // a fast server response.
      socket.emit('signal', {
        type: 'call-start',
        timestamp: Date.now(),
        widgetId
      });

    } catch (error: unknown) {
      console.error('Error starting call:', error);
      setStatus('Failed to start call');
      setIsCalling(false);
    }
  };

  const endCall = () => {
    if (!socket || !isConnected) return;

    // Clean up VAPI client if it exists
    if (vapiClient) {
      vapiClient.stop();
      setVapiClient(null);
    }

    // Send call end signal
    socket.emit('signal', {
      type: 'call-end',
      timestamp: Date.now(),
      widgetId: widgetId
    });

    setIsCalling(false);
    setStatus('Call ended. Reload the widget to start another call.');
  };

  const handleDeviceSelect = (type: 'input' | 'output', deviceId: string) => {
    // Optional: Handle device selection for users who want to change from default
    console.log(`Selected ${type} device: ${deviceId}`);
  };

  return (
    <div className="w-[300px] bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-blue-600 p-2 rounded-full">
          <Phone className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold ml-2">Click2Call</h2>
      </div>

      {/* Status Message */}
      <div className="text-center mb-6">
        <div
          ref={turnstileContainerRef}
          className="cf-turnstile"
          data-action="turnstile-spin-v2"
        />
        <p className="text-gray-600">{status}</p>
        {isConnected && !isCalling && !hasUsedPublicCall && (
          <p className="text-sm text-gray-500 mt-2">
            Please press the call button below to initiate your free call
          </p>
        )}
      </div>

      {/* Audio Settings */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Audio Settings</p>
        <button 
          className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => setShowAudioSettings(!showAudioSettings)}
        >
          Speaker/Mic
        </button>
        
        {showAudioSettings && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <AudioSettings onDeviceSelect={handleDeviceSelect} />
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="flex justify-center">
        {!isCalling ? (
          <button
            onClick={startCall}
            disabled={!isConnected || !widgetId || hasUsedPublicCall}
            className={`
              w-full py-2 px-4 rounded-md text-sm font-medium
              ${!isConnected || !widgetId || hasUsedPublicCall
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {hasUsedPublicCall ? 'Call completed' : 'Start Call'}
          </button>
        ) : (
          <button
            onClick={endCall}
            className="w-full py-2 px-4 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
          >
            End Call
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-500 text-center mt-4">
        To get your own Click2Call Widget or Link, please visit{' '}
        <a href="https://click2call.ai" className="text-blue-600 hover:underline">
          click2call.ai
        </a>
      </p>
    </div>
  );
};

export default CallWidget
