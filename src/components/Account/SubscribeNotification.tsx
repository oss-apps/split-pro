import { Bell, BellOff, ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAppStore } from '~/store/appStore';
import { api } from '~/utils/api';

import { Button } from '../ui/button';

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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const webPushPublicKey = useAppStore((s) => s.webPushPublicKey);

  useEffect(() => {
    if ('undefined' !== typeof window && 'serviceWorker' in navigator) {
      // run only in browser
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.pushManager
            .getSubscription()
            .then((sub) => {
              if (sub) {
                setIsSubscribed(true);
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
      if ('granted' === result) {
        toast.success('You will receive notifications now');
        navigator.serviceWorker.ready
          .then(async (reg) => {
            if (!webPushPublicKey) {
              toast.error('Notification is not supported');
              return;
            }

            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64ToUint8Array(webPushPublicKey),
            });

            setIsSubscribed(true);
            updatePushSubscription.mutate({ subscription: JSON.stringify(sub) });
          })
          .catch((e) => {
            toast.error('Cannot subscribe to notification');
          });
      }
    } catch (e) {
      toast.error('Error requesting notification');
    }
  }

  async function unSubscribeNotification() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (e) {
      toast.error('Error unsubscribing notification');
    }
  }

  if (!webPushPublicKey) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        className="text-md hover:text-foreground/80 w-full justify-between px-0"
        onClick={isSubscribed ? unSubscribeNotification : onRequestNotification}
      >
        <div className="flex items-center gap-4">
          {!isSubscribed ? (
            <>
              <Bell className="h-5 w-5 text-red-400" />
              Enable Notification
            </>
          ) : (
            <>
              <BellOff className="h-5 w-5 text-red-400" />
              Disable notification
            </>
          )}
        </div>
        <ChevronRight className="h-6 w-6 text-gray-500" />
      </Button>
    </>
  );
};
