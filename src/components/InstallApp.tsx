import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';

import { Button } from './ui/button';
import { AppDrawer } from './ui/drawer';

const InstallApp: React.FC = () => {
  const { t } = useTranslation('account_page');
  const [isStandalone, setIsStandalone] = useState(false);

  function isAppStandalone() {
    // For iOS
    if ('standalone' in navigator) {
      return (navigator as unknown as { standalone: boolean }).standalone;
    }
    // For Android
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    // Fallback for browsers that don't support the above methods
    return false;
  }

  const DownloadButton = useMemo(
    () => (
      <Button className="w-[250px]">
        <Download className="mr-2 h-5 w-5 text-black" />
        {t('ui.download_app')}
      </Button>
    ),
    [t],
  );

  useEffect(() => {
    if (isAppStandalone()) {
      setIsStandalone(true);
    }
  }, []);

  if (isStandalone) {
    return null;
  }

  return (
    <>
      <AppDrawer
        trigger={DownloadButton}
        leftAction={t('ui.actions.close', { ns: 'common' })}
        title={t('ui.download_app_details.title')}
        className="h-[70vh]"
        shouldCloseOnAction
      >
        <div className="flex flex-col gap-8">
          <p>{t('ui.download_app_details.download_as_pwa')}</p>

          <p>
            {t('ui.download_app_details.using_ios')}{' '}
            <a
              className="text-cyan-500 underline"
              href="https://youtube.com/shorts/MQHeLOjr350"
              target="_blank"
              rel="noreferrer"
            >
              {t('ui.download_app_details.video')}
            </a>
          </p>

          <p>
            {t('ui.download_app_details.using_android')}{' '}
            <a
              className="text-cyan-500 underline"
              href="https://youtube.com/shorts/04n7oKGzgOs"
              target="_blank"
              rel="noreferrer"
            >
              {t('ui.download_app_details.video')}
            </a>
          </p>
        </div>
      </AppDrawer>

      <p>{t('ui.or', { ns: 'common' })}</p>
    </>
  );
};

export default InstallApp;
