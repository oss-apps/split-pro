import fs from 'node:fs/promises';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { type File, formidable } from 'formidable';
import { authOptions } from '~/server/auth';
import { importFromSplitwisePro } from '~/server/api/services/splitService';

export const config = {
  api: { bodyParser: false, responseLimit: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('POST' !== req.method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'none');
  res.flushHeaders();

  const flush = () => {
    if ('flush' in res && typeof res.flush === 'function') {
      (res as unknown as { flush: () => void }).flush();
    }
  };

  const send = (type: string, payload: object) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    flush();
  };

  let uploadedFile: File | undefined;
  try {
    const form = formidable({ maxFileSize: 50 * 1024 * 1024 });
    const [, files] = await form.parse(req);
    uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      send('error', { message: 'No file provided' });
      return res.end();
    }

    const content = await fs.readFile(uploadedFile.filepath, 'utf-8');
    const data = JSON.parse(content) as Record<string, unknown>;

    if (!data.user || !data.expenses || !data.friends) {
      send('error', { message: 'Invalid Splitwise backup file' });
      return res.end();
    }

    const result = await importFromSplitwisePro(
      session.user.id,
      data as unknown as Parameters<typeof importFromSplitwisePro>[1],
      (type, message) => send(type, { message }),
    );

    send('done', { result });
  } catch (error) {
    send('error', { message: String(error) });
  } finally {
    if (uploadedFile) {
      await fs.unlink(uploadedFile.filepath).catch(() => null);
    }
    res.end();
  }
}
