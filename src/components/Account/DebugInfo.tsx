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
import { cn } from '~/lib/utils';

export const DebugInfo: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation('common');
  const [newVersion, setNewVersion] = React.useState<string | null>(null);

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

    if (env.NEXT_PUBLIC_VERSION) {
      void fetchLatestVersion();
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    // Copy to clipboard
    const debugInfo = [`UserAgent: ${navigator.userAgent}`];
    if (env.NEXT_PUBLIC_GIT_SHA) {
      debugInfo.push(`${t('account.debug_info_details.git')}: ${env.NEXT_PUBLIC_GIT_SHA}`);
    }
    if (env.NEXT_PUBLIC_VERSION) {
      debugInfo.push(`${t('account.debug_info_details.version')} ${env.NEXT_PUBLIC_VERSION}`);
    }
    try {
      void navigator.clipboard.writeText(debugInfo.join('\n'));
    } catch (error) {
      toast.error(t('account.debug_info_details.copy_failed'));
      console.error('Failed to copy debug info:', error);
    }
  }, [t]);

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
              value={env.NEXT_PUBLIC_VERSION}
              className="mt-4"
            />
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
