import { Copy, Trash2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'sonner';

import { api } from '~/utils/api';

import { AppDrawer } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/**
 * Account-settings UI to create, list, and revoke API keys used by the public
 * REST API (`/api/v1`). A freshly created key's plaintext is shown exactly
 * once; only a SHA-256 hash is stored server-side. Keys can optionally be
 * created with an expiry date.
 */
export const ApiKeys: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation('common');

  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [minExpiry] = useState(() => new Date().toISOString().split('T')[0]);

  const utils = api.useUtils();
  const keysQuery = api.user.listApiKeys.useQuery();
  const createMutation = api.user.createApiKey.useMutation();
  const revokeMutation = api.user.revokeApiKey.useMutation();

  const onCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t('account.api_keys.messages.name_required'));
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        name: trimmed,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
      });
      setCreatedKey(result.key);
      setName('');
      setExpiresAt('');
      await utils.user.listApiKeys.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('account.api_keys.messages.create_failed'),
      );
    }
  }, [name, expiresAt, createMutation, utils.user.listApiKeys, t]);

  const onRevoke = useCallback(
    async (id: string) => {
      try {
        await revokeMutation.mutateAsync({ id });
        await utils.user.listApiKeys.invalidate();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('account.api_keys.messages.revoke_failed'),
        );
      }
    },
    [revokeMutation, utils.user.listApiKeys, t],
  );

  const copyKey = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(t('account.api_keys.messages.copied'));
      } catch {
        toast.error(t('account.api_keys.messages.copy_failed'));
      }
    },
    [t],
  );

  return (
    <AppDrawer
      trigger={children}
      title={t('account.api_keys.title')}
      leftAction={t('actions.close')}
      onOpenChange={(open) => {
        if (!open) {
          setCreatedKey(null);
        }
      }}
      className="h-[85vh]"
    >
      <div className="mt-4 flex flex-col gap-6">
        <p className="text-sm text-gray-400">
          {t('account.api_keys.description')}{' '}
          <code className="text-primary">Authorization: Bearer &lt;key&gt;</code>.{' '}
          {t('account.api_keys.docs_prefix')}{' '}
          <a className="text-cyan-500 underline" href="/api/docs" target="_blank" rel="noreferrer">
            /api/docs
          </a>
          .
        </p>

        {createdKey ? (
          <div className="flex flex-col gap-2 rounded-md border border-cyan-800 bg-cyan-950/40 p-3">
            <p className="text-sm font-medium text-cyan-300">
              {t('account.api_keys.copy_now_notice')}
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
              {t('account.api_keys.name_label')}
            </label>
            <Input
              id="api-key-name"
              value={name}
              placeholder={t('account.api_keys.name_placeholder')}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-sm text-gray-400" htmlFor="api-key-expiry">
              {t('account.api_keys.expires_label')}
            </label>
            <Input
              id="api-key-expiry"
              type="date"
              value={expiresAt}
              min={minExpiry}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <Button onClick={onCreate} loading={createMutation.isPending}>
            {t('account.api_keys.create')}
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
                    {key.lastUsedAt
                      ? t('account.api_keys.last_used', {
                          date: key.lastUsedAt.toLocaleDateString(),
                        })
                      : t('account.api_keys.never_used')}
                    {key.expiresAt
                      ? ` · ${t('account.api_keys.expires_on', {
                          date: key.expiresAt.toLocaleDateString(),
                        })}`
                      : ''}
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
            <p className="text-sm text-gray-500">{t('account.api_keys.empty')}</p>
          )}
        </div>
      </div>
    </AppDrawer>
  );
};
