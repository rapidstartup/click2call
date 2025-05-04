import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to find and load the .env file in multiple locations
const potentialPaths = [
  path.resolve(process.cwd(), '.env'),            // Root project .env
  path.resolve(process.cwd(), 'server', '.env'),  // Server directory .env
  path.resolve(__dirname, '..', '.env'),          // One level up from db directory
  path.resolve(__dirname, '..', '..', '.env'),    // Two levels up from db directory
];

let envLoaded = false;
for (const envPath of potentialPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('Could not find .env file in expected locations. Falling back to process.env');
}

// Try VITE_ prefixed versions as fallback
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:');
  console.error(`SUPABASE_URL / VITE_SUPABASE_URL: ${supabaseUrl ? 'Found' : 'Missing'}`);
  console.error(`SUPABASE_SERVICE_KEY / VITE_SUPABASE_SERVICE_KEY: ${supabaseKey ? 'Found' : 'Missing'}`);
  throw new Error('Required Supabase environment variables are missing');
}

console.log(`Connecting to Supabase at: ${supabaseUrl}`);
export const supabase = createClient(supabaseUrl, supabaseKey);