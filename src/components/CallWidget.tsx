import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

interface SignalData {
  type: string;
  timestamp?: number;
}

const isDev = import.meta.env.DEV;
const isSecure = window.location.protocol === 'https:';
const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 
  (isDev 
    ? 'http://localhost:3002' 
    : `${isSecure ? 'wss' : 'ws'}://io.click2call.ai:3002`);

const CallWidget = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
      setStatus('Ready');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      setIsConnected(false);
      setStatus('Reconnecting...');
    });

    newSocket.on('connect_error', (error) => {
      console.log('Connection error:', error);
      setStatus('Connection error. Retrying...');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setStatus('Connection error occurred');
      setIsConnected(false);
    });

    newSocket.on('signal', (data: SignalData) => {
      console.log('Signal received:', data);
      // Handle incoming signals here
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const startCall = () => {
    if (!socket || !isConnected) return;

    setIsCalling(true);
    setStatus('You are now being connected to Call2');

    // Send initial signal
    socket.emit('signal', {
      type: 'call-init',
      timestamp: Date.now(),
    });

    // Simulate connection for testing
    setTimeout(() => {
      setStatus('You are now connected to Call2 via a free Call2 call');
    }, 2000);
  };

  return (
    <div className="w-[300px] bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-blue-600 p-2 rounded-full">
          <Phone className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold ml-2">Call2</h2>
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
        >
          Speaker/Mic
        </button>
      </div>

      {/* Call Button */}
      <button
        onClick={startCall}
        disabled={!isConnected || isCalling}
        className={`w-full py-3 px-4 rounded-md text-white font-medium ${
          !isConnected || isCalling
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        START CALL
      </button>

      {/* Footer */}
      <p className="text-xs text-gray-500 text-center mt-4">
        To get your own Call2 Widget or Link, please visit{' '}
        <a href="https://www.call2.io" className="text-blue-600 hover:underline">
          www.call2.io
        </a>
      </p>
    </div>
  );
};

export default CallWidget