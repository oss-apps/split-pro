import { type AdapterAccount } from 'next-auth/adapters';

import { sanitiseAdapterAccount } from '~/server/authAccount';

describe('sanitiseAdapterAccount', () => {
  const account: AdapterAccount = {
    userId: '0012',
    type: 'oauth',
    provider: 'oidc',
    providerAccountId: 'external-subject',
  };

  it('preserves required identity fields without normalizing identifiers', () => {
    expect(sanitiseAdapterAccount(account)).toEqual(account);
  });

  it('preserves optional account fields and an existing account ID', () => {
    const withTokens: AdapterAccount = {
      ...account,
      id: 'existing-account',
      access_token: 'access',
      refresh_token: 'refresh',
      expires_at: 1234,
      token_type: 'bearer',
      scope: 'openid email',
      id_token: 'identity',
      session_state: 'session',
    };

    expect(sanitiseAdapterAccount(withTokens)).toEqual(withTokens);
  });

  it('removes provider-only fields without modifying the supplied account', () => {
    const withExtras: AdapterAccount = {
      ...account,
      custom_provider_claim: { enabled: true },
    };

    const sanitised = sanitiseAdapterAccount(withExtras);
    expect(sanitised).toEqual(account);
    expect(sanitised).not.toBe(withExtras);
    expect(withExtras.custom_provider_claim).toEqual({ enabled: true });
  });
});
