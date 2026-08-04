import React from 'react';
import { Alert, Button, Card, Skeleton, Tag } from 'antd';
import { Download, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buildCsv, downloadCsv } from '../lib/csv';
import { supabase } from '../lib/supabase';
import { formatDateTime, leadOutcomeLabel } from '../lib/format';

interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  intent_score: number | null;
  outcome: string | null;
  source: string;
  email_delivered_at: string | null;
  created_at: string;
}

const outcomeColors: Record<string, string> = {
  qualified: 'green',
  booked: 'blue',
  lead_captured: 'green',
  unqualified: 'default',
  no_contact: 'default',
};

function outcomeTag(outcome: string | null): { label: string; color: string } {
  const normalized = outcome?.trim().toLowerCase() || '';
  return {
    label: leadOutcomeLabel(outcome),
    color: outcomeColors[normalized] || 'default',
  };
}

const LeadsPage = () => {
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const loadLeads = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in required');

      const { data, error: queryError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (queryError) throw new Error(queryError.message);
      setLeads(Array.isArray(data) ? data as LeadRow[] : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = React.useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in required');

      const { data, error: queryError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10000);
      if (queryError) throw new Error(queryError.message);

      const rows = Array.isArray(data) ? data as LeadRow[] : [];
      const headers = ['name', 'email', 'phone', 'message', 'intent_score', 'outcome', 'source', 'email_delivered_at', 'created_at'];
      const csv = buildCsv(headers, rows.map((lead) => [
        lead.name,
        lead.email,
        lead.phone,
        lead.message,
        lead.intent_score,
        lead.outcome,
        lead.source,
        lead.email_delivered_at,
        lead.created_at,
      ]));
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`click2call-leads-${stamp}.csv`, csv);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export leads');
    } finally {
      setExporting(false);
    }
  }, []);

  React.useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-100 py-6'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <Skeleton active paragraph={{ rows: 5 }} />
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-100 py-6'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <Alert
            type='error'
            showIcon
            message='Unable to load leads'
            description={error}
            action={<Button type='primary' size='small' onClick={() => void loadLeads()}>Retry</Button>}
          />
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className='min-h-screen bg-gray-100 py-6'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col items-center justify-center rounded-lg bg-gray-50 px-6 py-16 text-center'>
            <Users className='mb-4 h-10 w-10 text-gray-400' />
            <h1 className='text-2xl font-semibold text-gray-900'>No leads yet</h1>
            <p className='mt-2 max-w-md text-sm text-gray-500'>Enable AI lead capture on a VAPI widget to start recording leads here.</p>
            <Link to='/dashboard?tab=widgets' className='mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'>Create a widget</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100 py-6'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <h1 className='mb-8 text-2xl font-semibold text-gray-900'>Leads</h1>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <p className='text-sm text-gray-500'>{leads.length} leads captured</p>
          <Button
            icon={<Download className='h-4 w-4' />}
            onClick={() => void handleExport()}
            loading={exporting}
          >
            Export CSV
          </Button>
        </div>
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {leads.map((lead) => {
            const tag = outcomeTag(lead.outcome);
            const contact = [lead.email, lead.phone]
              .filter((value): value is string => Boolean(value))
              .join(' · ');
            return (
              <Card key={lead.id} className='shadow-sm'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h2 className='text-lg font-medium text-gray-900'>{lead.name || 'Anonymous lead'}</h2>
                    <p className='text-sm text-gray-500'>{formatDateTime(lead.created_at)}</p>
                  </div>
                  <Tag color={tag.color}>{tag.label}</Tag>
                </div>
                {contact && <p className='mt-4 text-sm text-gray-700'>{contact}</p>}
                {lead.message && <p className='mt-3 text-sm text-gray-500'>{lead.message}</p>}
                <div className='mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500'>
                  {lead.intent_score !== null && <span>Intent {Math.round(lead.intent_score * 100)}%</span>}
                  <span className='inline-flex items-center gap-1'>
                    <span className={lead.email_delivered_at ? 'h-2 w-2 rounded-full bg-green-500' : 'h-2 w-2 rounded-full bg-gray-400'} />
                    {lead.email_delivered_at ? 'Emailed' : 'Recorded'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeadsPage;
