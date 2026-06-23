import fs from 'node:fs/promises';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { type File, formidable } from 'formidable';
import { authOptions } from '~/server/auth';
import { importSplitProData, restoreSplitProData } from '~/server/api/services/splitService';

export const config = {
  api: { bodyParser: false },
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
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (type: string, payload: object) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  let uploadedFile: File | undefined;
  try {
    const form = formidable({ maxFileSize: 50 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    uploadedFile = files.file?.[0];
    const mode = (fields.mode?.[0] ?? 'merge') as 'merge' | 'restore';

    if (!uploadedFile) {
      send('error', { message: 'No file provided' });
      return res.end();
    }

    const content = await fs.readFile(uploadedFile.filepath, 'utf-8');
    const data = JSON.parse(content) as Record<string, unknown>;

    if (!data.version || !data.expenses || !data.users) {
      send('error', { message: 'Invalid SplitPro backup file' });
      return res.end();
    }

    const importFn = mode === 'restore' ? restoreSplitProData : importSplitProData;
    const result = await importFn(
      session.user.id,
      data as unknown as Parameters<typeof importSplitProData>[1],
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
