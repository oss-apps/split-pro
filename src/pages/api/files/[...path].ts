import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '~/server/auth';
import { fileExists } from '~/utils/file';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

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

  const filePath = path.join(UPLOAD_DIR, ...pathParts);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).send('Forbidden');
  }

  if (!(await fileExists(filePath))) {
    return res.status(404).send('File not found');
  }

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');

  const fileStream = await fs
    .open(filePath, 'r')
    .then((fileHandle) => fileHandle.createReadStream());
  fileStream.pipe(res);
}
