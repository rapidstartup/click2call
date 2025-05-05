import { View, Text } from 'react-native';
import React from 'react';
import { HangUpCallButton } from '@stream-io/video-react-native-sdk';
import { ToggleAudioPublishingButton } from '@stream-io/video-react-native-sdk';

export default function CustomControls({ onHangupCallHandler }: { onHangupCallHandler: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
      <ToggleAudioPublishingButton />
      <HangUpCallButton onHangupCallHandler={onHangupCallHandler} />
    </View>
  );
}
