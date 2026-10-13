/** @jest-environment node */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Resource, createInstance } from 'i18next';
import { IntlMessageFormat } from 'intl-messageformat';
import { Trans } from 'next-i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import config from '../../next-i18next.config.js';
import { getCurrencyHelpers } from '~/utils/numbers';

const localePath = join(process.cwd(), 'public/locales');
const locales = readdirSync(localePath).sort();
const resources: Resource = Object.fromEntries(
  locales.map((locale) => [
    locale,
    Object.fromEntries(
      readdirSync(join(localePath, locale)).map((file) => [
        file.replace(/\.json$/, ''),
        JSON.parse(readFileSync(join(localePath, locale, file), 'utf8')),
      ]),
    ),
  ]),
);

const messages = (value: unknown, prefix = ''): [string, string][] => {
  if ('string' === typeof value) {
    return [[prefix, value]];
  }
  if (!value || 'object' !== typeof value) {
    throw new Error('Translation messages must be strings or objects');
  }
  return Object.entries(value).flatMap(([key, child]) =>
    messages(child, prefix ? `${prefix}.${key}` : key),
  );
};

const createTranslator = async (lng: string, data: Resource = resources) => {
  const instance = createInstance();
  config.onPreInitI18next!(instance);
  await instance.init({
    lng,
    ns: ['common', 'home', 'categories', 'currencies'],
    defaultNS: 'common',
    fallbackLng: config.fallbackLng,
    resources: data,
    i18nFormat: {
      ...config.i18nFormat,
      parseErrorHandler: (error: Error) => {
        throw error;
      },
    },
  });
  return instance;
};

describe('ICU migration', () => {
  it.each(locales)('formats every message in %s without changing its text', async (locale) => {
    const instance = await createTranslator(locale);
    for (const [namespace, catalog] of Object.entries(resources[locale]!)) {
      for (const [key, message] of messages(catalog)) {
        const formatter = new IntlMessageFormat(
          message,
          'ca@valencia' === locale ? 'ca-ES-valencia' : locale,
          undefined,
          { ignoreTag: true },
        );
        const values: Record<string, string | number> = {};
        const collectValues = (elements: ReturnType<IntlMessageFormat['getAst']>) => {
          elements.forEach((element) => {
            if (0 === element.type || 7 === element.type) {
              return;
            }
            if (8 === element.type) {
              throw new Error('Translation markup requires a component-specific test');
            }
            values[element.value] =
              6 === element.type
                ? 2
                : 5 === element.type
                  ? 'other'
                  : `<${element.value} & 'value'>`;
            if ('options' in element) {
              Object.values(element.options).forEach((option) => collectValues(option.value));
            }
          });
        };
        collectValues(formatter.getAst());
        expect(instance.t(key, { ns: namespace, ...values })).toBe(formatter.format(values));
      }
    }
  });

  it.each([
    ['expense_details.balance_list.settled', 'You are settled up', 'Marco is settled up'],
    ['expense_details.balance_list.lent', 'You lent', 'Marco lent'],
    ['expense_details.balance_list.owes', 'You owe', 'Marco owes'],
    ['activity.user_deleted_expense', 'You deleted Dinner', 'Marco deleted Dinner'],
    ['expense_list.user_paid', 'You paid €10', 'Marco paid €10'],
    ['expense_list.user_received', 'You received €10', 'Marco received €10'],
    ['expense_metadata.added_by', 'Added by you on 12 October', 'Added by Marco on 12 October'],
    ['expense_metadata.edited_by', 'Edited by you on 12 October', 'Edited by Marco on 12 October'],
    [
      'expense_metadata.deleted_by',
      'Deleted by you on 12 October',
      'Deleted by Marco on 12 October',
    ],
  ])('restores both actor forms for %s', async (key, currentUser, otherUser) => {
    const instance = await createTranslator('en');
    const values = {
      person: 'Marco',
      user: 'Marco',
      expense: 'Dinner',
      amount: '€10',
      date: '12 October',
    };
    expect(instance.t(key, { ...values, actor: 'you' })).toBe(currentUser);
    expect(instance.t(key, { ...values, actor: 'other' })).toBe(otherUser);
  });

  it.each([
    [
      'you',
      'other',
      'You pay €10 to Anna',
      'Anna gets €10 from you',
      'You paid €10 to Anna',
      'You pay Anna',
    ],
    [
      'other',
      'you',
      'Marco pays €10 to you',
      'You get €10 from Marco',
      'Marco paid you €10',
      'Marco pays you',
    ],
    [
      'other',
      'other',
      'Marco pays €10 to Anna',
      'Anna gets €10 from Marco',
      'Marco paid €10 to Anna',
      'Marco pays Anna',
    ],
  ])(
    'restores nested roles for payer=%s and receiver=%s',
    async (payerRole, receiverRole, pays, gets, settlement, transfer) => {
      const instance = await createTranslator('en');
      const values = {
        payerRole,
        receiverRole,
        senderRole: payerRole,
        payer: 'Marco',
        sender: 'Marco',
        receiver: 'Anna',
        amount: '€10',
      };
      expect(instance.t('balance_list.pays', values)).toBe(pays);
      expect(instance.t('balance_list.gets', values)).toBe(gets);
      expect(instance.t('expense_list.settlement', values)).toBe(settlement);
      expect(instance.t('ui.transfer', values)).toBe(transfer);
      expect(instance.t('expense_list.conversion_for_users', values)).toBe(
        `Currency conversion for ${'you' === payerRole ? 'you' : 'Marco'} and ${'you' === receiverRole ? 'you' : 'Anna'}`,
      );
    },
  );

  it.each(['en', 'it', 'fr', 'default'])(
    'restores real catalog plurals and fallback for %s',
    async (locale) => {
      const instance = await createTranslator(locale);
      expect(
        instance.t(
          'expense_details.add_expense_details.split_type_section.split_equally_with_count',
          { count: 1 },
        ),
      ).toBe('split equally among 1 person');
      expect(
        instance.t(
          'expense_details.add_expense_details.split_type_section.split_equally_with_count',
          { count: 3 },
        ),
      ).toBe('split equally among 3 people');
      expect(instance.t('balance_summary.more', { count: 1 })).toBe('1 more balance');
      expect(instance.t('balance_summary.more', { count: 2 })).toBe('2 more balances');
    },
  );

  it.each(config.i18n.locales)('includes the sign-in error argument in %s', async (locale) => {
    const instance = await createTranslator(locale);
    expect(instance.t('errors.signin_error', { error: 'OAuthCallback' })).toContain(
      'OAuthCallback',
    );
  });

  it('rejects old double-brace interpolation', async () => {
    const instance = await createTranslator('en', {
      en: { common: { message: 'Hello {{name}}' } },
    });
    expect(() => instance.t('message', { name: 'Marco' })).toThrow();
  });

  it.each([
    ['expense_participant.gets', 'you', 'You', 'You get €10'],
    ['expense_participant.gets', 'other', 'Marco', 'Marco gets €10'],
    ['expense_participant.owes', 'you', 'You', 'You owe €10'],
    ['expense_participant.owes', 'other', 'Marco', 'Marco owes €10'],
    ['expense_participant.paid', 'you', 'You', 'You paid €10'],
    ['expense_participant.received', 'other', 'Marco', 'Marco received €10'],
  ])('renders %s with one clickable user component', async (key, actor, name, expected) => {
    const instance = await createTranslator('en');
    const html = renderToStaticMarkup(
      createElement(Trans, {
        i18n: instance,
        i18nKey: key,
        values: { actor },
        components: {
          person: createElement('a', { href: '/balances/42' }, name),
          amount: createElement('span', { className: 'amount' }, '€10'),
        },
      }),
    );
    expect(html.replace(/<[^>]+>/g, '')).toBe(expected);
    expect(html.match(/href="\/balances\/42"/g)).toHaveLength(1);
    expect(html.match(new RegExp(name, 'g'))).toHaveLength(1);
    expect(html).toContain('<span class="amount">€10</span>');
  });

  it('lets the translation reorder the user and amount components', async () => {
    const instance = await createTranslator('en', {
      en: { common: { reordered: '<amount/> is owed by <person/>' } },
    });
    const html = renderToStaticMarkup(
      createElement(Trans, {
        i18n: instance,
        i18nKey: 'reordered',
        components: {
          person: createElement('a', { href: '/balances/42' }, 'Marco'),
          amount: createElement('span', null, '€10'),
        },
      }),
    );
    expect(html.replace(/<[^>]+>/g, '')).toBe('€10 is owed by Marco');
    expect(html).toContain('<a href="/balances/42">Marco</a>');
  });

  it('keeps user-supplied markup inside the component as escaped text', async () => {
    const instance = await createTranslator('en');
    const html = renderToStaticMarkup(
      createElement(Trans, {
        i18n: instance,
        i18nKey: 'expense_participant.owes',
        values: { actor: 'other' },
        components: {
          person: createElement(
            'a',
            { href: '/balances/42' },
            '<person href="https://evil.example">',
          ),
          amount: createElement('span', null, '€10'),
        },
      }),
    );
    expect(html).toContain('&lt;person href=');
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/balances/42"');
    expect(html).not.toContain('href="https://evil.example"');
  });

  it.each([
    ['en', 'EUR', '€'],
    ['it', 'EUR', '€'],
    ['fr', 'EUR', '€'],
    ['en', 'USD', '$'],
    ['en', 'JPY', '¥'],
  ])('shows the recurrence currency symbol once for %s/%s', async (locale, currency, symbol) => {
    const instance = await createTranslator(locale);
    const { toUIString, formatter } = getCurrencyHelpers({ locale, currency });
    const description = instance.t('recurrence.expense_for_the_amount_of', {
      name: 'QA expense',
      amount: toUIString(2000n, false, true),
      currency: formatter.formatToParts(0).find(({ type }) => 'currency' === type)?.value ?? '',
    });
    expect(description.split(symbol)).toHaveLength(2);
    expect(description).not.toContain(currency);
  });

  it.each(['default', 'zz', 'fr-CA'])('keeps English fallback for %s', async (locale) => {
    const instance = await createTranslator(locale, {
      en: { common: { message: 'Hello {name}' } },
      fr: { common: {} },
    });
    expect(instance.t('message', { name: 'Marco' })).toBe('Hello Marco');
    expect(instance.t('missing.key')).toBe('missing.key');
  });

  it.each(['en', 'fr', 'default'])('loads serializable SSR resources for %s', async (locale) => {
    const props = await serverSideTranslations(locale, ['common', 'home'], config);
    const state = props._nextI18Next!;
    expect(state.initialLocale).toBe(locale);
    expect(state.userConfig).toBeNull();
    expect(state.initialI18nStore.en).toEqual({
      common: resources.en!.common,
      home: resources.en!.home,
    });
    const hydrated = await createTranslator(
      locale,
      JSON.parse(JSON.stringify(state.initialI18nStore)),
    );
    const catalogLocale = 'default' === locale ? 'en' : locale;
    const message = messages(resources[catalogLocale]!.common).find(
      ([key]) => 'auth.continue_with' === key,
    )![1];
    expect(hydrated.t('auth.continue_with', { provider: 'GitHub' })).toBe(
      message.replace('{provider}', 'GitHub'),
    );
    expect(hydrated.t('missing.key')).toBe('missing.key');
  });

  it('uses ICU plural rules, including exact zero and language-specific categories', async () => {
    const instance = await createTranslator('en', {
      en: { common: { items: '{count, plural, =0 {No items} one {# item} other {# items}}' } },
      pl: {
        common: {
          items: '{count, plural, one {# rzecz} few {# rzeczy} many {# rzeczy} other {# rzeczy}}',
        },
      },
    });
    expect(instance.t('items', { count: 0 })).toBe('No items');
    expect(instance.t('items', { count: 1 })).toBe('1 item');
    expect(instance.t('items', { count: 2 })).toBe('2 items');
    await instance.changeLanguage('pl');
    expect(instance.t('items', { count: 1 })).toBe('1 rzecz');
    expect(instance.t('items', { count: 2 })).toBe('2 rzeczy');
    expect(instance.t('items', { count: 5 })).toBe('5 rzeczy');
    expect(instance.t('items', { count: 1.5 })).toBe('1,5 rzeczy');
  });
});
