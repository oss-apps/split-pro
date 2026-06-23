import { useEffect, useRef } from 'react';

export interface LogEntry {
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

const colorMap: Record<LogEntry['type'], string> = {
  info: 'text-gray-300',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  success: 'text-green-400',
};

const prefixMap: Record<LogEntry['type'], string> = {
  info: '  ',
  warn: '⚠ ',
  error: '✗ ',
  success: '✓ ',
};

export function ImportLogWindow({
  entries,
  isStreaming,
}: {
  entries: LogEntry[];
  isStreaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  if (0 === entries.length && !isStreaming) {
    return null;
  }

  return (
    <div className="mt-4 rounded border border-gray-700 bg-gray-950 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-1.5 text-gray-500">
        <span>Import Log</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            running...
          </span>
        )}
      </div>
      <div className="h-56 overflow-y-auto p-3">
        {entries.map((entry, i) => (
          <div key={i} className={`flex gap-2 ${colorMap[entry.type]}`}>
            <span className="shrink-0 text-gray-600">{entry.timestamp}</span>
            <span className="shrink-0">{prefixMap[entry.type]}</span>
            <span className="break-all">{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
