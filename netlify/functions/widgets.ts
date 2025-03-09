import { Handler } from '@netlify/functions';
import { createClient, User } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const handler: Handler = async (event) => {
  console.log('Function invoked:', {
    path: event.path,
    httpMethod: event.httpMethod,
    headers: event.headers,
  });

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*', // Update to be more permissive for testing
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  let user: User | null = null;

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 204,
      headers
    };
  }

  // For GET requests, skip auth check (temporary for testing)
  if (event.httpMethod !== 'GET') {
    console.log('Processing authenticated request');
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
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authorization token' })
      };
    }
    user = authUser;
  }

  try {
    let responseData;
    let error;

    switch (event.httpMethod) {
      case 'GET': {
        // Test endpoint
        responseData = { message: 'Widgets API is working!', timestamp: new Date().toISOString() };
        break;
      }
      case 'POST': {
        // Create a new widget
        if (!user) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required for this operation' })
          };
        }
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