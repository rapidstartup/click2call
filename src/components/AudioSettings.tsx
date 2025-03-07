import React, { useEffect, useState, useRef } from 'react';
import { Volume2, Mic, RefreshCcw } from 'lucide-react';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface AudioSettingsProps {
  onDeviceSelect: (type: 'input' | 'output', deviceId: string) => void;
}

// Define the WebKit audio context type
interface WebKitAudioContext extends AudioContext {
  webkitAudioContext: typeof AudioContext;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({ onDeviceSelect }) => {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<string>('');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [error, setError] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const audioContext = useRef<AudioContext>();
  const mediaStream = useRef<MediaStream>();
  const testAudio = useRef<HTMLAudioElement>();
  const animationFrame = useRef<number>();

  // Initialize audio context and test audio
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as unknown as WebKitAudioContext).webkitAudioContext;
    audioContext.current = new AudioContextClass();
    testAudio.current = new Audio('/test-audio.mp3');
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      audioContext.current?.close();
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Request permissions and enumerate devices
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      await enumerateDevices();
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setError('Microphone permission denied. Please allow microphone access to use this feature.');
      console.error('Error requesting permissions:', err);
    }
  };

  // Enhanced device enumeration with visual feedback
  const enumerateDevices = async () => {
    try {
      setIsRefreshing(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || 'Microphone ' + (inputDevices.length + 1)
        }));
      
      const outputs = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || 'Speaker ' + (outputDevices.length + 1)
        }));

      setInputDevices(inputs);
      setOutputDevices(outputs);

      // Set default devices if not already set
      if (!selectedInput && inputs.length > 0) {
        setSelectedInput(inputs[0].deviceId);
        onDeviceSelect('input', inputs[0].deviceId);
      }
      if (!selectedOutput && outputs.length > 0) {
        setSelectedOutput(outputs[0].deviceId);
        onDeviceSelect('output', outputs[0].deviceId);
      }

      setError('');
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setError('Failed to get audio devices. Please make sure you have devices connected.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Enhanced microphone testing with better visualization
  const startMicTest = async () => {
    try {
      if (!audioContext.current) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedInput ? { exact: selectedInput } : undefined }
      });
      
      mediaStream.current = stream;
      const source = audioContext.current.createMediaStreamSource(stream);
      const analyser = audioContext.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3; // Add smoothing to the meter
      
      source.connect(analyser);
      setIsTestingMic(true);
      setError('');

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!isTestingMic) return;
        
        analyser.getByteFrequencyData(dataArray);
        // Calculate RMS value for better volume representation
        const rms = Math.sqrt(
          dataArray.reduce((acc, val) => acc + (val * val), 0) / bufferLength
        );
        const normalizedVolume = Math.min(1, rms / 128); // Normalize to 0-1 range
        setMicVolume(normalizedVolume);
        
        animationFrame.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error('Error testing microphone:', err);
      setError('Failed to test microphone. Please check your device permissions.');
      setIsTestingMic(false);
    }
  };

  const stopMicTest = () => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
    }
    setIsTestingMic(false);
    setMicVolume(0);
  };

  // Test speaker output
  const testSpeaker = () => {
    if (!isTestingSpeaker) {
      if (testAudio.current) {
        testAudio.current.setSinkId?.(selectedOutput)
          .then(() => {
            testAudio.current!.play();
            setIsTestingSpeaker(true);
          })
          .catch(err => {
            console.error('Error setting audio output:', err);
            setError('Failed to test speaker. Please check your device settings.');
          });
      }
    } else {
      if (testAudio.current) {
        testAudio.current.pause();
        testAudio.current.currentTime = 0;
      }
      setIsTestingSpeaker(false);
    }
  };

  // Add event listener for when audio finishes playing
  useEffect(() => {
    if (testAudio.current) {
      testAudio.current.addEventListener('ended', () => {
        setIsTestingSpeaker(false);
      });
    }
  }, [testAudio.current]);

  // Handle device selection
  const handleInputChange = (deviceId: string) => {
    setSelectedInput(deviceId);
    onDeviceSelect('input', deviceId);
    if (isTestingMic) {
      stopMicTest();
      startMicTest();
    }
  };

  const handleOutputChange = (deviceId: string) => {
    setSelectedOutput(deviceId);
    onDeviceSelect('output', deviceId);
  };

  useEffect(() => {
    requestPermissions();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, []);

  return (
    <div className="space-y-4 p-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}
      
      {/* Device Selection */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mic className="inline-block w-4 h-4 mr-1" />
            Microphone
          </label>
          <select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedInput}
            onChange={(e) => handleInputChange(e.target.value)}
          >
            {inputDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Volume2 className="inline-block w-4 h-4 mr-1" />
            Speaker
          </label>
          <select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedOutput}
            onChange={(e) => handleOutputChange(e.target.value)}
          >
            {outputDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Testing Controls */}
      <div className="flex space-x-4 mt-4">
        <button
          onClick={isTestingMic ? stopMicTest : startMicTest}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
            isTestingMic
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isTestingMic ? 'Stop Mic Test' : 'Test Mic'}
        </button>
        
        <button
          onClick={testSpeaker}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
            isTestingSpeaker
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isTestingSpeaker ? 'Stop Sound' : 'Test Speaker'}
        </button>

        <button
          onClick={enumerateDevices}
          disabled={isRefreshing}
          className={`p-2 rounded-md ${
            isRefreshing 
              ? 'text-gray-400 bg-gray-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Refresh devices"
        >
          <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Volume Meter */}
      {isTestingMic && (
        <div className="mt-4">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-75"
              style={{ 
                width: `${micVolume * 100}%`,
                transition: 'width 100ms linear'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 