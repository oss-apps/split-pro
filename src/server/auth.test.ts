import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock the env module
const mockEnv = {
  DISABLE_EMAIL_SIGNUP: false,
  INVITE_ONLY: false,
};

// Mock the db module
const mockDb = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock('~/env', () => ({
  env: mockEnv,
}));

jest.mock('~/server/db', () => ({
  db: mockDb,
}));

// Mock PrismaAdapter
jest.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({
    createUser: jest.fn(),
  })),
}));

describe('NextAuth signIn callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.DISABLE_EMAIL_SIGNUP = false;
    mockEnv.INVITE_ONLY = false;
  });

  it('should allow OAuth providers to sign in regardless of email signup settings', async () => {
    // Arrange
    mockEnv.DISABLE_EMAIL_SIGNUP = true;
    
    const { authOptions } = await import('./auth');
    const signInCallback = authOptions.callbacks!.signIn!;

    // Act
    const result = await signInCallback({
      user: { email: 'test@example.com', id: '1' },
      account: { provider: 'google' },
      profile: {},
    });

    // Assert
    expect(result).toBe(true);
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it('should allow existing users to sign in via email when signup is disabled', async () => {
    // Arrange
    mockEnv.DISABLE_EMAIL_SIGNUP = true;
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 1, 
      email: 'existing@example.com' 
    });
    
    const { authOptions } = await import('./auth');
    const signInCallback = authOptions.callbacks!.signIn!;

    // Act
    const result = await signInCallback({
      user: { email: 'existing@example.com', id: '1' },
      account: { provider: 'email' },
      profile: {},
    });

    // Assert
    expect(result).toBe(true);
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'existing@example.com' },
    });
  });

  it('should redirect new users when email signup is disabled', async () => {
    // Arrange
    mockEnv.DISABLE_EMAIL_SIGNUP = true;
    mockDb.user.findUnique.mockResolvedValue(null); // User doesn't exist
    
    const { authOptions } = await import('./auth');
    const signInCallback = authOptions.callbacks!.signIn!;

    // Act
    const result = await signInCallback({
      user: { email: 'newuser@example.com', id: '1' },
      account: { provider: 'email' },
      profile: {},
    });

    // Assert
    expect(result).toBe('/auth/signin?error=SignupDisabled');
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'newuser@example.com' },
    });
  });

  it('should allow new users to sign in via email when signup is enabled', async () => {
    // Arrange
    mockEnv.DISABLE_EMAIL_SIGNUP = false;
    mockDb.user.findUnique.mockResolvedValue(null); // User doesn't exist
    
    const { authOptions } = await import('./auth');
    const signInCallback = authOptions.callbacks!.signIn!;

    // Act
    const result = await signInCallback({
      user: { email: 'newuser@example.com', id: '1' },
      account: { provider: 'email' },
      profile: {},
    });

    // Assert
    expect(result).toBe(true);
    // Should not check database when signups are enabled
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });
});