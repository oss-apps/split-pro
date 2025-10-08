import React from 'react';
import cronstrue from 'cronstrue';
import { useTranslation } from 'next-i18next';

export const useIntlCronParser = () => {
  const { i18n } = useTranslation();

  const [_cronParser, setCronParser] = React.useState<any>(null);

  React.useEffect(() => {
    void import('cronstrue/i18n').then((mod) => setCronParser(mod));
  }, []);

  const cronParser = React.useCallback(
    (expression: string) =>
      (_cronParser ?? cronstrue).toString(expression, {
        locale: i18n.language.split('-')[0],
        use24HourTimeFormat: true,
      }),
    [i18n.language, _cronParser],
  );

  return { cronParser, i18nReady: !!_cronParser };
};
