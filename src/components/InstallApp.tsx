import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { AppDrawer } from './ui/drawer';
import '../i18n/config';
import { useTranslation } from 'react-i18next';

const InstallApp: React.FC = () => {
  const [isStandalone, setIsStandalone] = React.useState(false);

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

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
            {t('app_download')}
          </Button>
        }
        leftAction="Close"
        title="Download App"
        className="h-[70vh]"
        shouldCloseOnAction
      >
        <div className="flex flex-col gap-8">
          <p>{t('app_download_description')}</p>

          <p>
          {t('app_download_ios')}{' '}
            <a
              className="text-cyan-500 underline"
              href="https://youtube.com/shorts/MQHeLOjr350"
              target="_blank"
            >
              {t('app_download_video')}
            </a>
          </p>

          <p>
          {t('app_download_android')}{' '}
            <a
              className="text-cyan-500 underline"
              href="https://youtube.com/shorts/04n7oKGzgOs"
              target="_blank"
            >
              {t('app_download_video')}
            </a>
          </p>
        </div>
      </AppDrawer>

      <p>{t('or')}</p>
    </>
  );
};

export default InstallApp;
