import { io, Socket } from 'socket.io-client';

// Socket Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const SOCKET_URL = isDevelopment 
  ? 'http://192.168.1.80:3002'  // Local development
  : 'https://io.click2call.ai'; // Production

interface CallEventData {
  id: string;
  widgetId: string;
  caller?: {
    name?: string;
    email?: string;
  };
}

class WidgetSocket {
  public socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private connectionState: string = 'disconnected';
  private isRegistered: boolean = false;
  private widgetId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private getSocketUrl() {
    console.log('Socket URL:', SOCKET_URL);
    return SOCKET_URL;
  }

  async connect(widgetId: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.widgetId = widgetId;
    this.connectionState = 'connecting';
    console.log('Attempting to connect to socket with widget ID:', widgetId);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Using Socket URL:', SOCKET_URL);

    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing socket connection to:', SOCKET_URL);

        this.socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 20000,
          query: {
            type: 'widget-visitor',
            widgetId: this.widgetId
          }
        });

        // Debug connection attempt
        this.socket.on('connecting', () => {
          console.log('Socket connecting...');
        });

        // Connection event handlers
        this.socket.on('connect', () => {
          console.log('Socket connected successfully with ID:', this.socket?.id);
          console.log('Current connection state:', this.connectionState);
          this.connectionState = 'connected';
          
          // Register for incoming calls immediately after connection
          console.log('Attempting to register widget...');
          this.socket?.emit('register', {
            type: 'widget-visitor',
            widgetId: this.widgetId
          }, (response: { success: boolean; error?: string }) => {
            if (response.success) {
              console.log('Registration successful for widget:', this.widgetId);
              this.isRegistered = true;
              this.connectionState = 'registered';
              console.log('Updated connection state:', this.connectionState);
            } else {
              console.error('Registration failed:', response.error);
              this.emit('error', 'Failed to register for calls');
            }
          });
          
          this.reconnectAttempts = 0;
          resolve();
        });

        // Listen for incoming calls
        this.socket.on('call:incoming', (data: CallEventData) => {
          console.log('Incoming call received:', {
            ...data,
            socketId: this.socket?.id,
            connectionState: this.connectionState
          });
          this.emit('call:established', data);
        });

        // Listen for call updates
        this.socket.on('call:status', (data: { status: string; callId: string }) => {
          console.log('Call status update:', {
            ...data,
            socketId: this.socket?.id,
            connectionState: this.connectionState
          });
          this.emit('call:status', data.status);
        });

        // Listen for call errors
        this.socket.on('call:error', (error: { message: string; callId?: string }) => {
          console.error('Call error received:', {
            ...error,
            socketId: this.socket?.id,
            connectionState: this.connectionState
          });
          this.emit('error', error.message);
        });

        this.socket.on('connect_error', (error: Error & { description?: string; type?: string }) => {
          console.error('Socket connection error:', {
            message: error.message,
            description: error.description,
            type: error.type
          });
          this.handleConnectionError(error, reject);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', {
            reason,
            socketId: this.socket?.id,
            wasConnected: this.socket?.connected
          });
          
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            this.cleanup();
          } else {
            this.handleDisconnect();
          }
        });

        // Debug events
        this.socket.onAny((eventName, ...args) => {
          console.log('Socket event received:', eventName, args);
        });

      } catch (error) {
        console.error('Socket initialization error:', error);
        this.handleConnectionError(error, reject);
      }
    });
  }

  private handleConnectionError(error: any, reject: (reason?: any) => void) {
    console.error('Handling connection error:', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        console.log('Attempting reconnection...');
        this.connect(this.widgetId!)
          .then(() => console.log('Reconnected successfully'))
          .catch((error) => {
            console.error('Reconnection failed:', error);
            reject(error);
          });
      }, 2000 * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.cleanup();
      reject(new Error('Failed to connect to call service after multiple attempts'));
    }
  }

  private handleDisconnect() {
    console.log('Handling disconnect, attempts:', this.reconnectAttempts);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Auto-reconnect attempt ${this.reconnectAttempts}`);
      this.emit('error', 'Connection lost. Attempting to reconnect...');
    } else {
      this.cleanup();
      this.emit('error', 'Connection lost. Please refresh the page.');
    }
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.isRegistered = false;
    this.connectionState = 'disconnected';
  }

  disconnect() {
    this.cleanup();
  }

  // Event handlers with proper typing
  onCallEstablished(callback: (data: CallEventData) => void) {
    this.socket?.on('call:established', callback);
  }

  onCallStatus(callback: (status: string) => void) {
    this.socket?.on('call:status', callback);
  }

  onError(callback: (error: string) => void) {
    this.socket?.on('error', callback);
  }

  // Emit events with proper typing
  private emit(event: string, ...args: any[]) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot emit event:', event);
      return;
    }
    this.socket.emit(event, ...args);
  }

  initiateCall(data: { name?: string; email?: string }) {
    if (!this.socket?.connected) {
      const error = 'Socket not connected';
      console.error(error, { socketState: this.socket?.connected });
      this.emit('error', error);
      throw new Error(error);
    }

    if (!this.widgetId) {
      const error = 'Widget ID not set';
      console.error(error);
      this.emit('error', error);
      throw new Error(error);
    }

    if (!this.isRegistered) {
      const error = 'Socket not registered for calls';
      console.error(error, { connectionState: this.connectionState });
      this.emit('error', error);
      throw new Error(error);
    }

    console.log('Initiating call with data:', {
      widgetId: this.widgetId,
      caller: data,
      socketId: this.socket.id,
      connectionState: this.connectionState
    });

    return new Promise((resolve, reject) => {
      this.socket?.emit('call:initiate', {
        widgetId: this.widgetId,
        caller: {
          name: data.name || 'Website Visitor',
          email: data.email
        }
      }, async (response: { success: boolean; error?: string; callId?: string }) => {
        if (response.success && response.callId) {
          console.log('Call initiated successfully:', {
            callId: response.callId,
            widgetId: this.widgetId,
            socketId: this.socket?.id
          });

          // Wait for call session to be created before sending WebRTC offer
          try {
            // Create and send WebRTC offer
            const offer = await this.createOffer();
            this.socket?.emit('webrtc:offer', {
              callId: response.callId,
              offer
            });
            resolve(response.callId);
          } catch (error) {
            console.error('Error creating WebRTC offer:', error);
            reject(error);
          }
        } else {
          const error = `Failed to initiate call: ${response.error || 'Unknown error'}`;
          console.error(error, {
            widgetId: this.widgetId,
            socketId: this.socket?.id,
            connectionState: this.connectionState
          });
          this.emit('error', error);
          reject(new Error(error));
        }
      });
    });
  }

  private async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      await this.setupWebRTC();
    }

    const offer = await this.peerConnection!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await this.peerConnection!.setLocalDescription(offer);
    return offer;
  }

  private async setupWebRTC() {
    try {
      // Request audio permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStream = stream;

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, stream);
      });

      // Handle incoming stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
        this.remoteStream = event.streams[0];
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket?.emit('webrtc:ice-candidate', {
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', this.peerConnection?.connectionState);
      };

      return true;
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      throw error;
    }
  }
}

export default new WidgetSocket();