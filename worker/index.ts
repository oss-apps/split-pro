import { defaultCache } from '@serwist/turbopack/worker';
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist';

import { getNotificationUrl, parsePushMessageJson } from '~/types/notifications';

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// Actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // oxlint-disable-next-line no-underscore-dangle -- Serwist replaces this declared manifest field during its build step.
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

self.addEventListener('push', (event) => {
  const result = parsePushMessageJson(event?.data?.text() ?? '{}');
  if (!result?.success) {
    console.warn('Ignoring invalid push notification payload');
    return;
  }

  const { title, message, data } = result.data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: '/icons/android-chrome-192x192.png',
      data,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window' });

      const url = getNotificationUrl(event.notification.data);

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
