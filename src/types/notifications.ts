import { z } from 'zod';

export const PushMessageSchema = z.object({
  title: z.string(),
  message: z.string(),
  data: z
    .object({
      url: z.string().optional(),
    })
    .optional(),
});

export type PushMessage = z.infer<typeof PushMessageSchema>;

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
});

export const SubscriptionEndpointSchema = z.object({
  endpoint: z.string().min(1),
});

export const UploadResponseSchema = z.object({
  key: z.string(),
});

export const parsePushMessage = (value: unknown) => PushMessageSchema.safeParse(value);

export const parsePushMessageJson = (text: string) => {
  try {
    const value: unknown = JSON.parse(text);
    return parsePushMessage(value);
  } catch {
    return null;
  }
};

export const getNotificationUrl = (value: unknown): string => {
  if ('object' !== typeof value || null === value || !('url' in value)) {
    return '/';
  }

  return 'string' === typeof value.url ? value.url : '/';
};
