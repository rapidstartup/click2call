import { useState } from 'react';
import { Button, message } from 'antd';

import { supabase } from '../lib/supabase';

interface RecordingPlayerProps {
  path: string;
}

const RecordingPlayer = ({ path }: RecordingPlayerProps) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRecording = async () => {
    if (audioUrl) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw error || new Error('Recording unavailable');
      setAudioUrl(data.signedUrl);
    } catch {
      message.error('Recording unavailable');
    } finally {
      setLoading(false);
    }
  };

  if (audioUrl) {
    return <audio className='max-w-[220px]' controls preload='none' src={audioUrl} />;
  }

  return (
    <Button type='link' size='small' loading={loading} onClick={() => void loadRecording()}>
      Play
    </Button>
  );
};

export default RecordingPlayer;
