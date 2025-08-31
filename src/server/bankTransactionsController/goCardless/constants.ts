export const GOCARDLESS_CONSTANTS = {
  DEFAULT_INTERVAL_DAYS: 30,
  RANDOM_ID_LENGTH: 60,
  DEFAULT_LANGUAGE: 'EN',
  DATE_FORMAT: 'yyyy-MM-dd',
} as const;

export const ERROR_MESSAGES = {
  FAILED_FETCH_CACHED: 'Failed to fetch cached transactions',
  FAILED_FETCH_INSTITUTIONS: 'Failed to fetch institutions',
  FAILED_FETCH_TRANSACTIONS: 'Failed to fetch transactions',
  FAILED_LINK_BANK: 'Failed to link to bank',
} as const;
