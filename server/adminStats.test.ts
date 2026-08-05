import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { measuredCostPerMinute, parseAdminStats } from '../src/lib/adminStats';

describe('parseAdminStats', () => {
  test('returns zeroed summary and empty users for malformed input', () => {
    assert.deepEqual(parseAdminStats(null), {
      summary: {
        total_users: 0,
        active_subscriptions: 0,
        mrr_usd: 0,
        total_calls: 0,
        total_minutes: 0,
        total_cost_usd: 0,
      },
      users: [],
    });
    assert.deepEqual(parseAdminStats({ summary: 'invalid', users: [null, { email: 'missing id' }] }), {
      summary: {
        total_users: 0,
        active_subscriptions: 0,
        mrr_usd: 0,
        total_calls: 0,
        total_minutes: 0,
        total_cost_usd: 0,
      },
      users: [],
    });
  });

  test('parses numeric strings and preserves nullable user fields', () => {
    assert.deepEqual(parseAdminStats({
      summary: {
        total_users: '2',
        active_subscriptions: 1,
        mrr_usd: '97',
        total_calls: 4,
        total_minutes: '12.5',
        total_cost_usd: 3.25,
      },
      users: [{
        user_id: 'user-1',
        email: null,
        plan_id: null,
        subscription_status: null,
        total_calls: '0',
        total_minutes: 0,
        total_cost_usd: '0',
      }],
    }), {
      summary: {
        total_users: 2,
        active_subscriptions: 1,
        mrr_usd: 97,
        total_calls: 4,
        total_minutes: 12.5,
        total_cost_usd: 3.25,
      },
      users: [{
        user_id: 'user-1',
        email: null,
        plan_id: null,
        subscription_status: null,
        total_calls: 0,
        total_minutes: 0,
        total_cost_usd: 0,
      }],
    });
  });
});

describe('measuredCostPerMinute', () => {
  test('calculates the measured platform cost per minute', () => {
    assert.equal(measuredCostPerMinute({
      total_users: 1,
      active_subscriptions: 1,
      mrr_usd: 9,
      total_calls: 2,
      total_minutes: 12,
      total_cost_usd: 1.5,
    }), 0.125);
  });

  test('returns null when there are zero minutes', () => {
    assert.equal(measuredCostPerMinute({
      total_users: 0,
      active_subscriptions: 0,
      mrr_usd: 0,
      total_calls: 0,
      total_minutes: 0,
      total_cost_usd: 2,
    }), null);
  });

  test('rounds to four decimal places', () => {
    assert.equal(measuredCostPerMinute({
      total_users: 1,
      active_subscriptions: 0,
      mrr_usd: 0,
      total_calls: 1,
      total_minutes: 3,
      total_cost_usd: 1,
    }), 0.3333);
  });
});
