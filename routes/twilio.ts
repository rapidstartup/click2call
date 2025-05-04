import { Router, Request } from 'express';
import twilio from 'twilio';
import { supabase } from '../db';

const router = Router();

interface TwilioRequest extends Request {
  body: {
    [key: string]: string;
  };
  headers: {
    'x-twilio-signature'?: string;
  };
}

interface BusinessHours {
  start: string;
  end: string;
  timezone: string;
  days: number[];
}

// Helper function to validate Twilio request
const validateTwilioRequest = async (req: TwilioRequest, widgetId: string) => {
  try {
    const { data: widget, error } = await supabase
      .from('widgets')
      .select('settings')
      .eq('id', widgetId)
      .single();

    if (error || !widget?.settings?.twilio_account_sid || !widget?.settings?.twilio_auth_token) {
      throw new Error('Widget Twilio credentials not found');
    }

    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body;

    const validator = twilio.validateRequest(
      widget.settings.twilio_auth_token,
      twilioSignature || '',
      url,
      params
    );

    return validator;
  } catch (error) {
    console.error('Twilio validation error:', error);
    return false;
  }
};

// Handle incoming voice calls
router.post('/voice/:widgetId', async (req: TwilioRequest, res) => {
  const { widgetId } = req.params;

  try {
    // Validate the request is from Twilio
    const isValid = await validateTwilioRequest(req, widgetId);
    if (!isValid) {
      return res.status(403).send('Invalid Twilio request');
    }

    // Get widget details
    const { data: widget, error } = await supabase
      .from('widgets')
      .select('*')
      .eq('id', widgetId)
      .single();

    if (error || !widget) {
      return res.status(404).send('Widget not found');
    }

    const twiml = new twilio.twiml.VoiceResponse();

    // Check business hours if configured
    const isWithinBusinessHours = widget.routing.businessHours 
      ? checkBusinessHours(widget.routing.businessHours)
      : true;

    if (!isWithinBusinessHours && widget.routing.fallbackRoute) {
      // Handle after-hours routing
      handleRoute(twiml, widget.routing.fallbackRoute);
    } else {
      // Handle default routing
      handleRoute(twiml, widget.routing.defaultRoute || widget.destination);
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error handling voice call:', error);
    res.status(500).send('Error handling call');
  }
});

// Handle call status updates
router.post('/status/:widgetId', async (req: TwilioRequest, res) => {
  const { widgetId } = req.params;

  try {
    // Validate the request is from Twilio
    const isValid = await validateTwilioRequest(req, widgetId);
    if (!isValid) {
      return res.status(403).send('Invalid Twilio request');
    }

    // Log call status
    console.log('Call status update:', req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling status update:', error);
    res.status(500).send('Error handling status update');
  }
});

// Helper function to check if current time is within business hours
function checkBusinessHours(businessHours: BusinessHours): boolean {
  const now = new Date();
  const userTz = new Intl.DateTimeFormat('en-US', {
    timeZone: businessHours.timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const [hours, minutes] = userTz.format(now).split(':').map(Number);
  const currentTime = hours * 60 + minutes;
  const [startHours, startMinutes] = businessHours.start.split(':').map(Number);
  const [endHours, endMinutes] = businessHours.end.split(':').map(Number);
  const startTime = startHours * 60 + startMinutes;
  const endTime = endHours * 60 + endMinutes;
  
  const currentDay = now.getDay();
  
  return businessHours.days.includes(currentDay) && 
         currentTime >= startTime && 
         currentTime <= endTime;
}

// Helper function to handle different routing types
function handleRoute(twiml: twilio.twiml.VoiceResponse, route: string) {
  if (route.startsWith('sip:')) {
    twiml.dial().sip(route);
  } else if (route.match(/^\+?[1-9]\d{1,14}$/)) {
    twiml.dial(route);
  } else {
    // Handle other routing types (voicemail, etc.)
    twiml.say('This call cannot be completed as dialed. Please try again later.');
  }
}

export default router; 