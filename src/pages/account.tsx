import {
  ChevronRight,
  Download,
  DownloadCloud,
  FileDown,
  HeartHandshakeIcon,
  Languages,
  Star,
} from 'lucide-react';
import type { GetServerSideProps } from 'next';
import { signOut } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DownloadAppDrawer } from '~/components/Account/DownloadAppDrawer';
import { LanguagePicker } from '~/components/Account/LanguagePicker';
import { SubmitFeedback } from '~/components/Account/SubmitFeedback';
import { SubscribeNotification } from '~/components/Account/SubscribeNotification';
import { UpdateName } from '~/components/Account/UpdateName';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button, ButtonProps } from '~/components/ui/button';
import { SiGithub, SiX } from '@icons-pack/react-simple-icons';
import { LoadingSpinner } from '~/components/ui/spinner';
import { env } from '~/env';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { bigIntReplacer } from '~/utils/numbers';
import { AccountButton } from '~/components/Account/AccountButton';

const AccountPage: NextPageWithUser<{ isCloud: boolean; feedBackPossible: boolean }> = ({
  user,
  isCloud,
  feedBackPossible,
}) => {
  const { t } = useTranslation('account_page');
  const router = useRouter();
  const userQuery = api.user.me.useQuery();
  const downloadQuery = api.user.downloadData.useMutation();
  const updateDetailsMutation = api.user.updateUserDetail.useMutation();

  const [downloading, setDownloading] = useState(false);

  const downloadData = useCallback(async () => {
    setDownloading(true);
    const data = await downloadQuery.mutateAsync();
    const blob = new Blob([JSON.stringify(data, bigIntReplacer, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'splitpro_data.json';
    link.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }, [downloadQuery]);

  const utils = api.useUtils();

  const onNameUpdate = useCallback(
    async (values: { name: string }) => {
      try {
        await updateDetailsMutation.mutateAsync({ name: values.name });
        toast.success(t('ui.messages.submit_success'), { duration: 1500 });
        utils.user.me.refetch().catch(console.error);
      } catch (error) {
        toast.error(t('ui.messages.submit_error'));

        console.error(error);
      }
    },
    [updateDetailsMutation, utils.user.me, t],
  );

  const header = useMemo(() => <div className="text-3xl font-semibold">Account</div>, []);

  const onSignOut = useCallback(async () => {
    await signOut({ redirect: false });
    void router.push('/auth/signin', '/auth/signin', { locale: 'default' });
  }, [router]);

  return (
    <>
      <Head>
        <title>{t('ui.title')}</title>
      </Head>
      <MainLayout title={t('ui.title')} header={header}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <EntityAvatar entity={user} size={50} />
            <div>
              <div className="text-xl font-semibold">{userQuery.data?.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
          {!userQuery.isPending && (
            <UpdateName
              className="size-5"
              defaultName={userQuery.data?.name ?? ''}
              onNameSubmit={onNameUpdate}
            />
          )}
        </div>
        <div className="mt-8 flex flex-col gap-4">
          <LanguagePicker>
            <AccountButton>
              <Languages className="size-5 text-green-500" />
              {t('ui.change_language')}
            </AccountButton>
          </LanguagePicker>

          {isCloud && (
            <AccountButton href="https://twitter.com/KM_Koushik_">
              <SiX className="size-5" />
              {t('ui.follow_on_x')}
            </AccountButton>
          )}

          <AccountButton href="https://github.com/oss-apps/split-pro">
            <SiGithub className="size-5" />
            {t('ui.star_on_github')}
          </AccountButton>

          <AccountButton href="https://github.com/sponsors/krokosik">
            <HeartHandshakeIcon className="size-5 text-pink-600" />
            {t('ui.support_us')}
          </AccountButton>

          {feedBackPossible && <SubmitFeedback />}

          <SubscribeNotification />

          <AccountButton href="https://www.producthunt.com/products/splitpro/reviews/new">
            <Star className="size-5 text-yellow-400" />
            {t('ui.write_review')}
          </AccountButton>

          <DownloadAppDrawer>
            <AccountButton>
              <Download className="size-5 text-blue-500" />
              {t('ui.download_app')}
            </AccountButton>
          </DownloadAppDrawer>

          <AccountButton onClick={downloadData} disabled={downloading} loading={downloading}>
            <FileDown className="size-5 text-teal-500" />
            {t('ui.download_splitpro_data')}
          </AccountButton>

          <AccountButton href="/import-splitwise">
            <DownloadCloud className="size-5 text-violet-500" />
            {t('ui.import_from_splitwise')}
          </AccountButton>
        </div>

        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            className="text-orange-600 hover:text-orange-600/90"
            onClick={onSignOut}
          >
            {t('ui.logout')}
          </Button>
        </div>
      </MainLayout>
    </>
  );
};

AccountPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    feedbackPossible: !!env.FEEDBACK_EMAIL,
    isCloud: env.NEXTAUTH_URL.includes('splitpro.app'),
    ...(await customServerSideTranslations(context.locale, ['account_page', 'common'])),
  },
});

export default AccountPage;
