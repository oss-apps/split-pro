/** @jest-environment node */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Resource, createInstance } from 'i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import config from '../../next-i18next.config.js';

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
        expect(message).not.toMatch(/\{\{|\}\}/);
        const values = Object.fromEntries(
          [...message.matchAll(/\{(\w+)\}/g)].map((match) => [
            match[1]!,
            `<${match[1]} & 'value'>`,
          ]),
        );
        expect(instance.t(key, { ns: namespace, ...values })).toBe(
          message.replace(/\{(\w+)\}/g, (_, name: string) => values[name]!),
        );
      }
    }
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
