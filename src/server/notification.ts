import { type PushSubscription, sendNotification, setVapidDetails } from 'web-push';

import { env } from '~/env';

if (env.WEB_PUSH_EMAIL && env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY) {
  setVapidDetails(
    `mailto:${env.WEB_PUSH_EMAIL}`,
    env.WEB_PUSH_PUBLIC_KEY,
    env.WEB_PUSH_PRIVATE_KEY,
  );
}

export async function pushNotification(
  subscription: string,
  message: { title: string; message: string; data?: { url?: string } },
) {
  try {
    const _subscription = JSON.parse(subscription) as PushSubscription;
    const response = await sendNotification(_subscription, JSON.stringify(message));
    console.log('Push notification response', response);
  } catch (error) {
    console.error('Error sending push notification', error);
  }
}
