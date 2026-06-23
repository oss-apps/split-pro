import { PaperClipIcon } from '@heroicons/react/24/solid';
import { DownloadCloud } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { LoadingSpinner } from '~/components/ui/spinner';
import { type NextPageWithUser, type SplitwiseGroup, type SplitwiseUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';

type ParsedFile =
  | { mode: 'balance'; users: SplitwiseUser[]; groups: SplitwiseGroup[] }
  | { mode: 'full'; raw: Record<string, unknown>; expenseCount: number; friendCount: number; groupCount: number };

const ImportSpliwisePage: NextPageWithUser = () => {
  const { t } = useTranslation();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});

  const router = useRouter();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setParsed(null);

    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>;

      const expenses = json.expenses as Record<string, unknown>[] | undefined;
      const isFullBackup = Array.isArray(expenses) && expenses.length > 0 && 'repayments' in expenses[0]!;

      if (isFullBackup) {
        const activeExpenses = expenses!.filter((e) => !e.deleted_at);
        const friends = (json.friends as Record<string, unknown>[]) ?? [];
        const groups = ((json.groups as Record<string, unknown>[]) ?? []).filter(
          (g) => 0 !== g.id && (g.members as unknown[]).length > 0,
        );

        setParsed({
          mode: 'full',
          raw: json,
          expenseCount: activeExpenses.length,
          friendCount: friends.length,
          groupCount: groups.length,
        });
      } else {
        // Legacy balance-only mode
        const friendsWithBalance: SplitwiseUser[] = [];
        for (const friend of (json.friends as Record<string, unknown>[]) ?? []) {
          const balance = friend.balance as { currency_code: string; amount: string }[];
          if (balance.length && 'confirmed' === friend.registration_status) {
            friendsWithBalance.push(friend as unknown as SplitwiseUser);
          }
        }

        const groups = ((json.groups as SplitwiseGroup[]) ?? []).filter(
          (g) => 0 < g.members.length && 0 !== g.id,
        );

        setParsed({ mode: 'balance', users: friendsWithBalance, groups });
        setSelectedUsers(
          friendsWithBalance.reduce((acc, u) => ({ ...acc, [u.id]: true }), {} as Record<string, boolean>),
        );
        setSelectedGroups(
          groups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {} as Record<string, boolean>),
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(t('errors.import_failed'));
    }
  };

  const [fullImportPending, setFullImportPending] = useState(false);
  const balanceMutation = api.user.importUsersFromSplitWise.useMutation();

  function onImport() {
    if (!parsed) return;

    if (parsed.mode === 'full') {
      if (!uploadedFile) return;
      setFullImportPending(true);
      const formData = new FormData();
      formData.append('file', uploadedFile);
      fetch('/api/import-splitwise', { method: 'POST', body: formData })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json() as Promise<{ expensesImported: number; expensesSkipped: number }>;
        })
        .then((result) => {
          toast.success(
            `Import abgeschlossen: ${result.expensesImported} Ausgaben importiert, ${result.expensesSkipped} übersprungen`,
            { duration: 4000 },
          );
          router.push('/balances').catch(console.error);
        })
        .catch(() => toast.error(t('errors.import_failed')))
        .finally(() => setFullImportPending(false));
    } else {
      balanceMutation.mutate(
        {
          usersWithBalance: parsed.users.filter((u) => selectedUsers[u.id]),
          groups: parsed.groups.filter((g) => selectedGroups[g.id]),
        },
        {
          onSuccess: () => {
            toast.success(t('account.import_from_splitwise_details.messages.import_success'));
            router.push('/balances').catch(console.error);
          },
          onError: () => toast.error(t('errors.import_failed')),
        },
      );
    }
  }

  const isPending = balanceMutation.isPending || fullImportPending;

  return (
    <>
      <Head>
        <title>{t('account.import_from_splitwise')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout hideAppBar>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/balances">
              <Button variant="ghost" className="text-primary px-0 py-0" size="sm">
                {t('actions.cancel')}
              </Button>
            </Link>
          </div>
          <div className="font-medium">{t('account.import_from_splitwise')}</div>
          <div className="flex gap-4">
            <Button
              onClick={onImport}
              variant="ghost"
              className="text-primary px-0 py-0"
              size="sm"
              disabled={isPending || !parsed}
            >
              {t('actions.import')}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label htmlFor="splitwise-json" className="w-full cursor-pointer rounded border">
            <div className="flex cursor-pointer px-3 py-[6px]">
              <div className="flex items-center border-r pr-4">
                <PaperClipIcon className="mr-2 h-4 w-4" />
                <span className="hidden text-sm md:block">
                  {t('account.import_from_splitwise_details.choose_file')}
                </span>
              </div>
              <div className="pl-4 text-gray-400">
                {uploadedFile ? uploadedFile.name : t('account.import_from_splitwise_details.no_file_chosen')}
              </div>
            </div>
            <Input onChange={handleFileChange} id="splitwise-json" type="file" accept=".json" className="hidden" />
          </label>
          <Button onClick={onImport} disabled={!parsed || isPending} className="w-[100px]" size="sm">
            {isPending ? <LoadingSpinner /> : t('actions.import')}
          </Button>
        </div>

        {parsed?.mode === 'full' && (
          <div className="mt-6 flex flex-col gap-2 text-sm text-gray-400">
            <div className="rounded border border-gray-700 p-3 text-gray-300">
              <div>{t('actors.friends')}: {parsed.friendCount}</div>
              <div>{t('actors.groups')}: {parsed.groupCount}</div>
              <div>{parsed.expenseCount} {t('account.import_splitpro_data_details.expenses')}</div>
            </div>
            <div className="text-xs text-gray-500">
              Splitwise Pro Backup erkannt — alle Ausgaben werden importiert.
            </div>
          </div>
        )}

        {parsed?.mode === 'balance' && uploadedFile && (
          <>
            <div className="mt-4 text-sm text-gray-400">
              {t('account.import_from_splitwise_details.note')}
            </div>
            <div className="mt-8 font-semibold">
              {t('actors.friends')} ({parsed.users.length})
            </div>
            {parsed.users.length ? (
              <div className="mt-4 flex flex-col gap-3">
                {parsed.users.map((user, index) => (
                  <div key={user.id}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex shrink-0 items-center gap-2">
                        <Checkbox
                          checked={selectedUsers[user.id]}
                          onCheckedChange={(checked) => setSelectedUsers({ ...selectedUsers, [user.id]: checked })}
                        />
                        <p>{user.first_name}{user.last_name ? ` ${user.last_name}` : ''}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {user.balance.map((b, i) => (
                          <span
                            key={b.currency_code}
                            className={`text-sm ${0 < Number(b.amount) ? 'text-green-500' : 'text-orange-600'}`}
                          >
                            {b.currency_code} {Math.abs(Number(b.amount)).toFixed(2)}
                            {i !== user.balance.length - 1 && <span className="text-xs text-gray-300"> + </span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    {index !== parsed.users.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-8 font-semibold">{t('actors.groups')} ({parsed.groups.length})</div>
            {parsed.groups.length ? (
              <div className="mt-4 flex flex-col gap-3">
                {parsed.groups.map((group, index) => (
                  <div key={group.id}>
                    <div className="flex justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedGroups[group.id]}
                          onCheckedChange={(checked) => setSelectedGroups({ ...selectedGroups, [group.id]: checked })}
                        />
                        <p>{group.name}</p>
                      </div>
                      <div className="shrink-0 text-sm text-gray-400">
                        {group.members.length} {t('actors.members')}
                      </div>
                    </div>
                    {index !== parsed.groups.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}

        {!uploadedFile && (
          <div className="mt-20 flex flex-col items-center justify-center gap-4">
            {t('account.import_from_splitwise_details.follow_to_export_splitwise_data')}
            <Link href="https://export-splitwise.vercel.app/" target="_blank">
              <Button>
                <DownloadCloud className="mr-2 text-gray-800" />
                {t('account.import_from_splitwise_details.export_splitwise_data_button')}
              </Button>
            </Link>
          </div>
        )}
      </MainLayout>
    </>
  );
};

ImportSpliwisePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ImportSpliwisePage;
