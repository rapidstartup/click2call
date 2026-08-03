export function formatDuration(seconds: number): string {
  const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  if (wholeSeconds < 60) return `${wholeSeconds}s`;

  const totalMinutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  if (totalMinutes < 60) {
    return remainingSeconds > 0
      ? `${totalMinutes}m ${remainingSeconds}s`
      : `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatCurrency(value: number): string {
  return `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

type StatusBadgeTone = 'green' | 'red' | 'gray' | 'amber' | 'blue';

export function statusBadgeTone(status: string): {
  label: string;
  tone: StatusBadgeTone;
} {
  switch (status.trim().toLowerCase()) {
    case 'completed':
      return { label: 'Completed', tone: 'green' };
    case 'started':
      return { label: 'In progress', tone: 'blue' };
    case 'connected':
      return { label: 'Connected', tone: 'blue' };
    case 'failed':
      return { label: 'Failed', tone: 'red' };
    case 'aborted':
      return { label: 'Aborted', tone: 'amber' };
    case 'capped':
      return { label: 'Capped', tone: 'amber' };
    default:
      return { label: 'Unknown', tone: 'gray' };
  }
}

export function recordingStatusLabel(status: string | null): string {
  switch (status?.trim().toLowerCase()) {
    case 'pending':
      return 'Processing';
    case 'copied':
      return 'Ready';
    case 'failed':
      return 'Unavailable';
    case 'expired':
      return 'Expired (retention)';
    default:
      return '—';
  }
}

export function leadOutcomeLabel(outcome: string | null): string {
  switch (outcome?.trim().toLowerCase()) {
    case 'qualified':
      return 'Qualified';
    case 'booked':
      return 'Booked';
    case 'lead_captured':
      return 'Lead captured';
    case 'unqualified':
      return 'Unqualified';
    case 'no_contact':
      return 'No contact';
    default:
      return '\u2014';
  }
}
