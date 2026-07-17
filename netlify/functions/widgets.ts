import { Handler } from '@netlify/functions';
import { createClient, User } from '@supabase/supabase-js';
import twilio from 'twilio';

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

  let user: User | null = null;

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 204,
      headers
    };
  }

  // For GET requests, skip auth check to keep the API health check public.
  if (event.httpMethod !== 'GET') {
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
    const route = event.path.replace(/^.*\/widgets/, '') || '/';

    switch (event.httpMethod) {
      case 'GET': {
        if (route !== '/') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        // Test endpoint
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Widgets API is working!', timestamp: new Date().toISOString() })
        };
      }
      case 'POST': {
        if (!user) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required for this operation' })
          };
        }

        const body = JSON.parse(event.body || '{}');

        if (route === '/') {
          const { data: widget, error } = await supabase
            .from('widgets')
            .insert({
              ...body,
              user_id: user.id
            })
            .select()
            .single();

          if (error) throw error;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(widget)
          };
        }

        const twilioRoute = route.match(/^\/([^/]+)\/configure-twilio-webhooks\/?$/);
        if (!twilioRoute) {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const widgetId = decodeURIComponent(twilioRoute[1]);
        const { sipDomain, accountSid, authToken } = body;

        if (!sipDomain || !accountSid || !authToken) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing Twilio configuration' })
          };
        }

        const { data: widget, error: widgetError } = await supabase
          .from('widgets')
          .select('id')
          .eq('id', widgetId)
          .eq('user_id', user.id)
          .single();

        if (widgetError || !widget) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Widget not found' })
          };
        }

        const client = twilio(accountSid, authToken);
        const baseUrl = process.env.VITE_API_URL || 'https://your-server.com';

        await client.sip.domains(sipDomain).update({
          voiceUrl: `${baseUrl}/twilio/voice/${widgetId}`,
          voiceMethod: 'POST',
          voiceStatusCallbackUrl: `${baseUrl}/twilio/status/${widgetId}`,
          voiceStatusCallbackMethod: 'POST'
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
