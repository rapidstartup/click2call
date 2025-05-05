import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStreamVideoClient, StreamCall, Call, SpeakerLayout, StreamTheme, CancelCallButton, SpeakingWhileMutedNotification, ToggleAudioPublishingButton, useParticipantViewContext } from '@stream-io/video-react-sdk';
import axios from 'axios';
import "@stream-io/video-react-sdk/dist/css/styles.css";

interface Widget {
  id: string;
  name: string;
  user_id: string;
  type: WidgetType;
  settings?: {
    isActive?: boolean;
    customMessage?: string;
    theme?: {
      primaryColor?: string;
      buttonText?: string;
    };
  };
}

type WidgetType = 'call2app' | 'siptrunk' | 'aibot' | 'email' | 'vapi';



const WidgetPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const client = useStreamVideoClient();

  const CustomCallControls = () => (
    <div className="str-video__call-controls flex gap-4 justify-center items-center">
      <SpeakingWhileMutedNotification>
        <ToggleAudioPublishingButton />
      </SpeakingWhileMutedNotification>
      <CancelCallButton onLeave={() => {
        console.log('Call ended');
        call?.endCall();
        setCall(null);
      }} />
    </div>
  );

  // Fetch widget data
  useEffect(() => {
    const fetchWidget = async () => {
      if (!id) {
        setError('No widget ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`/api/widgets/public/${id}`);
        setWidget(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load widget');
      } finally {
        setLoading(false);
      }
    };

    fetchWidget();
  }, [id]);

  // Handle starting a call
  const startCall = async () => {
    if (!client || !widget) return;

    try {
      // Create a unique call ID using widget ID
      const callId = `widget-${widget.id}-${Date.now()}`;
      console.log("Creating call with ID:", callId);
      
      setLoading(true);
      // Create and join the call
      const newCall = client.call('default', callId);

      // Create the call with members
      
      await newCall.getOrCreate({
        data: {
          members: [{
            user_id: "f025e451-87c7-4b69-b111-f1ddbfc8e8cb",
            role: 'guest'
          }],
          custom: {
            widget_id: widget.id,
            is_host: true
          }
        }
      });
      console.log("Call created with members");

      // Add call state handlers
      newCall.on('call.rejected', () => {
        console.log('Call was rejected');
        setCall(null);
      });

      newCall.on('call.ended', () => {
        console.log('Call ended');
        setCall(null);
      });

      // Ring the call
      await newCall.notify();
      // await newCall.ring();
      console.log("Call notification sent");

      // Join the call
      await newCall.join({ 
        create: true,
        data: {
          custom: {
            is_host: true
          }
        }
      });
      console.log("Joined call as host");
      
      setCall(newCall);
      setLoading(false);
    } catch (err: any) {
      console.error("Error in startCall:", err);
      setError('Failed to start call: ' + err.message);
    }
  };

 

  

  if (error) {
    return <div className='text-red-500 bg-white p-4 rounded-xl shadow-md w-full max-w-md flex flex-col justify-center items-center'>Error: {error}
    contact support
    </div>;
  }
  const CustomParticipantViewUIBar = () => {
    const { participant } = useParticipantViewContext();
    return (
      <div className="bar-participant-name">
        {participant.name}
      </div>
    );
  };
  
  const CustomParticipantViewUISpotlight = () => {
    const { participant } = useParticipantViewContext();
    return (
      <div className="spotlight-participant-name">
        {participant.audioLevel}
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md mx-4">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {widget?.name || 'Widget'}
        </h1>

        {call ? (
          <div>
            <StreamCall call={call}>
              <StreamTheme  as="main">
                <SpeakerLayout  ParticipantViewUIBar={CustomParticipantViewUIBar} ParticipantViewUISpotlight={CustomParticipantViewUISpotlight}
 />
                <CustomCallControls />
              </StreamTheme>
              {/* <button 
                onClick={endCall}
                className="bg-red-500 text-white px-4 py-2 rounded-md mt-4"
              >
                End Call
              </button> */}
            </StreamCall>
          </div>
        ) : (
          <button
          onClick={startCall}
          disabled={loading}
          className="w-full px-5 py-2.5 rounded-lg text-white font-semibold 
                     bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 
                     transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Initializing...' : 'Start Call'}
        </button>
        
        )}
      </div>
    </div>
  );
};

export default WidgetPage; 