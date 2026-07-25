import { type ReceiptItem, parseReceiptItems } from '~/lib/receiptParser';

/**
 * Client-side receipt OCR.
 *
 * The tesseract worker + WASM core are self-hosted under /public/tesseract (copied from
 * node_modules) so the engine never depends on tesseract.js's default CDN. Only the
 * language model (eng.traineddata, a few MB) is fetched from a CDN — it's cached by the
 * browser after first use, so self-hosting it isn't worth it. There is no server round
 * trip and no third-party OCR API/API key involved.
 */

/** CDN path (jsDelivr mirror of the canonical naptha/tessdata) with eng.traineddata.gz. */
const TESSERACT_LANG_PATH = 'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0';

export interface ScanProgress {
  status: string;
  progress: number;
}

/**
 * Scan a receipt image entirely in the browser and return conservative candidate line
 * items. Callers must present these as suggestions to confirm — never auto-add them.
 */
export async function scanReceiptForItems(
  image: File | Blob | string,
  onProgress?: (progress: ScanProgress) => void,
): Promise<ReceiptItem[]> {
  // Dynamically imported so tesseract.js is never pulled into the server bundle.
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: TESSERACT_LANG_PATH,
    logger: onProgress
      ? (m: { status: string; progress: number }) =>
          onProgress({ status: m.status, progress: m.progress })
      : undefined,
  });

  try {
    const { data } = await worker.recognize(image);
    return parseReceiptItems(data.text);
  } finally {
    await worker.terminate();
  }
}
