import { GoogleGenAI } from '@google/genai';

import { env } from '~/env';

import {
  RECEIPT_ITEMS_PROMPT,
  RECEIPT_PROMPT,
  type ReceiptItemsScanResult,
  type ReceiptScanResult,
  parseReceiptItemsResponse,
  parseReceiptResponse,
} from './receiptParsers';

export type { ReceiptScanResult, ReceiptItemsScanResult, ReceiptLineItem } from './receiptParsers';

export abstract class ReceiptScanProvider {
  abstract scanReceipt(imageBase64: string, mimeType: string): Promise<ReceiptScanResult>;
  abstract scanReceiptItems(imageBase64: string, mimeType: string): Promise<ReceiptItemsScanResult>;
}

class GeminiProvider extends ReceiptScanProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    super();
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  private async generate(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, { inlineData: { data: imageBase64, mimeType } }],
        },
      ],
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }
    return text;
  }

  async scanReceipt(imageBase64: string, mimeType: string): Promise<ReceiptScanResult> {
    return parseReceiptResponse(await this.generate(RECEIPT_PROMPT, imageBase64, mimeType));
  }

  async scanReceiptItems(imageBase64: string, mimeType: string): Promise<ReceiptItemsScanResult> {
    return parseReceiptItemsResponse(
      await this.generate(RECEIPT_ITEMS_PROMPT, imageBase64, mimeType),
    );
  }
}

class OllamaProvider extends ReceiptScanProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    super();
    this.baseUrl = baseUrl;
    this.model = model;
  }

  private async generate(
    prompt: string,
    imageBase64: string,
    mimeType: string,
    jsonMode: boolean,
  ): Promise<string> {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ];
    const post = (useJsonFormat: boolean) =>
      fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          ...(useJsonFormat ? { response_format: { type: 'json_object' } } : {}),
          messages,
        }),
      });

    // Some OpenAI-compatible servers (LM Studio, vLLM) reject json_object; retry without it.
    let response = await post(jsonMode);
    if (!response.ok && jsonMode) {
      response = await post(false);
    }

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response from Ollama');
    }
    return text;
  }

  async scanReceipt(imageBase64: string, mimeType: string): Promise<ReceiptScanResult> {
    return parseReceiptResponse(await this.generate(RECEIPT_PROMPT, imageBase64, mimeType, false));
  }

  async scanReceiptItems(imageBase64: string, mimeType: string): Promise<ReceiptItemsScanResult> {
    return parseReceiptItemsResponse(
      await this.generate(RECEIPT_ITEMS_PROMPT, imageBase64, mimeType, true),
    );
  }
}

/*
 * Ordered by measured accuracy on receipt line-item extraction, best first. The first
 * locally installed match wins; if none are installed, we fall back to Gemini.
 *
 * Benchmarked with scripts/benchmark-vlm.sh over three receipts (a clean render, a
 * glare-lit photo of a curled receipt, and a crumpled low-contrast photo), two runs
 * each. Both entries below scored full amount recall with no spurious line items.
 *
 * Deliberately excluded:
 * - reasoning VLMs such as `nemotron3:33b` and `qwen3.6:27b`, which spend the default
 *   context on chain-of-thought and then return empty content instead of JSON, at
 *   minutes per scan;
 * - `minicpm-v4.5:8b`, which matched on amounts but fabricated the date on 4 of 6 runs.
 */
const PREFERRED_OLLAMA_MODELS = ['gemma4:e4b', 'gemma4:e2b'] as const;
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

async function detectInstalledOllamaModel(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { models?: { name?: string; model?: string }[] };
    const installed = new Set<string>();
    for (const m of data.models ?? []) {
      if (m.name) {
        installed.add(m.name);
      }
      if (m.model) {
        installed.add(m.model);
      }
    }
    for (const candidate of PREFERRED_OLLAMA_MODELS) {
      if (installed.has(candidate)) {
        return candidate;
      }
    }
    return null;
  } catch {
    return null;
  }
}

let cachedProvider: ReceiptScanProvider | null | undefined;

export async function getReceiptScanProvider(): Promise<ReceiptScanProvider | null> {
  if (undefined !== cachedProvider) {
    return cachedProvider;
  }

  const explicitProvider = env.RECEIPT_SCAN_PROVIDER;
  const ollamaBaseUrl = env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL;
  const geminiModel = env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;

  if ('gemini' === explicitProvider) {
    cachedProvider = env.GEMINI_API_KEY
      ? new GeminiProvider(env.GEMINI_API_KEY, geminiModel)
      : null;
    return cachedProvider;
  }

  if ('ollama' === explicitProvider) {
    const model = env.OLLAMA_MODEL ?? (await detectInstalledOllamaModel(ollamaBaseUrl));
    cachedProvider = model ? new OllamaProvider(ollamaBaseUrl, model) : null;
    return cachedProvider;
  }

  // Auto-detect: explicit OLLAMA_MODEL wins, then probe, then Gemini.
  if (env.OLLAMA_MODEL) {
    cachedProvider = new OllamaProvider(ollamaBaseUrl, env.OLLAMA_MODEL);
    return cachedProvider;
  }

  const detected = await detectInstalledOllamaModel(ollamaBaseUrl);
  if (detected) {
    cachedProvider = new OllamaProvider(ollamaBaseUrl, detected);
    return cachedProvider;
  }

  cachedProvider = env.GEMINI_API_KEY ? new GeminiProvider(env.GEMINI_API_KEY, geminiModel) : null;
  return cachedProvider;
}

export const isReceiptScanConfigured = async () => null !== (await getReceiptScanProvider());
