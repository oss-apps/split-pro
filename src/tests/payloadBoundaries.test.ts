jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

jest.mock('~/env', () => ({ env: {} }));
jest.mock('~/server/db', () => ({ db: {} }));
jest.mock('browser-image-compression', () => ({ __esModule: true, default: jest.fn() }));

import { getSubscriptionEndpoint } from '~/server/api/services/notificationService';
import webpush from 'web-push';
import { pushNotification } from '~/server/notification';
import { uploadImage } from '~/utils/imageUpload';

describe('runtime payload boundaries', () => {
  const originalFetch = global.fetch;
  const mockSendNotification = jest.mocked(webpush.sendNotification);

  beforeEach(() => {
    mockSendNotification.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('extracts an endpoint without requiring subscription keys and rejects invalid JSON or null', () => {
    expect(getSubscriptionEndpoint('{"endpoint":"opaque endpoint","expirationTime":null}')).toBe(
      'opaque endpoint',
    );
    expect(getSubscriptionEndpoint('{')).toBeNull();
    expect(getSubscriptionEndpoint('null')).toBeNull();
  });

  it('returns the existing failure result and skips web-push for an invalid subscription', async () => {
    await expect(
      pushNotification('{"endpoint":"opaque endpoint"}', {
        title: 'Title',
        message: 'Body',
      }),
    ).resolves.toEqual({ ok: false, statusCode: undefined });
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('sends a valid subscription and payload through web-push', async () => {
    mockSendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    const message = { title: 'Title', message: 'Body', data: { url: '/expenses/1' } };
    const subscription = {
      endpoint: 'opaque endpoint',
      keys: { auth: 'auth', p256dh: 'public-key' },
    };

    await expect(pushNotification(JSON.stringify(subscription), message)).resolves.toEqual({
      ok: true,
    });
    expect(mockSendNotification).toHaveBeenCalledWith(subscription, JSON.stringify(message));
  });

  it('returns a successful upload key and rejects malformed or wrong-shaped responses', async () => {
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ key: 'uploaded-key' }) });
    await expect(uploadImage(file)).resolves.toBe('uploaded-key');

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(uploadImage(file)).rejects.toThrow('Invalid upload response');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });
    await expect(uploadImage(file)).rejects.toThrow('Unexpected token');

    mockFetch.mockResolvedValue({ ok: false, statusText: 'Upload failed' });
    await expect(uploadImage(file)).rejects.toThrow('Upload failed');
  });
});
