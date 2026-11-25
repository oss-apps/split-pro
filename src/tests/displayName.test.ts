import { createInstance } from 'i18next';

import common from '../../public/locales/en/common.json';
import { displayName } from '~/utils/strings';

describe('displayName', () => {
  const i18n = createInstance();
  beforeAll(async () => {
    await i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      defaultNS: 'common',
      resources: {
        en: { common },
        // Test-only resource: community translations are maintained in Weblate.
        fr: { common: { actors: { deleted_user: 'Utilisateur supprimé', you: 'Toi' } } },
      },
    });
  });

  it('uses the viewer locale rather than the persisted deleted-user placeholder', () => {
    const user = { id: 1, name: 'Deleted user', deletedAt: new Date() };
    expect(displayName(i18n.getFixedT('en'), user)).toBe('Deleted user');
    expect(displayName(i18n.getFixedT('fr'), user)).toBe('Utilisateur supprimé');
    expect(user.name).toBe('Deleted user');
  });

  it('uses the deletion marker even when the stored name is empty or the session is stale', () => {
    expect(displayName(i18n.getFixedT('fr'), { id: 1, name: null, deletedAt: new Date() }, 1)).toBe(
      'Utilisateur supprimé',
    );
  });

  it('does not translate active users who happen to have the placeholder as their name', () => {
    expect(
      displayName(i18n.getFixedT('fr'), { id: 1, name: 'Deleted user', deletedAt: null }),
    ).toBe('Deleted user');
    expect(displayName(i18n.getFixedT('fr'), { id: 1, name: 'Alex' }, 1)).toBe('Toi');
  });

  it('keeps normal names and email fallbacks, including entities without a user ID', () => {
    const t = i18n.getFixedT('fr');
    expect(displayName(t, { name: 'Alex' })).toBe('Alex');
    expect(displayName(t, { email: 'alex@example.test' })).toBe('alex@example.test');
    expect(displayName(t, null)).toBe('');
  });

  it('falls back to English when the viewer locale has no translation yet', () => {
    expect(displayName(i18n.getFixedT('pl'), { deletedAt: new Date() })).toBe('Deleted user');
  });
});
