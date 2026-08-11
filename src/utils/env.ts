const TRUE_ENV_VALUES = new Set(['1', 'true']);
const FALSE_ENV_VALUES = new Set(['0', 'false']);

export const parseEnvBoolean = (value: string | undefined, fallback = false): boolean => {
  const normalizedValue = value?.trim().toLowerCase();

  if (TRUE_ENV_VALUES.has(normalizedValue ?? '')) {
    return true;
  }

  if (FALSE_ENV_VALUES.has(normalizedValue ?? '')) {
    return false;
  }

  return fallback;
};
