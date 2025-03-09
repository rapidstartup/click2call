import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': 'https://click2call.ai',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Get the authorization token
  const authHeader = event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing or invalid authorization token' })
    };
  }

  const token = authHeader.split(' ')[1];

  // Verify the token and get user info
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid authorization token' })
    };
  }

  try {
    let responseData;
    let error;

    switch (event.httpMethod) {
      case 'GET': {
        // Test endpoint
        responseData = { message: 'Widgets API is working!' };
        break;
      }
      case 'POST': {
        // Create a new widget
        const body = JSON.parse(event.body || '{}');
        const result = await supabase
          .from('widgets')
          .insert({
            ...body,
            user_id: user.id
          })
          .single();
        
        responseData = result.data;
        error = result.error;
        break;
      }
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 