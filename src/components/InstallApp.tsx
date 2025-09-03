import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import DownloadAppDrawer from './Account/DownloadAppDrawer';

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
      <DownloadAppDrawer />
      <p>{t('ui.or', { ns: 'common' })}</p>
    </>
  );
};

export default InstallApp;
