import {
  ChevronRight,
  Download,
  DownloadCloud,
  FileDown,
  HeartHandshakeIcon,
  Star,
} from 'lucide-react';
import type { GetServerSideProps } from 'next';
import { signOut } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LanguagePicker } from '~/components/Account/LanguagePicker';
import { SubmitFeedback } from '~/components/Account/SubmitFeedback';
import { SubscribeNotification } from '~/components/Account/SubscribeNotification';
import { UpdateName } from '~/components/Account/UpdateName';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import DownloadAppDrawer from '~/components/Account/DownloadAppDrawer';
import { LoadingSpinner } from '~/components/ui/spinner';
import { env } from '~/env';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { bigIntReplacer } from '~/utils/numbers';

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

  const downloadAppButton = useMemo(
    () => (
      <div className="hover:text-foreground/80 flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300">
        <div className="flex items-center gap-4">
          <Download className="h-5 w-5 text-blue-500" />
          {t('ui.download_app')}
        </div>
        <ChevronRight className="h-6x w-6 text-gray-500" />
      </div>
    ),
    [t],
  );

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
          <LanguagePicker />

          {isCloud && (
              <SiX className="size-5" />
            <SiGithub className="size-5" />
          {feedBackPossible && <SubmitFeedback />}
          <SubscribeNotification />
          <Link href="https://www.producthunt.com/products/splitpro/reviews/new" target="_blank">
            <Button
              variant="ghost"
              className="text-md hover:text-foreground/80 w-full justify-between px-0"
            >
              <div className="flex items-center gap-4">
                <Star className="h-5 w-5 text-yellow-400" />
                {t('ui.write_review')}
              </div>
              <ChevronRight className="h-6 w-6 text-gray-500" />
            </Button>
          </Link>
          <DownloadAppDrawer>{downloadAppButton}</DownloadAppDrawer>
          <Button
            variant="ghost"
            className="text-md hover:text-foreground/80 w-full justify-between px-0"
            onClick={downloadData}
            disabled={downloading}
          >
            <div className="flex items-center gap-4">
              <FileDown className="h-5 w-5 text-teal-500" />
              {t('ui.download_splitpro_data')}
            </div>
            {downloading ? <LoadingSpinner /> : <ChevronRight className="h-6 w-6 text-gray-500" />}
          </Button>
          <Link href="/import-splitwise">
            <Button
              variant="ghost"
              className="text-md hover:text-foreground/80 w-full justify-between px-0"
            >
              <div className="flex items-center gap-4">
                <DownloadCloud className="h-5 w-5 text-violet-500" />
                {t('ui.import_from_splitwise')}
              </div>
              <ChevronRight className="h-6 w-6 text-gray-500" />
            </Button>
          </Link>
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
