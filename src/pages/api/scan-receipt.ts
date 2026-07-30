import type { NextApiRequest, NextApiResponse } from 'next';

import { handleReceiptScan } from '~/server/receiptScanHandler';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleReceiptScan(
    req,
    res,
    (provider, imageBase64, mimeType) => provider.scanReceipt(imageBase64, mimeType),
    'Failed to scan receipt',
  );
}
