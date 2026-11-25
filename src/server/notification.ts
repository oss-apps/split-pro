/* oxlint-disable import/no-named-as-default-member */
import webpush from 'web-push';

import { env } from '~/env';
import { PushMessageSchema, PushSubscriptionSchema } from '~/types/notifications';
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
    const parsedSubscription: unknown = JSON.parse(subscription);
    const validatedSubscription = PushSubscriptionSchema.safeParse(parsedSubscription);
    if (!validatedSubscription.success) {
      throw new Error('Invalid push subscription');
    }

    const validatedMessage = PushMessageSchema.safeParse(message);
    if (!validatedMessage.success) {
      throw new Error('Invalid push message');
    }

    const response = await webpush.sendNotification(
      validatedSubscription.data,
      JSON.stringify(validatedMessage.data),
    );
    console.log('Push notification response', response);
    return { ok: true } as const;
  } catch (error) {
    console.error('Error sending push notification', error);
    const statusCode =
      'object' === typeof error &&
      null !== error &&
      'statusCode' in error &&
      'number' === typeof error.statusCode
        ? error.statusCode
        : undefined;

    return { ok: false, statusCode } as const;
  }
}
