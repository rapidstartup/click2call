import {
  getPlanByPriceId,
  type PlanLike,
  type StripeWebhookClient,
} from './stripe';

type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';

type ProcessedStatus = SubscriptionStatus | 'unchanged';

interface RecordValue {
  [key: string]: unknown;
}

export interface UserPlanUpsert {
  userId: string;
  planId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: SubscriptionStatus | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface StripeWebhookStore {
  listPlans(): Promise<PlanLike[]>;
  upsertUserPlan(args: UserPlanUpsert): Promise<unknown>;
}

interface RpcError {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}

interface SupabaseQuery {
  select(columns?: string): SupabaseQuery;
  then<TResult1 = { data: unknown; error: RpcError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: RpcError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}

interface SupabaseClientLike {
  from(table: string): SupabaseQuery;
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: RpcError | null }>;
}

export type StripeWebhookResult =
  | { kind: 'processed'; planId?: string; status: ProcessedStatus }
  | { kind: 'ignored' }
  | { kind: 'unauthorized' }
  | { kind: 'invalid' };

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

function firstString(...values: unknown[]): string | null {
  const value = values.find((candidate): candidate is string => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return value?.trim() || null;
}


function getPath(value: unknown, path: string[]): unknown {
  let current: unknown = value;
  for (const segment of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[segment];
  }
  return current;
}

function objectFromEvent(event: RecordValue): RecordValue | null {
  return asRecord(getPath(event, ['data', 'object']));
}

function metadataFrom(...values: unknown[]): RecordValue {
  for (const value of values) {
    const metadata = asRecord(asRecord(value)?.metadata);
    if (metadata) return metadata;
  }
  return {};
}

function idFrom(value: unknown): string | null {
  return firstString(asRecord(value)?.id, value);
}

function customerIdFrom(...values: unknown[]): string | null {
  return firstString(...values.flatMap((value) => {
    const record = asRecord(value);
    return [
      idFrom(record?.customer),
      idFrom(record?.customer_id),
      typeof value === 'string' ? value : null,
    ];
  }));
}

function subscriptionIdFrom(...values: unknown[]): string | null {
  return firstString(...values.flatMap((value) => {
    const record = asRecord(value);
    return [
      idFrom(record?.subscription),
      idFrom(record?.subscription_id),
      idFrom(getPath(record, ['parent', 'subscription_details', 'subscription'])),
      idFrom(getPath(record, ['parent', 'subscription_details', 'subscription_id'])),
      record?.object === 'subscription' || firstString(record?.id)?.startsWith('sub_')
        ? firstString(record?.id)
        : null,
    ];
  }));
}

function priceIdFrom(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;

  const lineItems = asRecord(record.line_items);
  const lineItemData = Array.isArray(lineItems?.data) ? lineItems.data : [];
  const firstLineItem = asRecord(lineItemData[0]);
  const displayItems = asRecord(record.display_items);
  const displayItemData = Array.isArray(displayItems?.data) ? displayItems.data : [];
  const firstDisplayItem = asRecord(displayItemData[0]);
  const items = asRecord(record.items);
  const itemData = Array.isArray(items?.data) ? items.data : [];
  const firstItem = asRecord(itemData[0]);

  return firstString(
    idFrom(record.price),
    idFrom(record.plan),
    idFrom(firstLineItem?.price),
    idFrom(firstLineItem?.plan),
    idFrom(firstDisplayItem?.price),
    idFrom(firstDisplayItem?.plan),
    idFrom(firstItem?.price),
    idFrom(firstItem?.plan),
  );
}

function userIdFrom(...values: unknown[]): string | null {
  const metadataValues = values.map((value) => {
    const metadata = metadataFrom(value);
    return [metadata.user_id, metadata.userId];
  }).flat();

  return firstString(
    ...metadataValues,
    ...values.map((value) => asRecord(value)?.client_reference_id),
  );
}

function planIdFromMetadata(plans: readonly PlanLike[], ...values: unknown[]): PlanLike | null {
  const planId = firstString(...values.map((value) => {
    const metadata = metadataFrom(value);
    return [metadata.plan_id, metadata.planId];
  }).flat());

  return planId ? plans.find((plan) => plan.id === planId) || null : null;
}

function dateFromStripe(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function fallbackPeriod(): { start: string; end: string } {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

function statusFrom(...values: unknown[]): SubscriptionStatus | null {
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().toLowerCase().replace(/-/g, '_')
      : '';
    if ([
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired',
    ].includes(normalized)) {
      return normalized as SubscriptionStatus;
    }
  }
  return null;
}

function eventStatus(record: RecordValue, fallback: SubscriptionStatus | null = null): SubscriptionStatus | null {
  return statusFrom(
    record.status,
    record.subscription_status,
    getPath(record, ['subscription_details', 'status']),
    getPath(record, ['parent', 'subscription_details', 'status']),
  ) || fallback;
}

function planForRecord(plans: readonly PlanLike[], record: RecordValue, ...context: unknown[]): PlanLike | null {
  const pricePlan = getPlanByPriceId(plans, priceIdFrom(record));
  return pricePlan || planIdFromMetadata(plans, record, ...context);
}

function buildPlanUpsert(input: {
  plans: readonly PlanLike[];
  record: RecordValue;
  context?: unknown[];
  status: SubscriptionStatus | null;
  periodStart: string | null;
  periodEnd: string | null;
  fallbackPeriods?: boolean;
}): UserPlanUpsert | null {
  const context = input.context || [];
  const plan = planForRecord(input.plans, input.record, ...context);
  const userId = userIdFrom(input.record, ...context);
  const subscriptionId = subscriptionIdFrom(input.record, ...context);
  if (!plan || !userId || !subscriptionId) return null;

  const periods = input.fallbackPeriods ? fallbackPeriod() : null;
  return {
    userId,
    planId: plan.id,
    stripeCustomerId: customerIdFrom(input.record, ...context),
    stripeSubscriptionId: subscriptionId,
    status: input.status,
    periodStart: input.periodStart || periods?.start || null,
    periodEnd: input.periodEnd || periods?.end || null,
  };
}

async function processUpsert(
  store: StripeWebhookStore,
  args: UserPlanUpsert | null,
): Promise<StripeWebhookResult> {
  if (!args) return { kind: 'invalid' };
  await store.upsertUserPlan(args);
  return {
    kind: 'processed',
    planId: args.planId,
    status: args.status || 'unchanged',
  };
}

export async function processStripeWebhook(input: {
  rawBody: string;
  signature: string | undefined;
  secret: string;
  stripeClient: StripeWebhookClient;
  store: StripeWebhookStore;
}): Promise<StripeWebhookResult> {
  if (!input.signature || !input.secret) return { kind: 'unauthorized' };

  let event: unknown;
  try {
    event = input.stripeClient.webhooks.constructEvent(
      input.rawBody,
      input.signature,
      input.secret,
    );
  } catch {
    return { kind: 'unauthorized' };
  }

  const eventRecord = asRecord(event);
  const eventType = firstString(eventRecord?.type);
  const record = eventRecord ? objectFromEvent(eventRecord) : null;
  if (!eventType || !record) return { kind: 'invalid' };

  if (![
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
  ].includes(eventType)) {
    return { kind: 'ignored' };
  }

  const plans = await input.store.listPlans();

  if (eventType === 'checkout.session.completed') {
    const subscription = record.subscription;
    if (!subscription) return { kind: 'ignored' };
    const subscriptionRecord = asRecord(subscription);
    const status = eventStatus(subscriptionRecord || record, 'active');
    const args = buildPlanUpsert({
      plans,
      record,
      context: subscriptionRecord ? [subscriptionRecord] : [],
      status,
      periodStart: dateFromStripe(subscriptionRecord?.current_period_start),
      periodEnd: dateFromStripe(subscriptionRecord?.current_period_end),
      fallbackPeriods: true,
    });
    return processUpsert(input.store, args);
  }

  if (eventType === 'customer.subscription.updated') {
    const args = buildPlanUpsert({
      plans,
      record,
      status: eventStatus(record),
      periodStart: dateFromStripe(record.current_period_start),
      periodEnd: dateFromStripe(record.current_period_end),
    });
    return processUpsert(input.store, args);
  }

  if (eventType === 'customer.subscription.deleted') {
    const args = buildPlanUpsert({
      plans,
      record,
      status: 'canceled',
      periodStart: null,
      periodEnd: null,
    });
    return processUpsert(input.store, args);
  }

  const subscription = asRecord(record.subscription);
  const status = eventType === 'invoice.payment_failed'
    ? 'past_due'
    : eventStatus(record, eventStatus(subscription || {}, null));
  const args = buildPlanUpsert({
    plans,
    record,
    context: subscription ? [subscription] : [],
    status,
    periodStart: dateFromStripe(subscription?.current_period_start),
    periodEnd: dateFromStripe(subscription?.current_period_end),
  });
  return processUpsert(input.store, args);
}

export function createStripeWebhookStore(client: SupabaseClientLike): StripeWebhookStore {
  return {
    async listPlans() {
      const { data, error } = await client
        .from('plans')
        .select('id, name, stripe_test_price_id, stripe_live_price_id');
      if (error || !Array.isArray(data)) return [];

      return data.flatMap((value): PlanLike[] => {
        const row = asRecord(value);
        const id = firstString(row?.id);
        const name = firstString(row?.name);
        if (!id || !name) return [];
        return [{
          id,
          name,
          stripe_test_price_id: firstString(row?.stripe_test_price_id),
          stripe_live_price_id: firstString(row?.stripe_live_price_id),
        }];
      });
    },

    async upsertUserPlan(args) {
      const { data, error } = await client.rpc('upsert_user_plan', {
        p_user_id: args.userId,
        p_plan_id: args.planId,
        p_stripe_customer_id: args.stripeCustomerId,
        p_stripe_subscription_id: args.stripeSubscriptionId,
        p_status: args.status,
        p_period_start: args.periodStart,
        p_period_end: args.periodEnd,
      });
      if (error) {
        throw new Error(error.message || error.details || error.code || 'User plan upsert failed');
      }
      return data;
    },
  };
}