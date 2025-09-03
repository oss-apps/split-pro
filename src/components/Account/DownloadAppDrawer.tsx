import { Download } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { Button } from '../ui/button';
import { AppDrawer } from '../ui/drawer';
import useIsPwa from '~/hooks/useIsPwa';

interface DownloadAppDrawerProps {
  children?: ReactNode;
  className?: string;
}

export const DownloadAppDrawer: React.FC<DownloadAppDrawerProps> = ({ children, className }) => {
  const { t } = useTranslation('account_page');
  const isStandalone = useIsPwa();

  const DefaultTrigger = useMemo(
    () => (
      <Button className="w-[250px]">
        <Download className="mr-2 h-5 w-5 text-black" />
        {t('ui.download_app')}
      </Button>
    ),
    [t],
  );

  if (isStandalone) {
    return null;
  }

  return (
    <AppDrawer
      trigger={children ?? DefaultTrigger}
      leftAction={t('ui.actions.close', { ns: 'common' })}
      title={t('ui.download_app_details.title')}
      className={className ?? 'h-[70vh]'}
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
  );
};

export default DownloadAppDrawer;
