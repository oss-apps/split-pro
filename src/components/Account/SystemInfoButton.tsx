import React, { useCallback, useState } from 'react';
import { Bug, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { AccountButton } from './AccountButton';

interface SystemInfo {
  appVersion: string;
  browser: string;
  browserVersion: string;
  os: string;
  screenResolution: string;
  language: string;
  timezone: string;
  userAgent: string;
  timestamp: string;
}

const getSystemInfo = (): SystemInfo => {
  const userAgent = navigator.userAgent;
  const date = new Date();

  // Parse browser info
  let browser = 'Unknown';
  let browserVersion = 'Unknown';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    browserVersion = match?.[1] ?? 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    browserVersion = match?.[1] ?? 'Unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/([0-9.]+)/);
    browserVersion = match?.[1] ?? 'Unknown';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/([0-9.]+)/);
    browserVersion = match?.[1] ?? 'Unknown';
  }

  // Parse OS info
  let os = 'Unknown';
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  return {
    appVersion: process.env.NODE_ENV === 'development' ? '0.1.0-dev' : '0.1.0',
    browser: `${browser} ${browserVersion}`,
    browserVersion,
    os,
    screenResolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent,
    timestamp: date.toISOString(),
  };
};

const formatSystemInfo = (info: SystemInfo): string => {
  return `### System Information

**App Version:** ${info.appVersion}
**Browser:** ${info.browser}
**Operating System:** ${info.os}
**Screen Resolution:** ${info.screenResolution}
**Language:** ${info.language}
**Timezone:** ${info.timezone}
**Timestamp:** ${info.timestamp}

**User Agent:** 
\`${info.userAgent}\`

### Issue Description
<!-- Please describe your issue below -->


### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
<!-- What did you expect to happen? -->


### Actual Behavior
<!-- What actually happened? -->


### Additional Context
<!-- Add any other context about the problem here -->
`;
};

export const SystemInfoButton: React.FC = () => {
  const { t } = useTranslation('account_page');
  const [open, setOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState<string>('');

  const generateSystemInfo = useCallback(() => {
    const info = getSystemInfo();
    const formatted = formatSystemInfo(info);
    setSystemInfo(formatted);
    setOpen(true);
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(systemInfo);
      toast.success(
        t('ui.system_info.messages.copied_success', 'System information copied to clipboard!'),
      );
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error(t('ui.system_info.errors.copy_failed', 'Failed to copy to clipboard'));
    }
  }, [systemInfo, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AccountButton onClick={generateSystemInfo}>
          <Bug className="size-5 text-orange-500" />
          {t('ui.system_info.title', 'Generate bug report info')}
        </AccountButton>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="size-5 text-orange-500" />
            {t('ui.system_info.dialog.title', 'System Information for Bug Report')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'ui.system_info.dialog.description',
              'Copy this information when reporting issues on GitHub. It helps developers understand your environment.',
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={systemInfo}
            readOnly
            className="min-h-96 font-mono text-sm"
            placeholder={t('ui.system_info.placeholder', 'System information will appear here...')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('ui.system_info.buttons.close', 'Close')}
            </Button>
            <Button onClick={copyToClipboard} className="gap-2">
              <Copy className="size-4" />
              {t('ui.system_info.buttons.copy', 'Copy to Clipboard')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
