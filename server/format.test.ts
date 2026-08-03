import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  leadOutcomeLabel,
  recordingStatusLabel,
  statusBadgeTone,
} from '../src/lib/format';

test('format helpers cover dashboard display values', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(725), '12m 5s');
  assert.equal(formatDuration(3725), '1h 2m');

  assert.equal(formatCurrency(0), '$0.00');
  assert.equal(formatCurrency(3.25), '$3.25');
  assert.equal(formatCurrency(12.5), '$12.50');

  assert.equal(formatDateTime(null), '—');
  assert.equal(formatDateTime('not-a-date'), '—');
  assert.match(formatDateTime('2026-08-04T00:00:00.000Z'), /2026/);

  assert.deepEqual(statusBadgeTone('completed'), { label: 'Completed', tone: 'green' });
  assert.deepEqual(statusBadgeTone('started'), { label: 'In progress', tone: 'blue' });
  assert.deepEqual(statusBadgeTone('connected'), { label: 'Connected', tone: 'blue' });
  assert.deepEqual(statusBadgeTone('failed'), { label: 'Failed', tone: 'red' });
  assert.deepEqual(statusBadgeTone('aborted'), { label: 'Aborted', tone: 'amber' });
  assert.deepEqual(statusBadgeTone('capped'), { label: 'Capped', tone: 'amber' });
  assert.deepEqual(statusBadgeTone('whatever'), { label: 'Unknown', tone: 'gray' });

  assert.deepEqual(
    ['copied', 'pending', 'failed', 'expired', 'none', null].map(recordingStatusLabel),
    ['Ready', 'Processing', 'Unavailable', 'Expired (retention)', '—', '—'],
  );

  assert.deepEqual(
    ['qualified', 'booked', 'lead_captured', 'unqualified', 'no_contact', null, 'other'].map(leadOutcomeLabel),
    ['Qualified', 'Booked', 'Lead captured', 'Unqualified', 'No contact', '—', '—'],
  );
});
