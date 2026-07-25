import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '~/server/auth';
import { getObject } from '~/server/storage';

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

  // The key is the object path under the bucket, e.g. "<userId>/<uuid>.webp". Any signed-in
  // User may fetch it (receipts on shared expenses are viewable by all participants), which
  // Matches the previous behaviour.
  const key = pathParts.join('/');

  try {
    const object = await getObject(key);
    if (!object) {
      return res.status(404).send('File not found');
    }

    res.setHeader('Content-Type', object.contentType);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    object.body.pipe(res);
  } catch (error) {
    console.error('File fetch error:', error);
    return res.status(500).send('Internal Server Error');
  }
}
