import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import {
  copyRecording,
  listPendingRecordings,
} from '../../server/recordings';
import type { SupabaseClientLike } from '../../server/recordings';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);
const recordingClient = supabase as unknown as SupabaseClientLike;

export const handler: Handler = async () => {
  let processed = 0;

  try {
    const pending = await listPendingRecordings(recordingClient);
    for (const recording of pending) {
      processed += 1;
      try {
        await copyRecording({ supabase: recordingClient, recording });
      } catch (error) {
        console.error(
          'Scheduled recording copy failed:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  } catch (error) {
    console.error(
      'Scheduled recording lookup failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processed }),
  };
};
