interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseAdminUserLike {
  id?: unknown;
  email?: unknown;
}

interface SupabaseListUsersResult {
  data: { users?: SupabaseAdminUserLike[] } | null;
  error: SupabaseErrorLike | null;
}

interface SupabaseCreateUserResult {
  data: { user?: SupabaseAdminUserLike } | null;
  error: SupabaseErrorLike | null;
}

interface SupabaseClientLike {
  auth: {
    admin: {
      listUsers(params: { page: number; perPage: number }): Promise<SupabaseListUsersResult>;
      createUser(attrs: { email: string; email_confirm: boolean }): Promise<SupabaseCreateUserResult>;
    };
  };
}

function firstString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// supabase-js's admin API has no direct "find user by email" call — only
// paginated listUsers(). Bounded pagination is an acceptable trade-off at
// current account volumes; revisit with a direct lookup (e.g. a `profiles`
// table keyed by email) if the user base grows large enough for this to
// become slow.
const MAX_LOOKUP_PAGES = 20;
const LOOKUP_PAGE_SIZE = 200;

export interface AccountProvisioningStore {
  findUserIdByEmail(email: string): Promise<string | null>;
  createUser(email: string): Promise<string | null>;
}

export function createAccountProvisioningStore(client: unknown): AccountProvisioningStore {
  const supabase = client as SupabaseClientLike;

  return {
    async findUserIdByEmail(email) {
      const target = email.trim().toLowerCase();
      for (let page = 1; page <= MAX_LOOKUP_PAGES; page += 1) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: LOOKUP_PAGE_SIZE });
        if (error || !data?.users) return null;

        const match = data.users.find((user) => firstString(user.email)?.toLowerCase() === target);
        if (match) return firstString(match.id);

        if (data.users.length < LOOKUP_PAGE_SIZE) return null;
      }
      return null;
    },

    async createUser(email) {
      const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
      if (error || !data?.user) return null;
      return firstString(data.user.id);
    },
  };
}

export interface ProvisionResult {
  userId: string;
  isNewUser: boolean;
}

/**
 * Shared identity resolution for every flow that provisions a click2call
 * account from an external identity instead of a signup form (HighLevel
 * OAuth install today; the MCP auth server later). Finds an existing user
 * by email, or creates a new password-less one.
 */
export async function provisionUserByEmail(
  store: AccountProvisioningStore,
  email: string,
): Promise<ProvisionResult | null> {
  const normalized = email.trim();
  if (!normalized) return null;

  const existingUserId = await store.findUserIdByEmail(normalized);
  if (existingUserId) return { userId: existingUserId, isNewUser: false };

  const newUserId = await store.createUser(normalized);
  if (!newUserId) return null;
  return { userId: newUserId, isNewUser: true };
}
