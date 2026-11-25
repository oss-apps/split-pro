import type { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('~/server/db', () => ({
  db: {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

import { db } from '~/server/db';
import handler from '~/pages/api/readyz';

const createMockRes = () => {
  const res = {} as NextApiResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

describe('/api/readyz', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful checks', () => {
    it('responds with 200 ok when the database is reachable', async () => {
      (db.$transaction as jest.Mock).mockResolvedValue([undefined, [{ '?column?': 1 }]]);
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('scopes a 3s statement_timeout to the check via SET LOCAL', async () => {
      (db.$executeRaw as jest.Mock).mockReturnValue('SET_STATEMENT_TIMEOUT');
      (db.$queryRaw as jest.Mock).mockReturnValue('SELECT_1');
      (db.$transaction as jest.Mock).mockResolvedValue([undefined, [{ '?column?': 1 }]]);
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockRes();

      await handler(req, res);

      const executeRawCall = (db.$executeRaw as jest.Mock).mock.calls[0] as
        | [TemplateStringsArray, Prisma.Sql]
        | undefined;
      if (!executeRawCall) {
        throw new Error('Expected db.$executeRaw to have been called');
      }
      const [setTimeoutStrings, rawTimeoutValue] = executeRawCall;
      expect(setTimeoutStrings.join('')).toContain('SET LOCAL statement_timeout = ');
      expect(rawTimeoutValue.strings.join('')).toBe('3000');

      const queryRawCall = (db.$queryRaw as jest.Mock).mock.calls[0] as
        | [TemplateStringsArray]
        | undefined;
      if (!queryRawCall) {
        throw new Error('Expected db.$queryRaw to have been called');
      }
      const [selectStrings] = queryRawCall;
      expect(selectStrings.join('')).toBe('SELECT 1');

      // Order matters: the timeout must be set before SELECT 1 runs in the same transaction.
      expect((db.$transaction as jest.Mock).mock.calls[0]?.[0]).toEqual([
        'SET_STATEMENT_TIMEOUT',
        'SELECT_1',
      ]);
    });
  });

  describe('database failures', () => {
    it('responds with 503 when the database is unreachable', async () => {
      (db.$transaction as jest.Mock).mockRejectedValue(new Error('connection refused'));
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database not reachable',
      });
    });

    it('responds with 503 when the database check times out', async () => {
      (db.$transaction as jest.Mock).mockRejectedValue(
        new Error('canceling statement due to statement timeout'),
      );
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('method validation', () => {
    it('rejects non-GET methods', async () => {
      const req = { method: 'POST' } as NextApiRequest;
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect((res.setHeader as jest.Mock).mock.calls).toContainEqual(['Allow', 'GET']);
      expect((db.$executeRaw as jest.Mock).mock.calls).toHaveLength(0);
      expect((db.$queryRaw as jest.Mock).mock.calls).toHaveLength(0);
      expect((db.$transaction as jest.Mock).mock.calls).toHaveLength(0);
    });
  });
});
