import { useTranslation } from 'next-i18next';
import { type ReactNode } from 'react';

import { useIsPwa } from '~/hooks/useIsPwa';
import { AppDrawer } from '../ui/drawer';

interface DownloadAppDrawerProps {
  children: ReactNode;
  className?: string;
}

export const DownloadAppDrawer: React.FC<DownloadAppDrawerProps> = ({ children, className }) => {
  const { t } = useTranslation();
  const isStandalone = useIsPwa();

  if (isStandalone) {
    return null;
  }

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('actions.close')}
      title={t('account.download_app_details.title')}
      className={className ?? 'h-[70vh]'}
      shouldCloseOnAction
    >
      <div className="flex flex-col gap-8">
        <p>{t('account.download_app_details.download_as_pwa')}</p>

        <p>
          {t('account.download_app_details.using_ios')}{' '}
          <a
            className="text-cyan-500 underline"
            href="https://youtube.com/shorts/MQHeLOjr350"
            target="_blank"
            rel="noreferrer"
          >
            {t('account.download_app_details.video')}
          </a>
        </p>

        <p>
          {t('account.download_app_details.using_android')}{' '}
          <a
            className="text-cyan-500 underline"
            href="https://youtube.com/shorts/04n7oKGzgOs"
            target="_blank"
            rel="noreferrer"
          >
            {t('account.download_app_details.video')}
          </a>
        </p>
      </div>
    </AppDrawer>
  );
};
