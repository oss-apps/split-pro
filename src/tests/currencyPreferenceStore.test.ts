import { SHOW_ALL_VALUE, useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

const resetStore = () =>
  useCurrencyPreferenceStore.setState({
    recentCurrencies: [],
    userDefaultCurrency: null,
    groupDefaultCurrencies: {},
    preferences: {},
  });

beforeEach(() => {
  sessionStorage.clear();
  resetStore();
});

describe('getPreference – entity type isolation', () => {
  it('returns userDefaultCurrency for a friend entity even when a group with the same id has a different default currency', () => {
    const collidingId = 5;

    // Simulate visiting the Groups page: group id=5 has USD as its default
    useCurrencyPreferenceStore.getState().setGroupDefaultCurrency(collidingId, 'USD');
    // User's own currency is EUR
    useCurrencyPreferenceStore.getState().setUserDefaultCurrency('EUR');

    // When rendering a friend balance entry (no entityType), USD must not leak in
    const preference = useCurrencyPreferenceStore.getState().getPreference(collidingId);

    expect(preference).toBe('EUR');
    expect(preference).not.toBe('USD');
  });

  it('returns the group default currency when entityType is "group"', () => {
    const groupId = 5;
    useCurrencyPreferenceStore.getState().setGroupDefaultCurrency(groupId, 'USD');
    useCurrencyPreferenceStore.getState().setUserDefaultCurrency('EUR');

    const preference = useCurrencyPreferenceStore.getState().getPreference(groupId, 'group');

    expect(preference).toBe('USD');
  });

  it('respects an explicit preference over all defaults for both entity types', () => {
    const id = 7;
    useCurrencyPreferenceStore.getState().setGroupDefaultCurrency(id, 'USD');
    useCurrencyPreferenceStore.getState().setUserDefaultCurrency('EUR');
    useCurrencyPreferenceStore.getState().setPreference(id, 'GBP');

    expect(useCurrencyPreferenceStore.getState().getPreference(id)).toBe('GBP');
    expect(useCurrencyPreferenceStore.getState().getPreference(id, 'group')).toBe('GBP');
  });

  it('falls back to SHOW_ALL when no preference, no group default (for group entity), and no user default', () => {
    const preference = useCurrencyPreferenceStore.getState().getPreference(99, 'group');
    expect(preference).toBe(SHOW_ALL_VALUE);
  });

  it('falls back to SHOW_ALL for a friend entity with no preference and no user default', () => {
    useCurrencyPreferenceStore.getState().setGroupDefaultCurrency(3, 'USD');
    const preference = useCurrencyPreferenceStore.getState().getPreference(3);
    expect(preference).toBe(SHOW_ALL_VALUE);
  });

  it('uses the global (string) key when no entityId is provided', () => {
    useCurrencyPreferenceStore.getState().setUserDefaultCurrency('JPY');
    expect(useCurrencyPreferenceStore.getState().getPreference()).toBe('JPY');
  });
});
