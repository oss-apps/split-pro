import { type PushMessage } from '~/types';

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('push', function (event) {
  if (!event) return;
  const data = JSON.parse(event?.data?.text() ?? '{}') as PushMessage;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/icons/android-chrome-192x192.png',
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  if (!event) return;

  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (const _client of clientList) {
            if (_client.focused) {
              client = _client;
            }
          }

          return client?.focus();
        }
        return self.clients?.openWindow('/');
      }),
  );
});
