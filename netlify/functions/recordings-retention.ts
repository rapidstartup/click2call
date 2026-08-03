import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import { runRecordingRetention } from '../../server/recordings';
import type { SupabaseClientLike } from '../../server/recordings';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);
const recordingClient = supabase as unknown as SupabaseClientLike;

export const handler: Handler = async () => {
  const result = await runRecordingRetention({ supabase: recordingClient });
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
