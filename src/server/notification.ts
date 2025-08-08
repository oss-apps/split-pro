/* oxlint-disable import/no-named-as-default-member */
import webpush from 'web-push';

import { env } from '~/env';
import { type PushMessage } from '~/types';

if (env.WEB_PUSH_EMAIL && env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${env.WEB_PUSH_EMAIL}`,
    env.WEB_PUSH_PUBLIC_KEY,
    env.WEB_PUSH_PRIVATE_KEY,
  );
}

export async function pushNotification(subscription: string, message: PushMessage) {
  try {
    const _subscription = JSON.parse(subscription) as webpush.PushSubscription;
    const response = await webpush.sendNotification(_subscription, JSON.stringify(message));
    console.log('Push notification response', response);
  } catch (error) {
    console.error('Error sending push notification', error);
  }
}
