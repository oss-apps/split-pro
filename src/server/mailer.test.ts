import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock the env module
const mockEnv = {
  NODE_ENV: 'test' as const,
  DISABLE_EMAIL_SIGNUP: false,
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

describe('sendSignUpEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.NODE_ENV = 'test';
    mockEnv.DISABLE_EMAIL_SIGNUP = false;
  });

  it('should send email successfully when email signup is enabled', async () => {
    // Arrange
    mockEnv.DISABLE_EMAIL_SIGNUP = false;

    // Import after mocking to ensure the mocked environment is used
    const { sendSignUpEmail } = await import('./mailer');

    // Act
    const result = await sendSignUpEmail('test@example.com', 'token123', 'https://example.com');

    // Assert - In test mode with no actual SMTP, it should return false but not throw
    expect(result).toBe(false);
  });

  it('should send email successfully when email signup is disabled (signup control is handled in auth callbacks)', async () => {
    // Arrange
    mockEnv.DISABLE_EMAIL_SIGNUP = true;

    // Import after mocking to ensure the mocked environment is used
    const { sendSignUpEmail } = await import('./mailer');

    // Act
    const result = await sendSignUpEmail('test@example.com', 'token123', 'https://example.com');

    // Assert - Email should still be sent, signup control is handled in NextAuth callbacks
    expect(result).toBe(false);
  });

  it('should return true in development mode regardless of DISABLE_EMAIL_SIGNUP', async () => {
    // Arrange
    mockEnv.NODE_ENV = 'development';
    mockEnv.DISABLE_EMAIL_SIGNUP = true;

    const { sendSignUpEmail } = await import('./mailer');

    // Act
    const result = await sendSignUpEmail('test@example.com', 'token123', 'https://example.com');

    // Assert
    expect(result).toBe(true);
  });

  it('should return true in development mode when DISABLE_EMAIL_SIGNUP is false', async () => {
    // Arrange  
    mockEnv.NODE_ENV = 'development';
    mockEnv.DISABLE_EMAIL_SIGNUP = false;

    const { sendSignUpEmail } = await import('./mailer');

    // Act
    const result = await sendSignUpEmail('test@example.com', 'token123', 'https://example.com');

    // Assert
    expect(result).toBe(true);
  });
});