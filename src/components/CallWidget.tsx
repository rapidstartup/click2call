import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import { AudioSettings } from './AudioSettings';

interface SignalData {
  type: string;
  timestamp?: number;
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
    url: 'https://io.click2call.ai',
    options: { 
      secure: true,
      rejectUnauthorized: false,
      path: '/socket.io/'
    }
  };
};

const { url: SOCKET_SERVER_URL, options: defaultOptions } = getSocketUrl();

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

const CallWidget = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  useEffect(() => {
    const socketOptions = {
      ...defaultOptions,
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
      ...socketOptions,
      timestamp: new Date().toISOString()
    });

    const newSocket = io(SOCKET_SERVER_URL, socketOptions);

    // Debug transport state using socket.io events
    newSocket.on("connect_error", (error) => {
      console.log('Connection error:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    newSocket.on("connect", () => {
      console.log('Socket connected:', {
        id: newSocket.id,
        timestamp: new Date().toISOString()
      });
      setIsConnected(true);  // Set connection state to true
      setStatus('Ready');  // Update status to show we're ready
    });

    // Debug packet events
    newSocket.io.on("packet", (packet) => {
      console.log('Socket packet:', {
        type: packet.type,
        data: packet.data,
        timestamp: new Date().toISOString()
      });
    });

    // Debug engine packet events
    newSocket.io.engine.on("packet", (packet) => {
      console.log('Engine packet:', {
        type: packet.type,
        data: packet.data,
        timestamp: new Date().toISOString()
      });
    });

    // Debug upgrading
    newSocket.io.engine.on("upgrading", (transport) => {
      console.log('Socket upgrading:', {
        transport: transport.name,
        timestamp: new Date().toISOString()
      });
    });

    // Debug upgrade complete
    newSocket.io.engine.on("upgrade", (transport) => {
      console.log('Socket upgraded:', {
        transport: transport.name,
        timestamp: new Date().toISOString()
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', {
        reason,
        wasConnected: newSocket.connected,
        timestamp: new Date().toISOString()
      });
      setIsConnected(false);
      setStatus('Reconnecting...');
    });

    newSocket.on('connect_error', (error) => {
      console.log('Connection error:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      setStatus('Connection error. Retrying...');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', {
        error: error.toString(),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      setStatus('Connection error occurred');
      setIsConnected(false);
    });

    newSocket.on('signal', (data: SignalData) => {
      console.log('Signal received:', {
        data,
        timestamp: new Date().toISOString()
      });
    });

    // Handle call status updates
    newSocket.on('call-status', (data: { status: string, message: string }) => {
      console.log('Call status update:', data);
      setStatus(data.message);
    });

    // Handle call established
    newSocket.on('call-established', () => {
      setStatus('Call connected');
      setIsCalling(true);
    });

    // Handle call ended
    newSocket.on('call-ended', () => {
      setStatus('Call ended');
      setIsCalling(false);
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  const startCall = async () => {
    if (!socket || !isConnected) return;

    try {
      // Request permissions when starting the call
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission check
      
      setIsCalling(true);
      setStatus('Initiating call...');

      // Send call start signal
      socket.emit('signal', {
        type: 'call-start',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('Microphone access denied. Please check your permissions.');
    }
  };

  const endCall = () => {
    if (!socket || !isConnected) return;

    // Send call end signal
    socket.emit('signal', {
      type: 'call-end',
      timestamp: Date.now(),
    });

    setIsCalling(false);
    setStatus('Ready');
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
        <p className="text-gray-600">{status}</p>
        {isConnected && !isCalling && (
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
            disabled={!isConnected}
            className={`
              w-full py-2 px-4 rounded-md text-sm font-medium
              ${!isConnected
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            Start Call
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