import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import Link from 'next/link';
import { UserAvatar } from '~/components/ui/avatar';
import {
  Bell,
  ChevronRight,
  Download,
  DownloadCloud,
  FileDown,
  Github,
  HeartHandshakeIcon,
  Star,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { AppDrawer } from '~/components/ui/drawer';
import { SubmitFeedback } from '~/components/Account/SubmitFeedback';
import { UpdateDetails } from '~/components/Account/UpdateDetails';
import { api } from '~/utils/api';
import { type NextPageWithUser } from '~/types';
import { toast } from 'sonner';
import { env } from '~/env';
import { SubscribeNotification } from '~/components/Account/SubscribeNotification';
import { useState } from 'react';
import { LoadingSpinner } from '~/components/ui/spinner';

const AccountPage: NextPageWithUser = ({ user }) => {
  const userQuery = api.user.me.useQuery();
  const downloadQuery = api.user.downloadData.useMutation();

  const [downloading, setDownloading] = useState(false);

  async function downloadData() {
    setDownloading(true);
    const data = await downloadQuery.mutateAsync();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'splitpro_data.json';
    link.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  return (
    <>
      <Head>
        <title>Account</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout title="Account" header={<div className="text-3xl font-semibold">Account</div>}>
        <div className="mt-4 px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size={50} />
              <div>
                <div className="text-xl font-semibold">{userQuery.data?.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
            <div>
              {!userQuery.isLoading ? (
                <UpdateDetails defaultName={userQuery.data?.name ?? ''} />
              ) : null}
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <Link href="https://github.com/SebastianHanz/split-pro" target="_blank">
              <Button
                variant="ghost"
                className="text-md w-full justify-between px-0 hover:text-foreground/80"
              >
                <div className="flex items-center gap-4">
                  <Github className="h-5 w-5 text-gray-200" />
                  Finde uns auf Github
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
            <AppDrawer
              trigger={
                <div className="flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300 hover:text-foreground/80">
                  <div className="flex items-center gap-4">
                    <Download className="h-5 w-5 text-blue-500" />
                    App herunterladen
                  </div>
                  <ChevronRight className="h-6x w-6 text-gray-500" />
                </div>
              }
              leftAction="Schließen"
              title="App herunterladen"
              className="h-[70vh]"
              shouldCloseOnAction
            >
              <div className="flex flex-col gap-8">
                <p>Du kannst SplitPro als PWA auf deinen Home-Screen speichern:</p>

                <p>
                  Wenn du iOS benutzt, siehe hier:{' '}
                  <a
                    className="text-cyan-500 underline"
                    href="https://youtube.com/shorts/MQHeLOjr350"
                    target="_blank"
                  >
                    video
                  </a>
                </p>

                <p>
                  Wenn du Android benutzt, siehe hier:{' '}
                  <a
                    className="text-cyan-500 underline"
                    href="https://youtube.com/shorts/04n7oKGzgOs"
                    target="_blank"
                  >
                    Video
                  </a>
                </p>
              </div>
            </AppDrawer>
            <Button
              variant="ghost"
              className="text-md w-full justify-between px-0 hover:text-foreground/80"
              onClick={downloadData}
              disabled={downloading}
            >
              <div className="flex items-center gap-4">
                <FileDown className="h-5 w-5 text-teal-500" />
                SplitPro Daten exportieren als JSON
              </div>
              {downloading ? (
                <LoadingSpinner />
              ) : (
                <ChevronRight className="h-6 w-6 text-gray-500" />
              )}
            </Button>
            <Link href="/import-splitwise">
              <Button
                variant="ghost"
                className="text-md w-full justify-between px-0 hover:text-foreground/80"
              >
                <div className="flex items-center gap-4">
                  <DownloadCloud className="h-5 w-5 text-violet-500" />
                  Import von Splitwise
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
          </div>

          <div className="mt-2 flex justify-center">
            <Button
              variant="ghost"
              className="text-orange-600 hover:text-orange-600/90 "
              onClick={() => signOut()}
            >
              Logout
            </Button>
          </div>
        </div>
      </MainLayout>
    </>
  );
};

AccountPage.auth = true;

export default AccountPage;
