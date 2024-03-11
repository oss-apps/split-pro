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
const NOTIFICATION_DISMISSED_TIME_THRESHOLD = 1000 * 60 * 60 * 24 * 14; // 14 days

export const NotificationModal: React.FC = () => {
  const updatePushSubscription = api.user.updatePushNotification.useMutation();
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
        toast.success('You will receive notifications now');
        navigator.serviceWorker.ready
          .then(async (reg) => {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64ToUint8Array(env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY),
            });

            updatePushSubscription.mutate({ subscription: JSON.stringify(sub) });
          })
          .catch((e) => {
            toast.error('Cannot subscribe to notification');
          });
        setModalOpen(false);
      }
    } catch (e) {
      toast.error('Error requesting notification');
    }
  }

  function remindLater() {
    localStorage.setItem(NOTIFICATION_DISMISSED_TIME, Date.now().toString());
    setModalOpen(false);
  }

  return (
    <AlertDialog open={modalOpen}>
      <AlertDialogContent className=" rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Enable notifications</AlertDialogTitle>
          <AlertDialogDescription>
            Don&apos;t miss on important events. Subscribe to get notification for added expenses
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={remindLater}>Remind later</AlertDialogCancel>
          <AlertDialogAction onClick={onRequestNotification}>
            <Bell className="mr-1 h-4" />
            Subscribe
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
