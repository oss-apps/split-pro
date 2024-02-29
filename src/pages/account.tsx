import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import MainLayout from '~/components/Layout/MainLayout';
import Avatar from 'boring-avatars';
import clsx from 'clsx';
import { Separator } from '~/components/ui/separator';
import { Button } from '~/components/ui/button';
import {
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  ArrowUpOnSquareIcon,
} from '@heroicons/react/24/outline';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { type User } from '@prisma/client';
import { api } from '~/utils/api';
import Link from 'next/link';
import { UserAvatar } from '~/components/ui/avatar';
import {
  ArrowRightIcon,
  Bug,
  ChevronRight,
  Download,
  Edit,
  Github,
  Heart,
  MessageSquare,
  Pencil,
} from 'lucide-react';
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
                  />
                </div>
              </AppDrawer>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <Button variant="ghost" className="text-md w-full justify-between px-0">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Support us
              </div>
              <ChevronRight className="h-6 w-6 text-gray-500" />
            </Button>
            <Button variant="ghost" className="text-md w-full justify-between px-0">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5 text-gray-200" />
                Star us on Github
              </div>
              <ChevronRight className="h-6 w-6 text-gray-500" />
            </Button>
            <AppDrawer
              trigger={
                <div className="flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300">
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
          </div>
          <div>
            <Link className="mt-8 flex gap-2 " href="/import-splitwise">
              <Download />
              Import from Splitwise
            </Link>
          </div>
          <div className="mt-20 flex justify-center">
            <Button variant="ghost" className="text-orange-600" onClick={() => signOut()}>
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
