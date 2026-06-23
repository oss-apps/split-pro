import fs from 'node:fs/promises';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { type File, formidable } from 'formidable';
import { authOptions } from '~/server/auth';
import { importFromSplitwisePro } from '~/server/api/services/splitService';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('POST' !== req.method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const form = formidable({ maxFileSize: 50 * 1024 * 1024 }); // 50 MB
  let uploadedFile: File | undefined;

  try {
    const [, files] = await form.parse(req);
    uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const content = await fs.readFile(uploadedFile.filepath, 'utf-8');
    const data = JSON.parse(content) as Record<string, unknown>;

    if (!data.user || !data.expenses || !data.friends) {
      return res.status(400).json({ error: 'Invalid Splitwise backup file' });
    }

    const result = await importFromSplitwisePro(
      session.user.id,
      data as unknown as Parameters<typeof importFromSplitwisePro>[1],
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Splitwise import error:', error);
    return res.status(500).json({ error: 'Import failed', details: String(error) });
  } finally {
    if (uploadedFile) {
      await fs.unlink(uploadedFile.filepath).catch(() => null);
    }
  }
}
