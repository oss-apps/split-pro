import { type PushMessage } from '~/types';

declare let self: ServiceWorkerGlobalScope;

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
