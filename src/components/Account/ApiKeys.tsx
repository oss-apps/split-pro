import { Copy, Trash2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { api } from '~/utils/api';

import { AppDrawer } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/**
 * Account-settings UI to create, list, and revoke API keys used by the public
 * REST API (`/api/v1`). A freshly created key's plaintext is shown exactly once.
 */
export const ApiKeys: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [name, setName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const utils = api.useUtils();
  const keysQuery = api.user.listApiKeys.useQuery();
  const createMutation = api.user.createApiKey.useMutation();
  const revokeMutation = api.user.revokeApiKey.useMutation();

  const onCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter a name for the key');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({ name: trimmed });
      setCreatedKey(result.key);
      setName('');
      await utils.user.listApiKeys.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API key');
    }
  }, [name, createMutation, utils.user.listApiKeys]);

  const onRevoke = useCallback(
    async (id: string) => {
      try {
        await revokeMutation.mutateAsync({ id });
        await utils.user.listApiKeys.invalidate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to revoke API key');
      }
    },
    [revokeMutation, utils.user.listApiKeys],
  );

  const copyKey = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  return (
    <AppDrawer
      trigger={children}
      title="API keys"
      leftAction="Close"
      onClose={() => setCreatedKey(null)}
      className="h-[85vh]"
    >
      <div className="mt-4 flex flex-col gap-6">
        <p className="text-sm text-gray-400">
          Use API keys to access the SplitPro API. Send it as{' '}
          <code className="text-primary">Authorization: Bearer &lt;key&gt;</code>. Docs are at{' '}
          <a className="text-cyan-500 underline" href="/api/docs" target="_blank" rel="noreferrer">
            /api/docs
          </a>
          .
        </p>

        {createdKey ? (
          <div className="flex flex-col gap-2 rounded-md border border-cyan-800 bg-cyan-950/40 p-3">
            <p className="text-sm font-medium text-cyan-300">
              Copy your key now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-primary grow overflow-x-auto rounded bg-black/40 px-2 py-1 text-sm">
                {createdKey}
              </code>
              <Button size="icon" variant="secondary" onClick={() => copyKey(createdKey)}>
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="grow">
            <label className="mb-1 block text-sm text-gray-400" htmlFor="api-key-name">
              New key name
            </label>
            <Input
              id="api-key-name"
              value={name}
              placeholder="e.g. Actual Budget"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={onCreate} loading={createMutation.isPending}>
            Create
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {keysQuery.data?.length ? (
            keysQuery.data.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-md border border-gray-800 p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{key.name}</span>
                  <span className="text-xs text-gray-500">
                    {key.partialKey}… ·{' '}
                    {key.lastUsedAt ? `used ${key.lastUsedAt.toLocaleDateString()}` : 'never used'}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => onRevoke(key.id)}
                  disabled={revokeMutation.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No API keys yet.</p>
          )}
        </div>
      </div>
    </AppDrawer>
  );
};
