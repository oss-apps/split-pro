import { type PushMessage } from '~/types';
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

self.addEventListener('push', function (event) {
  const { title, message, data } = JSON.parse(event?.data?.text() ?? '{}') as PushMessage;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: '/icons/android-chrome-192x192.png',
      data,
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window' });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const url = (event.notification.data?.url as string) ?? '/';

      const matchingClient = clientList.find((client) => client.focused) ?? clientList[0];

      if (matchingClient) {
        const client = await matchingClient.focus();
        await client.navigate(url);
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

serwist.addEventListeners();
