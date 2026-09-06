export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function getAppErrorCode(cause: unknown): string | null {
  return cause instanceof AppError ? cause.code : null;
}
