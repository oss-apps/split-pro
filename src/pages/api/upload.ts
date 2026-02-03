import { randomUUID } from 'crypto';
import fs from 'node:fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import sharp from 'sharp';

import { authOptions } from '~/server/auth';

import formidable from 'formidable';
import { fileExists } from '~/utils/file';

export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('POST' !== req.method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!(await fileExists(UPLOAD_DIR))) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  let uploadedFile: formidable.File | undefined;

  try {
    const [, files] = await form.parse(req);
    uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const userId = String(session.user.id);
    const userDir = path.join(UPLOAD_DIR, userId);

    if (!(await fileExists(userDir))) {
      await fs.mkdir(userDir, { recursive: true });
    }

    const fileUUID = randomUUID();
    const fileName = `${fileUUID}.webp`;
    const thumbName = `${fileUUID}-thumb.webp`;
    const finalPath = path.join(userDir, fileName);
    const thumbPath = path.join(userDir, thumbName);

    const fileBuffer = await fs.readFile(uploadedFile.filepath);

    await sharp(fileBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(finalPath);

    await sharp(fileBuffer).resize(200).webp({ quality: 60 }).toFile(thumbPath);

    return res.status(200).json({
      key: `${userId}/${fileName}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    try {
      if (uploadedFile) {
        await fs.unlink(uploadedFile.filepath);
      }
    } catch {
      // Ignore errors
    }
  }
}
