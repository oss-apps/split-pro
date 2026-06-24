import type { NextApiResponse } from 'next';
import type { ServerResponse } from 'node:http';

export function setupSSE(res: NextApiResponse) {
  // Write SSE headers directly on the underlying socket to bypass
  // Next.js compression middleware (which would buffer the entire response).
  const raw = res as unknown as ServerResponse;
  raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (type: string, payload: object) => {
    raw.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  const keepAlive = setInterval(() => {
    raw.write(': ping\n\n');
  }, 5000);

  const end = () => {
    clearInterval(keepAlive);
    raw.end();
  };

  return { send, end };
}
