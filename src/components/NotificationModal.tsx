import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { env } from '~/env';
import { Bell, BellOff, ChevronRight } from 'lucide-react';
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
} from './ui/alert-dialog';
import { useAppStore } from '~/store/appStore';
import '../i18n/config';
import { useTranslation } from 'react-i18next';

const base64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const NOTIFICATION_DISMISSED_TIME = 'notification_dismissed_time';
const NOTIFICATION_DISMISSED_TIME_THRESHOLD = 1000 * 60 * 60 * 24 * 30; // 14 days

export const NotificationModal: React.FC = () => {
  const updatePushSubscription = api.user.updatePushNotification.useMutation();
  const webPushPublicKey = useAppStore((s) => s.webPushPublicKey);

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // run only in browser
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.pushManager
            .getSubscription()
            .then((sub) => {
              if (!sub) {
                const _notificationTime = localStorage.getItem(NOTIFICATION_DISMISSED_TIME);
                if (
                  !_notificationTime ||
                  Date.now() - parseInt(_notificationTime) > NOTIFICATION_DISMISSED_TIME_THRESHOLD
                ) {
                  setModalOpen(true);
                }
              }
            })
            .catch(console.error);
        })
        .catch(console.error);
    }
  }, []);

  async function onRequestNotification() {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        toast.success(t('notifications_enabled'));
        navigator.serviceWorker.ready
          .then(async (reg) => {
            if (!webPushPublicKey) {
              return;
            }
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64ToUint8Array(webPushPublicKey),
            });

            updatePushSubscription.mutate({ subscription: JSON.stringify(sub) });
          })
          .catch((e) => {
            toast.error(t('notifications_error'));
          });
        setModalOpen(false);
      }
    } catch (e) {
      toast.error(t('notifications_error'));
    }
  }

  function remindLater() {
    localStorage.setItem(NOTIFICATION_DISMISSED_TIME, Date.now().toString());
    setModalOpen(false);
  }

  if (!webPushPublicKey) {
    return null;
  }

  return (
    <AlertDialog open={modalOpen}>
      <AlertDialogContent className=" rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('notification_enable')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('notifications_description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={remindLater}>{t('notifications_remind_later')}</AlertDialogCancel>
          <AlertDialogAction onClick={onRequestNotification}>
            <Bell className="mr-1 h-4" />
            {t('subscribe')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
