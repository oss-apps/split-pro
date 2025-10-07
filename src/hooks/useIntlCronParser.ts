import React from 'react';
import cronstrue from 'cronstrue';

export const useIntlCronParser = () => {
  const [cronParser, setCronParser] = React.useState<any>(null);

  React.useEffect(() => {
    void import('cronstrue/i18n').then((mod) => setCronParser(mod));
  }, []);

  return { cronParser: cronParser || cronstrue, i18nReady: !!cronParser };
};
