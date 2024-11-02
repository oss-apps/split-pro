import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import clsx from 'clsx';
import { Button } from '~/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/solid';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { type User } from '@prisma/client';
import { api } from '~/utils/api';
import { CreateGroup } from '~/components/group/CreateGroup';
import Link from 'next/link';
import { GroupAvatar } from '~/components/ui/avatar';
import { toUIString } from '~/utils/numbers';
import { motion } from 'framer-motion';
import { type NextPageWithUser } from '~/types';

const BalancePage: NextPageWithUser = () => {
  const groupQuery = api.group.getAllGroupsWithBalances.useQuery();

  return (
    <>
      <Head>
        <title>Gruppen</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title="Gruppen"
        actions={
          <CreateGroup>
            <PlusIcon className="h-6 w-6 text-primary" />
          </CreateGroup>
        }
      >
        <div className="mt-2">
          <div className="mt-5 flex flex-col gap-8 px-4 pb-36">
            {groupQuery.isLoading ? null : groupQuery.data?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-[30vh] flex flex-col items-center justify-center gap-20"
              >
                <CreateGroup>
                  <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create Group
                  </Button>
                </CreateGroup>
              </motion.div>
            ) : (
              groupQuery.data?.map((g) => {
                const [amount, currency] = Object.keys(g.balances).length
                  ? [Object.values(g.balances)[0] ?? 0, Object.keys(g.balances)[0] ?? 'USD']
                  : [0, 'USD'];
                return (
                  <GroupBalance
                    key={g.id}
                    groupId={g.id}
                    name={g.name}
                    amount={amount}
                    isPositive={amount >= 0 ? true : false}
                    currency={currency}
                  />
                );
              })
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

const GroupBalance: React.FC<{
  groupId: number;
  name: string;
  amount: number;
  isPositive: boolean;
  currency: string;
}> = ({ name, amount, isPositive, currency, groupId }) => {
  return (
    <Link href={`/groups/${groupId}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GroupAvatar name={name} size={40} />
          <div className=" text-foreground">{name}</div>
        </div>
        <div>
          {amount === 0 ? (
            <div className="text-sm text-gray-400">Ausgeglichen</div>
          ) : (
            <>
              <div
                className={clsx(
                  'text-right text-xs',
                  isPositive ? 'text-emerald-500' : 'text-orange-600',
                )}
              >
                {isPositive ? 'du leihst' : 'du schuldest'}
              </div>
              <div className={`${isPositive ? 'text-emerald-500' : 'text-orange-600'} text-right`}>
                {currency} {toUIString(amount)}
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

BalancePage.auth = true;

export default BalancePage;