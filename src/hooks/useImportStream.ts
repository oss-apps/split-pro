import { useCallback, useState } from 'react';
import { type LogEntry } from '~/components/Import/ImportLogWindow';

interface ImportResult {
  expensesImported: number;
  groupsImported: number;
  usersImported?: number;
  expensesSkipped?: number;
}

type StreamOutcome = { ok: true; result: ImportResult } | { ok: false };

export function useImportStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasError, setHasError] = useState(false);

  const reset = useCallback(() => {
    setLogs([]);
    setResult(null);
    setIsStreaming(false);
    setHasError(false);
  }, []);

  const startStream = useCallback(
    async (url: string, formData: FormData): Promise<StreamOutcome> => {
      reset();
      setIsStreaming(true);

      let finalResult: ImportResult | null = null;
      let encounteredError = false;

      try {
        const res = await fetch(url, { method: 'POST', body: formData });

        if (!res.ok || !res.body) {
          const errMsg = `HTTP ${res.status}: ${res.statusText}`;
          setLogs([{ type: 'error', message: errMsg, timestamp: ts() }]);
          setHasError(true);
          return { ok: false };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith('data: ')) {
              continue;
            }
            try {
              const parsed = JSON.parse(line.slice(6)) as {
                type: string;
                message?: string;
                result?: ImportResult;
              };
              if ('done' === parsed.type) {
                finalResult = parsed.result ?? null;
                setResult(finalResult);
              } else if (['info', 'warn', 'error', 'success'].includes(parsed.type)) {
                const type = parsed.type as LogEntry['type'];
                if ('error' === type) {
                  encounteredError = true;
                  setHasError(true);
                }
                setLogs((prev) => [
                  ...prev,
                  { type, message: parsed.message ?? '', timestamp: ts() },
                ]);
              }
            } catch {
              // Ignore malformed SSE line
            }
          }
        }
      } catch (err) {
        encounteredError = true;
        setHasError(true);
        setLogs((prev) => [...prev, { type: 'error', message: String(err), timestamp: ts() }]);
      } finally {
        setIsStreaming(false);
      }

      return encounteredError || !finalResult ? { ok: false } : { ok: true, result: finalResult };
    },
    [reset],
  );

  return { logs, result, isStreaming, hasError, startStream, reset };
}

function ts() {
  return new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
