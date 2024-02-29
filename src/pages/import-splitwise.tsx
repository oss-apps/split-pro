import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { type User } from '@prisma/client';
import { Input } from '~/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';
import Image from 'next/image';
import { type SplitwiseUser } from '~/types';
import { api } from '~/utils/api';
import { Button } from '~/components/ui/button';

const ImportSpliwisePage: NextPage<{ user: User }> = ({ user }) => {
  const [usersWithBalance, setUsersWithBalance] = useState<Array<SplitwiseUser>>([]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    const file = files?.[0];

    if (!file) return;

    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>;
      const friendsWithOutStandingBalance: Array<SplitwiseUser> = [];
      for (const friend of json.friends as Array<Record<string, unknown>>) {
        const balance = friend.balance as Array<{ currency_code: string; amount: string }>;
        if (balance.length && friend.registration_status === 'confirmed') {
          friendsWithOutStandingBalance.push(friend as SplitwiseUser);
        }
      }

      setUsersWithBalance(friendsWithOutStandingBalance);

      console.log('Friends with outstanding balance', friendsWithOutStandingBalance);
    } catch (e) {
      toast.error('Error importing file');
    }
  };

  const importMutation = api.user.importUsersFromSplitWise.useMutation();

  function onImport() {
    importMutation.mutate(usersWithBalance);
  }

  return (
    <>
      <Head>
        <title>Import from splitwise</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="p-4">
        <p>You can easily import balances to splitwise</p>

        <Input onChange={handleFileChange} id="splitwise-json" type="file" accept=".json" />

        {usersWithBalance.length ? (
          <div className="mt-8 flex flex-col gap-4">
            {usersWithBalance.map((user) => (
              <div key={user.id} className="flex  items-center  justify-between ">
                <div className="flex items-center gap-2">
                  <Image
                    src={user.picture.small}
                    alt={`${user.first_name} ${user.last_name} logo`}
                    className="rounded-full"
                    width={30}
                    height={30}
                  ></Image>
                  <p>{user.first_name}</p>
                </div>
                <div className="flex flex-wrap">
                  {user.balance.map((b) => (
                    <span key={b.currency_code} className="text-sm">
                      {b.currency_code} {b.amount}
                      {' + '}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <Button onClick={onImport}>Import</Button>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return getServerAuthSessionForSSG(context);
};

export default ImportSpliwisePage;
