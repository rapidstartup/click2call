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
    'Access-Control-Allow-Origin': '*', // Update to be more permissive for testing
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

  const authHeader = event.headers.authorization ?? event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing or invalid authorization token' })
    };
  }

  const token = authHeader.slice('Bearer '.length);

  // Verify the token and get user info for every operation, including reads.
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid authorization token' })
    };
  }
  const user = authUser;

  try {
    let responseData;
    let error;

    switch (event.httpMethod) {
      case 'GET': {
        const result = await supabase
          .from('widgets')
          .select('id, name, type, destination, routing, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        responseData = result.data;
        error = result.error;
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
          .select('id, name, type, destination, routing, created_at, updated_at')
          .single();
        
        responseData = result.data;
        error = result.error;
        break;
      }
      case 'DELETE': {
        const widgetId = event.path.match(/\/widgets\/([^/]+)\/?$/)?.[1];
        if (!widgetId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Widget id is required' })
          };
        }

        const result = await supabase
          .from('widgets')
          .delete()
          .eq('id', widgetId)
          .eq('user_id', user.id)
          .select('id')
          .maybeSingle();

        if (!result.data && !result.error) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Widget not found' })
          };
        }

        responseData = { success: true };
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
