import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { type User } from '@prisma/client';
import { api } from '~/utils/api';
import Link from 'next/link';
import { UserAvatar } from '~/components/ui/avatar';
import { ChevronRight, Download, Github, Heart, MessageSquare, Pencil } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';

const AccountPage: NextPage<{ user: User }> = ({ user }) => {
  const submitFeedbackMutation = api.user.submitFeedback.useMutation();
  const updateDetailsMutation = api.user.updateUserDetail.useMutation();

  const [feedback, setFeedback] = useState('');
  const [name, setName] = useState<string | null>(user.name?.toString() ?? null);

  return (
    <>
      <Head>
        <title>Account</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        user={user}
        title="Account"
        header={<div className="text-3xl font-semibold">Account</div>}
      >
        <div className="mt-4 px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size={50} />
              <div>
                <div className="text-xl font-semibold">{name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
            <div>
              <AppDrawer
                trigger={<Pencil className="h-5 w-5" />}
                leftAction="Close"
                title="Edit details"
                className="h-[80vh]"
                actionTitle="Save"
                shouldCloseOnAction
                actionOnClick={() => {
                  if (!name) return;

                  updateDetailsMutation.mutate(
                    { name },
                    {
                      onSuccess: () => {
                        toast.success('Updated details', { duration: 1500 });
                        setFeedback('');
                      },
                      onError: () => {
                        toast.error('Error in updating details');
                        setFeedback('');
                      },
                    },
                  );
                }}
              >
                <div>
                  <Input
                    className="text-lg"
                    placeholder="Enter your name"
                    value={name ?? ''}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              </AppDrawer>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <Link href="https://twitter.com/KM_Koushik_" target="_blank">
              <Button
                variant="ghost"
                className="text-md w-full justify-between px-0 hover:text-foreground/80"
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1200 1227"
                    fill="none"
                    className="h-5 w-5 px-1"
                  >
                    <g clip-path="url(#clip0_1_2)">
                      <path
                        d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                        fill="white"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_2">
                        <rect width="1200" height="1227" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  Follow us on X
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
            <Link href="https://github.com/oss-apps/split-pro" target="_blank">
              <Button
                variant="ghost"
                className="text-md w-full justify-between px-0 hover:text-foreground/80"
              >
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5 text-gray-200" />
                  Star us on Github
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
            <AppDrawer
              trigger={
                <div className="flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300 hover:text-foreground/80">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    Submit feedback
                  </div>
                  <ChevronRight className="h-6x w-6 text-gray-500" />
                </div>
              }
              leftAction="Close"
              title="Submit a feedback"
              className="h-[70vh]"
              actionTitle="Save"
              shouldCloseOnAction
              actionOnClick={() => {
                submitFeedbackMutation.mutate(
                  { feedback },
                  {
                    onSuccess: () => {
                      toast.success('Feedback submitted successfully');
                      setFeedback('');
                    },
                    onError: () => {
                      toast.error('Error in submitting feedback');
                      setFeedback('');
                    },
                  },
                );
              }}
            >
              <div>
                <Textarea
                  className="text-lg"
                  rows={5}
                  placeholder="Enter your feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                ></Textarea>
              </div>
            </AppDrawer>
            <AppDrawer
              trigger={
                <div className="flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300 hover:text-foreground/80">
                  <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-blue-500" />
                    Download App
                  </div>
                  <ChevronRight className="h-6x w-6 text-gray-500" />
                </div>
              }
              leftAction="Close"
              title="Download App"
              className="h-[70vh]"
              shouldCloseOnAction
            >
              <div className="flex flex-col gap-8">
                <p>You can download SplitPro as a PWA to your home screen</p>

                <p>
                  If you are using iOS, checkout this{' '}
                  <a
                    className="text-cyan-500 underline"
                    href="https://www.youtube.com/watch?v=Tta2h1HdxTk"
                    target="_blank"
                  >
                    video
                  </a>
                </p>

                <p>
                  If you are using Android, checkout this{' '}
                  <a
                    className="text-cyan-500 underline"
                    href="https://web.dev/learn/pwa/installation#android_installation"
                    target="_blank"
                  >
                    Article
                  </a>
                </p>
              </div>
            </AppDrawer>
          </div>

          <div className="mt-20 flex justify-center">
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  return getServerAuthSessionForSSG(context);
};

export default AccountPage;
