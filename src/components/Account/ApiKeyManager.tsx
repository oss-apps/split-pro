import React, { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '~/utils/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { Copy, Trash2 } from 'lucide-react';

export const ApiKeyManager: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation();
  const utils = api.useUtils();
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const getApiKeys = api.user.getApiKeys.useQuery();
  const createApiKey = api.user.createApiKey.useMutation({
    onSuccess: async (data) => {
      setNewKey(data.key);
      await utils.user.getApiKeys.refetch();
    },
  });
  const deleteApiKey = api.user.deleteApiKey.useMutation({
    onSuccess: async () => {
      await utils.user.getApiKeys.refetch();
    },
  });

  const onCreate = useCallback(async () => {
    if (!keyName.trim()) {
      toast.error(t('account.api_key.name_required'));
      return;
    }
    try {
      await createApiKey.mutateAsync({ name: keyName.trim() });
      setKeyName('');
    } catch {
      toast.error(t('account.api_key.create_error'));
    }
  }, [createApiKey, keyName, t]);

  const onDelete = useCallback(
    async (id: string) => {
      try {
        await deleteApiKey.mutateAsync({ id });
        toast.success(t('account.api_key.deleted'));
      } catch {
        toast.error(t('account.api_key.delete_error'));
      }
    },
    [deleteApiKey, t],
  );

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
    toast.success(t('group_details.copied'));
  }, [t]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('account.api_key.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('account.api_key.description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {newKey && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              <p className="mb-1 font-semibold">{t('account.api_key.new_key')}:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-xs break-all">
                  {newKey}
                </code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(newKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-green-700">{t('account.api_key.copy_warning')}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder={t('account.api_key.name_placeholder')}
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              onKeyDown={(e) => {
                if ('Enter' === e.key) {
                  void onCreate();
                }
              }}
            />
            <Button onClick={() => void onCreate()} loading={createApiKey.isPending}>
              {t('account.api_key.generate')}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {getApiKeys.data?.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{key.name}</span>
                  <span className="text-xs text-gray-500">
                    {t('account.api_key.created')}: {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt
                      ? ` · ${t('account.api_key.last_used')}: ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : ` · ${t('account.api_key.never_used')}`}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => void onDelete(key.id)}
                  loading={deleteApiKey.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {getApiKeys.data && 0 === getApiKeys.data.length && (
              <p className="text-sm text-gray-500">{t('account.api_key.no_keys')}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setNewKey(null);
              setKeyName('');
            }}
          >
            {t('actions.close')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
