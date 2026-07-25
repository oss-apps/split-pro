import { randomUUID } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '~/server/auth';
import { env } from '~/env';
import { isStorageConfigured, putObject } from '~/server/storage';

// We read the raw request body ourselves and stream it straight to object storage —
// No multipart temp files, no local filesystem, no native image processing (sharp).
// The client compresses/resizes the image to webp before uploading.
export const config = {
  api: {
    bodyParser: false,
  },
};

const readBody = async (req: NextApiRequest, maxBytes: number): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > maxBytes) {
      throw new Error('File too large');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('POST' !== req.method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!isStorageConfigured()) {
    return res.status(500).json({ error: 'Object storage is not configured' });
  }

  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image uploads are allowed' });
  }

  try {
    const buffer = await readBody(req, env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024);
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const userId = String(session.user.id);
    const key = `${userId}/${randomUUID()}.webp`;

    await putObject(key, buffer, 'image/webp');

    return res.status(200).json({ key });
  } catch (error) {
    if (error instanceof Error && error.message === 'File too large') {
      return res.status(413).json({ error: 'File too large' });
    }
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
