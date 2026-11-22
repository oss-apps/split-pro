import fs from 'node:fs/promises';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '~/server/auth';
import { resolveUploadPath } from '~/server/uploads';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('GET' !== req.method) {
    return res.status(405).end();
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(403).send('Unauthorized');
  }

  const { path: pathParts } = req.query;

  if (!pathParts || !Array.isArray(pathParts)) {
    return res.status(400).send('Invalid path');
  }

  const resolved = await resolveUploadPath(pathParts);
  if ('forbidden' === resolved.status) {
    return res.status(403).send('Forbidden');
  }
  if ('not-found' === resolved.status) {
    return res.status(404).send('File not found');
  }
  const filePath = resolved.path;

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');

  const fileStream = await fs
    .open(filePath, 'r')
    .then((fileHandle) => fileHandle.createReadStream());
  fileStream.pipe(res);
}
