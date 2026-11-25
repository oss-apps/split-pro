import { type SendMailOptions, type SentMessageInfo, createTransport } from 'nodemailer';
import EmailProvider from 'next-auth/providers/email';

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
  const createTransportMock = jest.fn(() => ({ sendMail }));
  return {
    __esModule: true,
    mockSendMail: sendMail,
    createTransport: createTransportMock,
  };
});

jest.mock('~/server/service-notification', () => ({
  sendToDiscord: jest.fn(),
}));

const mockCreateTransport = jest.mocked(createTransport);
const { mockSendMail } = jest.requireMock<{
  mockSendMail: jest.Mock<Promise<SentMessageInfo>, [SendMailOptions]>;
}>('nodemailer');
const mockSendToDiscord = jest.mocked(sendToDiscord);

const mockSentMessageInfo = {
  messageId: 'test-message-id',
  envelope: { from: 'noreply@example.com', to: ['friend@example.com'] },
  accepted: ['friend@example.com'],
  rejected: [],
  pending: [],
  response: '250 OK',
};

describe('sendInviteEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { NODE_ENV: string }).NODE_ENV = 'production';
    (env as { ENABLE_SENDING_INVITES: boolean }).ENABLE_SENDING_INVITES = true;
  });

  it('creates the SMTP transport with bounded timeouts', async () => {
    mockSendMail.mockResolvedValue(mockSentMessageInfo);

    await sendInviteEmail('friend@example.com', 'Alice');

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      }),
    );
  });

  describe('when the send succeeds', () => {
    it('resolves true when the email actually sends', async () => {
      mockSendMail.mockResolvedValue(mockSentMessageInfo);

      await expect(sendInviteEmail('friend@example.com', 'Alice')).resolves.toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it('escapes HTML special characters in the inviter name', async () => {
      mockSendMail.mockResolvedValue(mockSentMessageInfo);

      await sendInviteEmail('friend@example.com', `A&B <C> "D" 'E'`);

      const sentHtml = mockSendMail.mock.calls[0]?.[0]?.html;
      expect(sentHtml).toEqual(
        expect.stringContaining('A&amp;B &lt;C&gt; &quot;D&quot; &#39;E&#39;'),
      );
      expect(sentHtml).not.toEqual(expect.stringContaining(`A&B <C> "D" 'E'`));
    });

    it('does not alter or double-escape a plain alphanumeric name', async () => {
      mockSendMail.mockResolvedValue(mockSentMessageInfo);

      await sendInviteEmail('friend@example.com', 'Alice Smith');

      const sentHtml = mockSendMail.mock.calls[0]?.[0]?.html;
      expect(sentHtml).toEqual(expect.stringContaining('Alice Smith'));
    });
  });

  describe('when the send fails', () => {
    it('resolves false when the SMTP transport fails', async () => {
      mockSendMail.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(sendInviteEmail('friend@example.com', 'Alice')).resolves.toBe(false);
      expect(mockSendToDiscord).toHaveBeenCalledTimes(1);
    });

    it('resolves false when reporting the SMTP failure to Discord also fails', async () => {
      mockSendMail.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockSendToDiscord.mockRejectedValue(new Error('Discord unavailable'));

      await expect(sendInviteEmail('friend@example.com', 'Alice')).resolves.toBe(false);
    });
  });

  describe('in development mode', () => {
    it('skips sending and resolves true', async () => {
      (env as { NODE_ENV: string }).NODE_ENV = 'development';

      await expect(sendInviteEmail('friend@example.com', 'Alice')).resolves.toBe(true);
      expect(mockCreateTransport).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('when invites are disabled', () => {
    it('still throws', async () => {
      (env as { ENABLE_SENDING_INVITES: boolean }).ENABLE_SENDING_INVITES = false;

      await expect(sendInviteEmail('friend@example.com', 'Alice')).rejects.toThrow(
        'Sending invites is not enabled',
      );
    });
  });
});

describe('NextAuth email provider Nodemailer compatibility', () => {
  it('uses Nodemailer createTransport and sendMail for verification requests', async () => {
    const server = {
      host: 'smtp.example.com',
      port: 587,
      auth: { user: 'user', pass: 'pass' },
    };
    const provider = EmailProvider({ from: 'noreply@example.com', server });
    provider.server = server;
    provider.from = 'noreply@example.com';
    mockSendMail.mockResolvedValue(mockSentMessageInfo);

    await provider.sendVerificationRequest({
      identifier: 'friend@example.com',
      url: 'https://splitpro.example.com/verify?token=test',
      expires: new Date('2030-01-01T00:00:00.000Z'),
      provider,
      token: 'test',
      theme: {},
    });

    expect(mockCreateTransport).toHaveBeenCalledWith(server);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'friend@example.com',
        from: 'noreply@example.com',
        subject: 'Sign in to splitpro.example.com',
      }),
    );
  });
});
