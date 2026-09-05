import nodemailer from 'nodemailer';

import { env } from '~/env';
import { sendToDiscord } from '~/server/service-notification';
import { sendInviteEmail } from '~/server/mailer';

jest.mock('~/env', () => ({
  env: {
    NODE_ENV: 'production',
    EMAIL_SERVER_HOST: 'smtp.example.com',
    EMAIL_SERVER_PORT: '587',
    EMAIL_SERVER_USER: 'user',
    EMAIL_SERVER_PASSWORD: 'pass',
    EMAIL_TLS_REJECT_UNAUTHORIZED: true,
    FROM_EMAIL: 'noreply@example.com',
    NEXTAUTH_URL: 'https://splitpro.example.com',
    ENABLE_SENDING_INVITES: true,
  },
}));

jest.mock('nodemailer', () => {
  const sendMail = jest.fn();
  return {
    __esModule: true,
    default: { createTransport: jest.fn(() => ({ sendMail })) },
  };
});

jest.mock('~/server/service-notification', () => ({
  sendToDiscord: jest.fn(),
}));

const mockCreateTransport = jest.mocked(nodemailer.createTransport);
const mockSendMail = jest.mocked(
  mockCreateTransport({} as Parameters<typeof nodemailer.createTransport>[0]).sendMail,
);
const mockSendToDiscord = jest.mocked(sendToDiscord);

describe('sendInviteEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { NODE_ENV: string }).NODE_ENV = 'production';
    (env as { ENABLE_SENDING_INVITES: boolean }).ENABLE_SENDING_INVITES = true;
  });

  it('resolves true when the email actually sends', async () => {
    mockSendMail.mockResolvedValue({
      messageId: 'test-message-id',
      envelope: { from: 'noreply@example.com', to: ['friend@example.com'] },
      accepted: ['friend@example.com'],
      rejected: [],
      pending: [],
      response: '250 OK',
    });

    await expect(sendInviteEmail('friend@example.com', 'Alice')).resolves.toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('resolves false when the SMTP transport fails', async () => {
    mockSendMail.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(sendInviteEmail('friend@example.com', 'Alice')).resolves.toBe(false);
    expect(mockSendToDiscord).toHaveBeenCalledTimes(1);
  });

  it('skips sending in development mode and resolves true', async () => {
    (env as { NODE_ENV: string }).NODE_ENV = 'development';

    await expect(sendInviteEmail('friend@example.com', 'Alice')).resolves.toBe(true);
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('still throws when invites are disabled', async () => {
    (env as { ENABLE_SENDING_INVITES: boolean }).ENABLE_SENDING_INVITES = false;

    await expect(sendInviteEmail('friend@example.com', 'Alice')).rejects.toThrow(
      'Sending invites is not enabled',
    );
  });
});
