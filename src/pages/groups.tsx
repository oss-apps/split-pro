import { PlusIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';

import { CreateGroup } from '~/components/group/CreateGroup';
import MainLayout from '~/components/Layout/MainLayout';
import { GroupAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { BigMath, toUIString } from '~/utils/numbers';

const BalancePage: NextPageWithUser = () => {
  const groupQuery = api.group.getAllGroupsWithBalances.useQuery();

  const actions = useMemo(
    () => (
      <CreateGroup>
        <PlusIcon className="text-primary h-6 w-6" />
      </CreateGroup>
    ),
    [],
  );

  return (
    <>
      <Head>
        <title>Groups</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout title="Groups" actions={actions} loading={groupQuery.isPending}>
        <div className="mt-7 flex flex-col gap-8 pb-36">
          {0 === groupQuery.data?.length ? (
            <div className="mt-[30vh] flex flex-col items-center justify-center gap-20">
              <CreateGroup>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </CreateGroup>
            </div>
          ) : (
            groupQuery.data?.map((g) => {
              const [currency, amount] = Object.entries(g.balances).reduce(
                (acc, balance) => {
                  if (BigMath.abs(balance[1]) > BigMath.abs(acc[1])) {
                    return balance;
                  }
                  return acc;
                },
                [g.defaultCurrency, 0n],
              );
              const multiCurrency = 1 < Object.values(g.balances).filter((b) => 0n !== b).length;
              return (
                <GroupBalance
                  key={g.id}
                  groupId={g.id}
                  name={g.name}
                  amount={amount}
                  isPositive={0 <= amount}
                  currency={currency}
                  multiCurrency={multiCurrency}
                />
              );
            })
          )}
        </div>
      </MainLayout>
    </>
  );
};

const GroupBalance: React.FC<{
  groupId: number;
  name: string;
  amount: bigint;
  isPositive: boolean;
  currency: string;
  multiCurrency?: boolean;
}> = ({ name, amount, isPositive, currency, groupId, multiCurrency }) => {
  return (
    <Link href={`/groups/${groupId}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GroupAvatar name={name} size={40} />
          <div className="text-foreground">{name}</div>
        </div>
        <div>
          {0n === amount ? (
            <div className="text-sm text-gray-400">Settled up</div>
          ) : (
            <>
              <div
                className={clsx(
                  'text-right text-xs',
                  isPositive ? 'text-emerald-500' : 'text-orange-600',
                )}
              >
                {isPositive ? 'you lent' : 'you owe'}
              </div>
              <div className={`${isPositive ? 'text-emerald-500' : 'text-orange-600'} text-right`}>
                {currency} {toUIString(amount)}
                {multiCurrency ? '*' : ''}
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
