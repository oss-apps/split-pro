import { useIsPwa } from '~/hooks/useIsPwa';
import { useTranslation } from 'next-i18next';
import { DownloadAppDrawer } from './Account/DownloadAppDrawer';

const InstallApp: React.FC = () => {
  const { t } = useTranslation('account_page');
  const isStandalone = useIsPwa();

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
