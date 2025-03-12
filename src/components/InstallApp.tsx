import React from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { AppDrawer } from './ui/drawer';
import {useTranslation} from "react-i18next";

const InstallApp: React.FC = () => {
  const [isStandalone, setIsStandalone] = React.useState(false);
  const { t } = useTranslation('balances_page');

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

  React.useEffect(() => {
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
        trigger={
          <Button className="w-[250px]">
            <Download className="mr-2 h-5 w-5 text-black" />
            {t('ui/download_app')}
          </Button>
        }
        leftAction={t('ui/download_app_details/close')}
        title={t('ui/download_app_details/title')}
        className="h-[70vh]"
        shouldCloseOnAction
      >
        <div className="flex flex-col gap-8">
          <p>
            {t('ui/download_app_details/download_as_pwa')}
            {t('ui/download_app_details/using_ios') + ' '}
            <a
              className="text-cyan-500 underline"
              href="https://youtube.com/shorts/MQHeLOjr350"
              target="_blank"
            >
              {t('ui/download_app_details/video')}
            </a>
            {t('ui/download_app_details/using_android') + ' '}
            <a
              className="text-cyan-500 underline"
              href="https://youtube.com/shorts/04n7oKGzgOs"
              target="_blank"
            >
              {t('ui/download_app_details/video')}
            </a>
          </p>
        </div>
      </AppDrawer>

      <p>{t('ui/or')}</p>
    </>
  );
};

export default InstallApp;
