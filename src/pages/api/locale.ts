import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupportedLanguages } from '~/utils/i18n/client';

const supportedLocales = getSupportedLanguages().map((lang) => lang.code);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { locale } = req.query;

  if (!locale || Array.isArray(locale) || !supportedLocales.includes(locale)) {
    return res
      .status(400)
      .json({ message: `Invalid locale, accepted values are: ${supportedLocales.join(', ')}` });
  }

  const cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`;
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ message: 'Successfully set NEXT_LOCALE cookie!' });
}
