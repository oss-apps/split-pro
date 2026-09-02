import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '~/pages/api/healthz';

const createMockRes = () => {
  const res = {} as NextApiResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

describe('/api/healthz', () => {
  describe('GET requests', () => {
    it('responds with 200 ok for GET requests', () => {
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockRes();

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
    });
  });

  describe('method validation', () => {
    it('rejects non-GET methods', () => {
      const req = { method: 'POST' } as NextApiRequest;
      const res = createMockRes();

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect((res.setHeader as jest.Mock).mock.calls).toContainEqual(['Allow', 'GET']);
    });
  });
});
