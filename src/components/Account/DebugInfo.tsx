import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '~/utils/api';
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
import { cn } from '~/lib/utils';
import { Button } from '../ui/button';

export const DebugInfo: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation('common');
  const [newVersion, setNewVersion] = React.useState<string | null>(null);
  const sendTestPushNotification = api.user.sendTestPushNotification.useMutation();

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

    if (env.NEXT_PUBLIC_APP_VERSION) {
      void fetchLatestVersion();
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    // Copy to clipboard
    const debugInfo = [`UserAgent: ${navigator.userAgent}`];
    if (env.NEXT_PUBLIC_GIT_SHA) {
      debugInfo.push(`${t('account.debug_info_details.git')}: ${env.NEXT_PUBLIC_GIT_SHA}`);
    }
    if (env.NEXT_PUBLIC_APP_VERSION) {
      debugInfo.push(`${t('account.debug_info_details.version')} ${env.NEXT_PUBLIC_APP_VERSION}`);
    }
    try {
      void navigator.clipboard.writeText(debugInfo.join('\n'));
    } catch (error) {
      toast.error(t('account.debug_info_details.copy_failed'));
      console.error('Failed to copy debug info:', error);
    }
  }, [t]);

  const onSendTestNotification = useCallback(async () => {
    try {
      const result = await sendTestPushNotification.mutateAsync();
      if (0 === result.sentCount) {
        toast.error(t('account.debug_info_details.test_notification_failed'));
        return;
      }

      toast.success(t('account.debug_info_details.test_notification_sent'));
    } catch (error) {
      toast.error(t('account.debug_info_details.test_notification_failed'));
      console.error('Failed to send test push notification:', error);
    }
  }, [sendTestPushNotification, t]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('account.debug_info_details.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('account.debug_info_details.description')}
            <DebugInfoRow
              label={t('account.debug_info_details.user_agent')}
              value={navigator.userAgent}
              className="mt-4"
            />

            <DebugInfoRow
              label={t('account.debug_info_details.git')}
              value={env.NEXT_PUBLIC_GIT_SHA}
              className="mt-4"
            />
            <DebugInfoRow
              label={t('account.debug_info_details.version')}
              value={env.NEXT_PUBLIC_APP_VERSION}
              className="mt-4"
            />
            {newVersion &&
            env.NEXT_PUBLIC_APP_VERSION &&
            newVersion !== env.NEXT_PUBLIC_APP_VERSION ? (
              <p className="mt-4 text-sm text-yellow-600">
                {t('account.debug_info_details.new_version_available')}: {newVersion}
              </p>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              void onSendTestNotification();
            }}
            loading={sendTestPushNotification.isPending}
          >
            {t('account.debug_info_details.send_test_notification')}
          </Button>
          <AlertDialogCancel>{t('actions.close')}</AlertDialogCancel>
          <AlertDialogAction onClick={copyToClipboard}>{t('actions.copy')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Label: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => <span className={cn('text-sm text-white', className)}>{children}</span>;

const Value: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => <span className={cn('text-primary text-sm', className)}>{children}</span>;

export const DebugInfoRow: React.FC<
  React.PropsWithChildren<{ label: string; value?: string | null; className?: string }>
> = ({ label, value, className }) =>
  value ? (
    <span className={cn('flex flex-col', className)}>
      <Label>{label}</Label>
      <Value>{value}</Value>
    </span>
  ) : null;
