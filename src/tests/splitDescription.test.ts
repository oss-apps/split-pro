/** @jest-environment node */

import { SplitType, type User } from '@prisma/client';
import { createInstance } from 'i18next';
import { readFileSync } from 'node:fs';

import config from '../../next-i18next.config.js';
import { generateSplitDescription } from '~/utils/strings';
import { initSplitShares } from '~/store/addStore';

const user = (id: number, name: string): User => ({
  id,
  name,
  email: `qa${id}@example.com`,
  currency: 'EUR',
  defaultCurrency: null,
  emailVerified: null,
  image: null,
  preferredLanguage: 'en',
  obapiProviderId: null,
  bankingId: null,
  hiddenFriendIds: [],
});

const you = user(0, 'Ava');
const friend = user(1, 'Stanley');
const thirdPerson = user(2, 'Anna');

const createTranslator = async (locale = 'en') => {
  const instance = createInstance();
  config.onPreInitI18next!(instance);
  await instance.init({
    lng: locale,
    defaultNS: 'common',
    fallbackLng: 'en',
    resources: Object.fromEntries(
      ['en', 'fr', 'pt-PT', 'sv'].map((language) => [
        language,
        { common: JSON.parse(readFileSync(`public/locales/${language}/common.json`, 'utf8')) },
      ]),
    ),
    i18nFormat: config.i18nFormat,
  });
  return instance.t;
};

describe('generateSplitDescription', () => {
  it('uses the real ICU plural message for initially selected participants', async () => {
    const t = await createTranslator();
    expect(generateSplitDescription(t, SplitType.EQUAL, [you, friend], {}, you, you)).toBe(
      'split equally among 2 people',
    );
  });

  it.each([
    [you, friend, false, 'Stanley owes you'],
    [you, friend, true, 'You owe Stanley'],
    [friend, you, false, 'You owe Stanley'],
    [friend, you, true, 'Stanley owes you'],
    [friend, thirdPerson, false, 'Anna owes Stanley'],
    [friend, thirdPerson, true, 'Stanley owes Anna'],
    [you, you, false, 'No one else owes anything'],
    [you, you, true, 'No one else owes anything'],
  ])(
    'handles payer %j, beneficiary %j, negative=%s',
    async (payer, beneficiary, negative, expected) => {
      const t = await createTranslator();
      const participants = [you, friend, thirdPerson];
      const shares = Object.fromEntries(
        participants.map((participant) => [
          participant.id,
          { ...initSplitShares(), [SplitType.EQUAL]: participant.id === beneficiary.id ? 1n : 0n },
        ]),
      );
      expect(
        generateSplitDescription(t, SplitType.EQUAL, participants, shares, payer, you, negative),
      ).toBe(expected);
    },
  );

  it.each([
    ['fr', 'Stanley te doit'],
    ['pt-PT', 'Stanley deve-te'],
    ['sv', 'Stanley är skyldig dig'],
  ])('interpolates debtor names in %s after the upstream merge', async (locale, expected) => {
    const t = await createTranslator(locale);
    expect(
      generateSplitDescription(
        t,
        SplitType.EQUAL,
        [you, friend],
        { [you.id]: { ...initSplitShares(), [SplitType.EQUAL]: 0n } },
        you,
        you,
      ),
    ).toBe(expected);
  });
});
