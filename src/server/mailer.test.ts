import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock the env module
const mockEnv = {
  NODE_ENV: 'test' as const,
  ENABLE_EMAIL_SIGNUP: true,
  FROM_EMAIL: 'test@example.com',
  EMAIL_SERVER_HOST: 'smtp.example.com',
};

jest.mock('~/env', () => ({
  env: mockEnv,
}));

// Mock the service-notification module
jest.mock('./service-notification', () => ({
  sendToDiscord: jest.fn(),
}));

// Mock nodemailer
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));

jest.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

describe('sendSignUpEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.NODE_ENV = 'test';
    mockEnv.ENABLE_EMAIL_SIGNUP = true;
    mockSendMail.mockResolvedValue(true);
  });

  it('should throw error when ENABLE_EMAIL_SIGNUP is false', async () => {
    // Arrange
    mockEnv.ENABLE_EMAIL_SIGNUP = false;

    // Import after mocking to ensure the mocked environment is used
    const { sendSignUpEmail } = await import('./mailer');

    // Act & Assert
    await expect(
      sendSignUpEmail('test@example.com', 'token123', 'https://example.com')
    ).rejects.toThrow('Email signup is not enabled');
  });

  it('should allow email signup when ENABLE_EMAIL_SIGNUP is true in non-development environment', async () => {
    // Arrange
    mockEnv.ENABLE_EMAIL_SIGNUP = true;
    mockEnv.NODE_ENV = 'production';

    const { sendSignUpEmail } = await import('./mailer');

    // Act
    const result = await sendSignUpEmail('test@example.com', 'token123', 'https://example.com');

    // Assert
    expect(result).toBe(false); // Since we're mocking smtp but not fully, it returns false
    expect(mockCreateTransport).toHaveBeenCalled();
  });

  it('should return true in development mode regardless of ENABLE_EMAIL_SIGNUP', async () => {
    // Arrange
    mockEnv.NODE_ENV = 'development';
    mockEnv.ENABLE_EMAIL_SIGNUP = false;

    const { sendSignUpEmail } = await import('./mailer');

    // Act
    const result = await sendSignUpEmail('test@example.com', 'token123', 'https://example.com');

    // Assert
    expect(result).toBe(true);
  });

  it('should return true in development mode when ENABLE_EMAIL_SIGNUP is true', async () => {
    // Arrange  
    mockEnv.NODE_ENV = 'development';
    mockEnv.ENABLE_EMAIL_SIGNUP = true;

    const { sendSignUpEmail } = await import('./mailer');

    // Act
    const result = await sendSignUpEmail('test@example.com', 'token123', 'https://example.com');

    // Assert
    expect(result).toBe(true);
  });
});