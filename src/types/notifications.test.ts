import {
  PushSubscriptionSchema,
  SubscriptionEndpointSchema,
  UploadResponseSchema,
  getNotificationUrl,
  parsePushMessage,
  parsePushMessageJson,
} from './notifications';

describe('notification runtime boundaries', () => {
  it('rejects malformed and wrong-shaped push payloads', () => {
    expect(parsePushMessageJson('{')).toBeNull();
    expect(parsePushMessageJson('{"title":"Title"}')?.success).toBe(false);
    expect(parsePushMessage(null).success).toBe(false);
    expect(parsePushMessage({ title: 'Title' }).success).toBe(false);
    expect(parsePushMessage({ title: 'Title', message: 'Body' }).success).toBe(true);
  });

  it('accepts only a nonempty endpoint for endpoint extraction', () => {
    expect(SubscriptionEndpointSchema.safeParse({ endpoint: 'opaque endpoint' }).success).toBe(
      true,
    );
    expect(SubscriptionEndpointSchema.safeParse({ endpoint: '' }).success).toBe(false);
    expect(SubscriptionEndpointSchema.safeParse(null).success).toBe(false);
  });

  it('validates push delivery subscription keys without imposing URL policy', () => {
    expect(
      PushSubscriptionSchema.safeParse({
        endpoint: 'opaque endpoint',
        keys: { auth: 'auth', p256dh: 'public-key' },
        expirationTime: null,
      }).success,
    ).toBe(true);
    expect(PushSubscriptionSchema.safeParse({ endpoint: 'opaque endpoint' }).success).toBe(false);
  });

  it('rejects nullable or missing upload keys', () => {
    expect(UploadResponseSchema.safeParse({ key: 'image-key' }).success).toBe(true);
    expect(UploadResponseSchema.safeParse({ key: null }).success).toBe(false);
    expect(UploadResponseSchema.safeParse({}).success).toBe(false);
  });

  it('uses a string notification URL and otherwise preserves the root fallback', () => {
    expect(getNotificationUrl({ url: '/expenses/1' })).toBe('/expenses/1');
    expect(getNotificationUrl({ url: null })).toBe('/');
    expect(getNotificationUrl(null)).toBe('/');
  });
});
