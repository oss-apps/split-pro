import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { env } from '~/env';
import { Bell, ChevronRight } from 'lucide-react';
import { api } from '~/utils/api';

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

export const SubscribeNotification: React.FC = () => {
  const updatePushSubscription = api.user.updatePushNotification.useMutation();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // run only in browser
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.pushManager
            .getSubscription()
            .then((sub) => {
              console.log('sub', sub);
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
      }
    } catch (e) {
      toast.error('Error requesting notification');
    }
    console.log('Requesting Notification');
  }

  return (
    <>
      <Button
        variant="ghost"
        className="text-md w-full justify-between px-0 hover:text-foreground/80"
        onClick={onRequestNotification}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-red-400" />
          Notifications
        </div>
        <ChevronRight className="h-6 w-6 text-gray-500" />
      </Button>
    </>
  );
};
