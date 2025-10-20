import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { toast } from 'sonner';
import { env } from '~/env';

export const DebugInfo: React.FC<React.PropsWithChildren<{ gitRevision: string | null }>> = ({
  children,
  gitRevision,
}) => {
  const { t } = useTranslation('common');
  const [newVersion, setNewVersion] = React.useState<string | null>('v1.6.3');

  useEffect(() => {
    // Check github releases API for latest version
    const fetchLatestVersion = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/oss-apps/split-pro/releases/latest',
        );
        const data = await response.json();
        if (data.tag_name) {
          setNewVersion(data.tag_name);
        }
      } catch (error) {
        console.error('Failed to fetch latest version:', error);
      }
    };

    if (process.env.NEXT_PUBLIC_VERSION) {
      void fetchLatestVersion();
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    // Copy to clipboard
    const debugInfo = [`UserAgent: ${navigator.userAgent}`];
    if (gitRevision) {
      debugInfo.push(`${t('account.debug_info_details.git')}: ${gitRevision}`);
    }
    if (process.env.NEXT_PUBLIC_VERSION) {
      debugInfo.push(
        `${t('account.debug_info_details.version')} ${process.env.NEXT_PUBLIC_VERSION}`,
      );
    }
    try {
      void navigator.clipboard.writeText(debugInfo.join('\n'));
    } catch (error) {
      toast.error(t('account.debug_info_details.copy_failed'));
      console.error('Failed to copy debug info:', error);
    }
  }, [gitRevision, t]);

  return (
    <AlertDialog>
      <AlertDialogTrigger>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('account.debug_info_details.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            <p>{t('account.debug_info_details.description')}</p>
            <pre className="mt-4 text-wrap">
              {t('account.debug_info_details.user_agent')}:
              <br />
              {navigator.userAgent}
            </pre>
            {gitRevision && (
              <pre className="text-wrap">
                {t('account.debug_info_details.git')}:<br />
                {gitRevision}
              </pre>
            )}
            {process.env.NEXT_PUBLIC_VERSION && (
              <pre className="text-wrap">
                {t('account.debug_info_details.version')}:<br />
                {env.NEXT_PUBLIC_VERSION}
              </pre>
            )}
            {newVersion && env.NEXT_PUBLIC_VERSION && newVersion !== env.NEXT_PUBLIC_VERSION ? (
              <p className="mt-4 text-sm text-yellow-600">
                {t('account.debug_info_details.new_version_available')}: {newVersion}
              </p>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('actions.close')}</AlertDialogCancel>
          <AlertDialogAction onClick={copyToClipboard}>{t('actions.copy')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
