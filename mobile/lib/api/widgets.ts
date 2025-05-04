import { supabase } from '../superbase';
import { Widget } from '@/types/widget';

export async function fetchWidgets(): Promise<Widget[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching widgets:', error);
    throw error;
  }

  return data || [];
}

export async function createWidget(widgetData: Partial<Widget>): Promise<Widget> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  if (!widgetData.name || !widgetData.type || !widgetData.destination) {
    throw new Error('Missing required fields: name, type, or destination');
  }

  const { data, error } = await supabase
    .from('widgets')
    .insert([{
      user_id: user.id,
      name: widgetData.name,
      type: widgetData.type,
      destination: widgetData.destination,
      routing: widgetData.routing || {},
      settings: {
        isActive: true,
        routeToApp: true,
        ...widgetData.settings
      }
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating widget:', error);
    throw error;
  }

  return data;
} 