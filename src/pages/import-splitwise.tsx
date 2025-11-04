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

const ImportSpliwisePage: NextPageWithUser = () => {
  const { t } = useTranslation('account_page');
  const [usersWithBalance, setUsersWithBalance] = useState<SplitwiseUser[]>([]);
  const [groups, setGroups] = useState<SplitwiseGroup[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const router = useRouter();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;

    const file = files?.[0];

    if (!file) {
      return;
    }

    setUploadedFile(file);

    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>;
      const friendsWithOutStandingBalance: SplitwiseUser[] = [];
      for (const friend of json.friends as Record<string, unknown>[]) {
        const balance = friend.balance as { currency_code: string; amount: string }[];
        if (balance.length && 'confirmed' === friend.registration_status) {
          friendsWithOutStandingBalance.push(friend as unknown as SplitwiseUser);
        }
      }

      setUsersWithBalance(friendsWithOutStandingBalance);
      setSelectedUsers(
        friendsWithOutStandingBalance.reduce(
          (acc, user) => {
            acc[user.id] = true;
            return acc;
          },
          {} as Record<string, boolean>,
        ),
      );

      const _groups = (json.groups as SplitwiseGroup[]).filter(
        (g) => 0 < g.members.length && 0 !== g.id,
      );

      setGroups(_groups);
      setSelectedGroups(
        _groups.reduce(
          (acc, group) => {
            acc[group.id] = true;
            return acc;
          },
          {} as Record<string, boolean>,
        ),
      );
    } catch (e) {
      console.error(e);
      toast.error(t('ui.import_from_splitwise_details.errors.import_failed'));
    }
  };

  const importMutation = api.user.importUsersFromSplitWise.useMutation();

  function onImport() {
    importMutation.mutate(
      {
        usersWithBalance: usersWithBalance.filter((user) => selectedUsers[user.id]),
        groups: groups.filter((group) => selectedGroups[group.id]),
      },
      {
        onSuccess: () => {
          toast.success(t('ui.import_from_splitwise_details.messages.import_success'));
          router.push('/groups').catch((err) => console.error(err));
        },
      },
    );
  }

  return (
    <>
      <Head>
        <title>{t('ui.import_from_splitwise')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout hideAppBar>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/balances">
              <Button variant="ghost" className="text-primary px-0 py-0" size="sm">
                {t('ui.actions.cancel', { ns: 'common' })}
              </Button>
            </Link>
          </div>
          <div className="font-medium">{t('ui.import_from_splitwise')}</div>
          <div className="flex gap-4">
            <Button
              onClick={onImport}
              variant="ghost"
              className="text-primary px-0 py-0"
              size="sm"
              disabled={importMutation.isPending || !uploadedFile}
            >
              {t('ui.actions.import', { ns: 'common' })}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <label htmlFor="splitwise-json" className="w-full cursor-pointer rounded border">
            <div className="flex cursor-pointer px-3 py-[6px]">
              <div className="flex items-center border-r pr-4">
                <PaperClipIcon className="mr-2 h-4 w-4" />{' '}
                <span className="hidden text-sm md:block">
                  {t('ui.import_from_splitwise_details.choose_file')}
                </span>
              </div>
              <div className="pl-4 text-gray-400">
                {uploadedFile
                  ? uploadedFile.name
                  : t('ui.import_from_splitwise_details.no_file_chosen')}
              </div>
            </div>
            <Input
              onChange={handleFileChange}
              id="splitwise-json"
              type="file"
              accept=".json"
              className="hidden"
            />
          </label>
          <Button
            onClick={onImport}
            disabled={!uploadedFile || importMutation.isPending}
            className="w-[100px]"
            size="sm"
          >
            {importMutation.isPending ? (
              <LoadingSpinner />
            ) : (
              t('ui.actions.import', { ns: 'common' })
            )}
          </Button>
        </div>
        <div className="mt-4 text-sm text-gray-400">
          {t('ui.import_from_splitwise_details.note')}
        </div>

        {uploadedFile ? (
          <>
            <div className="mt-8 font-semibold">
              {t('ui.actors.friends', { ns: 'common' })} ({usersWithBalance.length})
            </div>
            {usersWithBalance.length ? (
              <div className="mt-4 flex flex-col gap-3">
                {usersWithBalance.map((user, index) => (
                  <div key={user.id} className="">
                    <div key={user.id} className="flex items-center justify-between gap-4">
                      <div className="flex shrink-0 items-center gap-2">
                        <Checkbox
                          checked={selectedUsers[user.id]}
                          onCheckedChange={(checked) => {
                            setSelectedUsers({ ...selectedUsers, [user.id]: checked });
                          }}
                        />
                        <div className="flex">
                          <p>
                            {user.first_name}
                            {user.last_name ? ` ${user.last_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {user.balance.map((b, index) => (
                          <span
                            key={b.currency_code}
                            className={`text-sm ${0 < Number(b.amount) ? 'text-green-500' : 'text-orange-600'}`}
                          >
                            {b.currency_code} {Math.abs(Number(b.amount)).toFixed(2)}
                            <span className="text-xs text-gray-300">
                              {index !== user.balance.length - 1 ? ' + ' : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      {index !== usersWithBalance.length - 1 ? <Separator /> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-8 font-semibold">
              {t('ui.actors.groups', { ns: 'common' })} ({groups.length})
            </div>
            {groups.length ? (
              <div className="mt-4 flex flex-col gap-3">
                {groups.map((group, index) => (
                  <div key={group.id}>
                    <div className="flex justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedGroups[group.id]}
                          onCheckedChange={(checked) => {
                            setSelectedGroups({ ...selectedGroups, [group.id]: checked });
                          }}
                        />
                        <div className="flex">
                          <p>{group.name}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {group.members.length} {t('ui.actors.members', { ns: 'common' })}
                      </div>
                    </div>
                    {index !== groups.length - 1 ? <Separator className="mt-3" /> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-20 flex flex-col items-center justify-center gap-4">
            {t('ui.import_from_splitwise_details.follow_to_export_splitwise_data')}
            <Link href="https://export-splitwise.vercel.app/" target="_blank">
              <Button>
                <DownloadCloud className="mr-2 text-gray-800" />
                {t('ui.import_from_splitwise_details.export_splitwise_data_button')}
              </Button>
            </Link>
          </div>
        )}
      </MainLayout>
    </>
  );
};

ImportSpliwisePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common', 'account_page']);

export default ImportSpliwisePage;
