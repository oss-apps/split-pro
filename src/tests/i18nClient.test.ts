import { getSupportedLanguages } from '~/utils/i18n/client';

describe('getSupportedLanguages', () => {
  it('includes Indonesian locale metadata', () => {
    expect(getSupportedLanguages()).toContainEqual({
      code: 'id',
      name: 'Bahasa Indonesia',
    });
  });
});
