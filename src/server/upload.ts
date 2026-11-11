import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';

import { env } from '~/env';

import { type File, formidable } from 'formidable';
import { fileExists } from '~/utils/file';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Store a multipart `file` upload as WebP (plus thumbnail) for the given user
 * and respond with its file key. Shared by the app route (`/api/upload`, cookie
 * session) and the public API route (`/api/v1/upload`, API key), which must
 * disable Next's body parser and authenticate the request beforehand.
 */
export const handleUpload = async (req: NextApiRequest, res: NextApiResponse, userId: number) => {
  if (!(await fileExists(UPLOAD_DIR))) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  const form = formidable({
    keepExtensions: true,
    maxFileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
  });

  let uploadedFile: File | undefined = undefined;

  try {
    const [, files] = await form.parse(req);
    uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const userDir = path.join(UPLOAD_DIR, String(userId));

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
};
