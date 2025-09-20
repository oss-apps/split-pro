import { SiGithub, SiX } from '@icons-pack/react-simple-icons';
import {
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
import { useRouter } from 'next/router';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AccountButton } from '~/components/Account/AccountButton';
import { DownloadAppDrawer } from '~/components/Account/DownloadAppDrawer';
import { LanguagePicker } from '~/components/Account/LanguagePicker';
import { SubmitFeedback } from '~/components/Account/SubmitFeedback';
import { SubscribeNotification } from '~/components/Account/SubscribeNotification';
import { UpdateName } from '~/components/Account/UpdateName';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { env } from '~/env';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { BankConnection } from '~/components/Account/BankAccount/BankConnection';
import { bigIntReplacer } from '~/utils/numbers';
import {
  isBankConnectionConfigured,
  whichBankConnectionConfigured,
} from '~/server/bankTransactionHelper';
import { api } from '~/utils/api';
import type { NextPageWithUser } from '~/types';

const AccountPage: NextPageWithUser<{
  feedBackPossible: boolean;
  bankConnectionEnabled: boolean;
  bankConnection: string;
}> = ({ user, feedBackPossible, bankConnectionEnabled, bankConnection }) => {
  const { t } = useTranslation();
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
        toast.success(t('account.messages.submit_success'), { duration: 1500 });
        utils.user.me.refetch().catch(console.error);
      } catch (error) {
        toast.error(t('account.messages.submit_error'));

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

  const isCloud = env.NEXT_PUBLIC_IS_CLOUD_DEPLOYMENT;

  return (
    <>
      <Head>
        <title>{t('account.title')}</title>
      </Head>
      <MainLayout title={t('account.title')} header={header}>
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
              {t('account.change_language')}
            </AccountButton>
          </LanguagePicker>

          <BankConnection
            bankConnectionEnabled={bankConnectionEnabled}
            bankConnection={bankConnection}
          />

          {isCloud && (
            <AccountButton href="https://twitter.com/KM_Koushik_">
              <SiX className="size-5" />
              {t('account.follow_on_x')}
            </AccountButton>
          )}

          <AccountButton href="https://github.com/oss-apps/split-pro">
            <SiGithub className="size-5" />
            {t('account.star_on_github')}
          </AccountButton>

          <AccountButton href="https://github.com/sponsors/krokosik">
            <HeartHandshakeIcon className="size-5 text-pink-600" />
            {t('account.support_us')}
          </AccountButton>

          {feedBackPossible && <SubmitFeedback />}

          <SubscribeNotification />

          <AccountButton href="https://www.producthunt.com/products/splitpro/reviews/new">
            <Star className="size-5 text-yellow-400" />
            {t('account.write_review')}
          </AccountButton>

          <DownloadAppDrawer>
            <AccountButton>
              <Download className="size-5 text-blue-500" />
              {t('account.download_app')}
            </AccountButton>
          </DownloadAppDrawer>

          <AccountButton onClick={downloadData} disabled={downloading} loading={downloading}>
            <FileDown className="size-5 text-teal-500" />
            {t('account.download_splitpro_data')}
          </AccountButton>

          <AccountButton href="/import-splitwise">
            <DownloadCloud className="size-5 text-violet-500" />
            {t('account.import_from_splitwise')}
          </AccountButton>
        </div>

        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            className="text-orange-600 hover:text-orange-600/90"
            onClick={onSignOut}
          >
            {t('account.logout')}
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
    bankConnectionEnabled: !!isBankConnectionConfigured(),
    bankConnection: whichBankConnectionConfigured(),
    ...(await customServerSideTranslations(context.locale, ['common'])),
  },
});

export default AccountPage;
