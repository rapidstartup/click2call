import { View, Text, ActivityIndicator, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { 
  Call, 
  StreamCall, 
  CallingState, 
  useStreamVideoClient,
  StreamVideo,
  StreamVideoClient,
  CallContent,
  CallControls,
  ToggleAudioPublishingButton,
  HangUpCallButton,
} from '@stream-io/video-react-native-sdk'
import { router, useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '@/lib/context/AuthContext'

const apiKey = process.env.EXPO_PUBLIC_GET_STREAM_API_KEY!;

const CustomCallControls = () => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
      <ToggleAudioPublishingButton />
      <HangUpCallButton  onHangupCallHandler={() => {
        console.log('Call ended');
        router.back();
      }} />
    </View>
  );
};

const AudioOnlyCallContent = ({ onHangupCallHandler }: { onHangupCallHandler: () => void }) => {
  return (
    <CallContent 
      onHangupCallHandler={onHangupCallHandler}
      CallControls={CustomCallControls}
      initialInCallManagerAudioMode="audio"
    />
  );
};

const CallComponent = ({ id }: { id: string }) => {
  const [call, setCall] = useState<Call | null>(null)
  const client = useStreamVideoClient()
  const router = useRouter()
  const [isJoining, setIsJoining] = useState(true)
  
  useEffect(() => {
    const setupCall = async () => {
      if (!client || !id || id === '(call)') {
        console.log('Invalid call ID or client not ready:', { client: !!client, id });
        router.back();
        return;
      }

      try {
        setIsJoining(true);
        console.log('Setting up call with ID:', id);
        const _call = client.call('default', id);
        console.log('Created call object');
        
        // Add call state handlers
        _call.on('call.ended', () => {
          console.log('Call ended by host');
          router.back();
        });

        // Join call
        await _call.join({ 
          create: false,
          data: { 
            custom: {
              is_host: false,
              acceptedAt: new Date().toISOString(),
              audio_only: true
            }
          },
          video: false
        });
        console.log('Successfully joined call');
        
        setCall(_call);
      } catch (error) {
        console.error('Error joining call:', error);
        Alert.alert(
          'Error',
          'Failed to join the call. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } finally {
        setIsJoining(false);
      }
    };

    setupCall();

    return () => {
      if (call?.state.callingState !== CallingState.LEFT) {
        console.log('Cleaning up call');
        call?.leave();
      }
    };
  }, [id, client]);

  if (!call || isJoining) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212'}}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{color: '#fff', marginTop: 10}}>
          {!client ? 'Initializing call...' : 'Joining call...'}
        </Text>
      </View>
    )
  }

  return (
    <StreamCall call={call}>
      <SafeAreaView style={{flex: 1, backgroundColor: '#121212'}}>
        <View style={{flex: 1}}>
          <AudioOnlyCallContent 
            onHangupCallHandler={() => {
              call?.leave();
              router.back();
            }}
          />
        </View>
      </SafeAreaView>
    </StreamCall>
  )
}

export default function CallScreen() {
  const { id } = useLocalSearchParams();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const {user} = useAuth();

  useEffect(() => {
    const initializeClient = async () => {
      try {
        const response = await fetch(`http://localhost:3002/generateUserToken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user?.id,
            name: user?.email
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch token');
        const { token } = await response.json();
        
        const streamClient = new StreamVideoClient({
          apiKey,
          user: {
            id: user?.id!,
            name: user?.email,
            image: '',
            type: 'authenticated',
          },
          token,
        });

        console.log('Stream client initialized');
        setClient(streamClient);
      } catch (error) {
        console.error('Error initializing client:', error);
        Alert.alert('Error', 'Failed to initialize call');
      }
    };

    initializeClient();

    return () => {
      if (client) {
        client.disconnectUser();
        console.log('Client disconnected');
      }
    };
  }, []);

  if (!client || !id) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212'}}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{color: '#fff', marginTop: 10}}>Initializing...</Text>
      </View>
    );
  }

  return (
    <StreamVideo client={client}>
    <GestureHandlerRootView style={{flex: 1}}>
      <CallComponent id={id as string} />
    </GestureHandlerRootView>
    </StreamVideo>
  );
}