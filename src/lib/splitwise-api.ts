/**
 * Splitwise API Service
 *
 * Provides methods to fetch data from Splitwise API for importing
 * expenses into SplitPro with complete accuracy.
 */

const API_BASE = 'https://secure.splitwise.com/api/v3.0';

// ============= TYPES =============

export interface SplitwiseUserShare {
  user_id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string | null;
    email: string;
    picture?: {
      medium?: string;
    };
  };
  paid_share: string;
  owed_share: string;
  net_balance: string;
}

export interface SplitwiseExpense {
  id: number;
  cost: string;
  description: string;
  details: string | null;
  date: string;
  currency_code: string;
  category: {
    id: number;
    name: string;
  };
  group_id: number | null;
  friendship_id: number | null;
  expense_bundle_id: number | null;
  repeats: boolean;
  repeat_interval: string | null;
  email_reminder: boolean;
  email_reminder_in_advance: number | null;
  next_repeat: string | null;
  comments_count: number;
  payment: boolean;
  transaction_confirmed: boolean;
  created_at: string;
  created_by: {
    id: number;
    first_name: string;
    last_name: string | null;
  };
  updated_at: string;
  updated_by: {
    id: number;
    first_name: string;
    last_name: string | null;
  } | null;
  deleted_at: string | null;
  deleted_by: {
    id: number;
    first_name: string;
    last_name: string | null;
  } | null;
  users: SplitwiseUserShare[];
  repayments: {
    from: number;
    to: number;
    amount: string;
  }[];
}

export interface SplitwiseGroupMember {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  registration_status: string;
  picture?: {
    medium?: string;
  };
  balance: {
    currency_code: string;
    amount: string;
  }[];
}

export interface SplitwiseGroup {
  id: number;
  name: string;
  group_type: string;
  updated_at: string;
  created_at: string;
  simplify_by_default: boolean;
  members: SplitwiseGroupMember[];
  original_debts: {
    from: number;
    to: number;
    amount: string;
    currency_code: string;
  }[];
  simplified_debts: {
    from: number;
    to: number;
    amount: string;
    currency_code: string;
  }[];
}

export interface SplitwiseFriend {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  registration_status: string;
  picture?: {
    medium?: string;
  };
  balance: {
    currency_code: string;
    amount: string;
  }[];
  groups: {
    group_id: number;
    balance: Array<{
      currency_code: string;
      amount: string;
    }>;
  }[];
}

export interface SplitwiseCurrentUser {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  picture?: {
    medium?: string;
  };
  default_currency: string;
}

// ============= API CLIENT =============

export class SplitwiseApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message);
    this.name = 'SplitwiseApiError';
  }
}

async function fetchFromSplitwise<T>(
  endpoint: string,
  apiKey: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new SplitwiseApiError(
      `Splitwise API request failed: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
    );
  }

  return response.json() as Promise<T>;
}

// ============= API METHODS =============

/**
 * Get current user info to validate API key
 */
export async function getCurrentUser(apiKey: string): Promise<SplitwiseCurrentUser> {
  const response = await fetchFromSplitwise<{
    user: SplitwiseCurrentUser;
  }>('/get_current_user', apiKey);
  return response.user;
}

/**
 * Get all groups for the current user
 */
export async function getGroups(apiKey: string): Promise<SplitwiseGroup[]> {
  const response = await fetchFromSplitwise<{ groups: SplitwiseGroup[] }>('/get_groups', apiKey);
  // Filter out the "Non-group expenses" (id: 0)
  return response.groups.filter((g) => g.id !== 0);
}

/**
 * Get all friends for the current user
 */
export async function getFriends(apiKey: string): Promise<SplitwiseFriend[]> {
  const response = await fetchFromSplitwise<{ friends: SplitwiseFriend[] }>('/get_friends', apiKey);
  return response.friends;
}

/**
 * Get expenses for a specific group with pagination
 */
export async function getGroupExpenses(
  apiKey: string,
  groupId: number,
  options: {
    limit?: number;
    offset?: number;
    datedAfter?: string;
    datedBefore?: string;
  } = {},
): Promise<SplitwiseExpense[]> {
  const params: Record<string, string | number> = {
    group_id: groupId,
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  };

  if (options.datedAfter) {
    params.dated_after = options.datedAfter;
  }
  if (options.datedBefore) {
    params.dated_before = options.datedBefore;
  }

  const response = await fetchFromSplitwise<{ expenses: SplitwiseExpense[] }>(
    '/get_expenses',
    apiKey,
    params,
  );

  return response.expenses;
}

/**
 * Get ALL expenses for a group (handles pagination automatically)
 */
export async function getAllGroupExpenses(
  apiKey: string,
  groupId: number,
  onProgress?: (fetched: number, total: number | null) => void,
): Promise<SplitwiseExpense[]> {
  const allExpenses: SplitwiseExpense[] = [];
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const expenses = await getGroupExpenses(apiKey, groupId, { limit, offset });

    // Filter out deleted expenses
    const activeExpenses = expenses.filter((e) => !e.deleted_at);
    allExpenses.push(...activeExpenses);

    onProgress?.(allExpenses.length, null);

    if (expenses.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allExpenses;
}

/**
 * Validate API key by trying to fetch current user
 */
export async function validateApiKey(
  apiKey: string,
): Promise<{ valid: boolean; user?: SplitwiseCurrentUser; error?: string }> {
  try {
    const user = await getCurrentUser(apiKey);
    return { valid: true, user };
  } catch (error) {
    if (error instanceof SplitwiseApiError) {
      if (error.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: error.message };
    }
    return { valid: false, error: 'Failed to validate API key' };
  }
}
