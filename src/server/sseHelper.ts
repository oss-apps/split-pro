import type { NextApiResponse } from 'next';

export function setupSSE(res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'none');
  res.flushHeaders();

  const flush = () => {
    if ('flush' in res && typeof (res as unknown as Record<string, unknown>).flush === 'function') {
      (res as unknown as { flush: () => void }).flush();
    }
  };

  const send = (type: string, payload: object) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    flush();
  };

  // Send a SSE comment as keep-alive every 5 seconds.
  // This keeps the connection alive through proxies and forces buffer flushes.
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
    flush();
  }, 5000);

  const end = () => {
    clearInterval(keepAlive);
    res.end();
  };

  return { send, end };
}
