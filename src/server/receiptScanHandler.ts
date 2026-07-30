import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import sharp from 'sharp';

import {
  type ReceiptScanProvider,
  getReceiptScanProvider,
} from '~/server/api/services/receiptScanService';
import { authOptions } from '~/server/auth';
import { fileExists } from '~/utils/file';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Shared request handler for the receipt-scan endpoints. Performs the method,
 * provider, auth, ownership and path checks, reads the uploaded image and
 * delegates the actual extraction to `scan`. `errorMessage` is used both for
 * the server log and the 500 response body.
 */
export async function handleReceiptScan(
  req: NextApiRequest,
  res: NextApiResponse,
  scan: (provider: ReceiptScanProvider, imageBase64: string, mimeType: string) => Promise<unknown>,
  errorMessage: string,
) {
  if ('POST' !== req.method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const provider = await getReceiptScanProvider();
  if (!provider) {
    return res.status(501).json({ error: 'Receipt scanning is not configured' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { fileKey } = req.body as { fileKey?: string };
  if (!fileKey || 'string' !== typeof fileKey) {
    return res.status(400).json({ error: 'fileKey is required' });
  }

  const userId = String(session.user.id);
  if (!fileKey.startsWith(`${userId}/`)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const filePath = path.join(UPLOAD_DIR, fileKey);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!(await fileExists(filePath))) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    // Uploads are stored as WebP, but local VLM servers (llama.cpp / LM Studio,
    // …) frequently cannot decode WebP. Normalise to JPEG, which every provider
    // — Gemini and OpenAI-compatible local servers alike — accepts.
    const jpegBuffer = await sharp(fileBuffer).jpeg().toBuffer();
    const imageBase64 = jpegBuffer.toString('base64');
    const mimeType = 'image/jpeg';

    const result = await scan(provider, imageBase64, mimeType);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return res.status(500).json({ error: errorMessage });
  }
}
