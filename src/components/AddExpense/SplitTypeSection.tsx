import { SplitType } from '@prisma/client';
import { BarChart2, Check, DollarSign, Equal, Percent, Plus, X } from 'lucide-react';
import { useState } from 'react';

import { type Participant, useAddExpenseStore } from '~/store/addStore';
import { toSafeBigInt, toUIString } from '~/utils/numbers';

import { UserAvatar } from '../ui/avatar';
import { AppDrawer, DrawerClose } from '../ui/drawer';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export const SplitTypeSection: React.FC = () => {
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const participants = useAddExpenseStore((s) => s.participants);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const splitScreenOpen = useAddExpenseStore((s) => s.splitScreenOpen);

  const { setPaidBy, setSplitScreenOpen } = useAddExpenseStore((s) => s.actions);

  return (
    <div className="mt-4 flex items-center justify-center text-[16px] text-gray-400">
      <p className="text-[16px]">Paid by </p>
      <AppDrawer
        trigger={
          <p className="overflow-hidden text-ellipsis text-nowrap px-1.5 text-[16.5px] text-cyan-500 lg:max-w-48">
            {
              (currentUser?.id === paidBy?.id ? 'you' : (paidBy?.name ?? paidBy?.email))?.split(
                ' ',
              )[0]
            }
          </p>
        }
        title="Paid by"
        className="h-[70vh]"
        shouldCloseOnAction
      >
        <div className="flex flex-col gap-6 overflow-auto">
          {participants.map((participant) => (
            <DrawerClose
              key={participant.id}
              className="flex items-center justify-between px-2"
              onClick={() => setPaidBy(participant)}
            >
              <div className="flex items-center gap-1">
                <UserAvatar user={participant} size={30} />
                <p className="ml-4">{participant.name ?? participant.email ?? ''}</p>
              </div>
              {participant.id === paidBy?.id ? <Check className="h-6 w-6 text-cyan-500" /> : null}
            </DrawerClose>
          ))}
        </div>
      </AppDrawer>

      <p>and </p>
      <AppDrawer
        trigger={
          <div className=" max-w-32 overflow-hidden text-ellipsis text-nowrap px-1.5 text-[16.5px] text-cyan-500 lg:max-w-48">
            {splitType === SplitType.EQUAL ? 'split equally' : `split unequally`}
          </div>
        }
        title={splitType.charAt(0).toUpperCase() + splitType.slice(1).toLowerCase()}
        className="h-[85vh] lg:h-[70vh]"
        shouldCloseOnAction
        dismissible={false}
        actionTitle="Save"
        actionDisabled={!canSplitScreenClosed}
        open={splitScreenOpen}
        onOpenChange={(open) => setSplitScreenOpen(open)}
      >
        <SplitExpenseForm />
      </AppDrawer>
    </div>
  );
};

const SplitExpenseForm: React.FC = () => {
  const splitType = useAddExpenseStore((s) => s.splitType);
  const { setSplitType } = useAddExpenseStore((s) => s.actions);

  return (
    <div>
      <Tabs
        value={splitType}
        className="mx-auto mt-5 w-full"
        onValueChange={(v) => setSplitType(v as SplitType)}
      >
        <TabsList className="w-full justify-between">
          <TabsTrigger className="text-xs" value={SplitType.EQUAL}>
            <Equal className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger className="text-xs" value={SplitType.PERCENTAGE}>
            <Percent className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger className="text-xs" value={SplitType.EXACT}>
            <DollarSign className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger className="text-xs" value={SplitType.SHARE}>
            <BarChart2 className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger className="text-xs" value={SplitType.ADJUSTMENT}>
            <Plus className="h-5 w-5" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value={SplitType.EQUAL}>
          <SplitEqualSection />
        </TabsContent>
        <TabsContent value={SplitType.PERCENTAGE}>
          <SplitByPercentageSection />
        </TabsContent>
        <TabsContent value={SplitType.EXACT}>
          <SplitByAmountSection />
        </TabsContent>
        <TabsContent value={SplitType.SHARE}>
          <SplitByShareSection />
        </TabsContent>
        <TabsContent value={SplitType.ADJUSTMENT}>
          <SplitByAdjustmentSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SplitEqualSection: React.FC = () => {
  const participants = useAddExpenseStore((s) => s.participants);
  const currency = useAddExpenseStore((s) => s.currency);
  const amount = useAddExpenseStore((s) => s.amount);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const { addOrUpdateParticipant } = useAddExpenseStore((s) => s.actions);

  const totalParticipants = participants.filter((p) => p.splitShare !== 0n).length;

  const selectAll = () => {
    const allSelected = participants.every((p) => p.splitShare !== 0n);
    participants.forEach((p) => {
      addOrUpdateParticipant({ ...p, splitShare: allSelected ? 0n : 1n });
    });
  };

  const allSelected = participants.every((p) => p.splitShare !== 0n);

  return (
    <div className="relative mt-4 flex flex-col gap-6 px-2">
      <div className="flex items-center">
        <div className="mb-2 flex flex-grow justify-center">
          <div className={`${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'}`}>
            {currency} {toUIString(amount / BigInt(totalParticipants))} per person
          </div>
        </div>
      </div>
      <div className="absolute right-0 top-0">
        <button
          className="flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5"
          onClick={selectAll}
        >
          {allSelected ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span className="text-sm">All</span>
        </button>
      </div>
      {participants.map((p) => (
        <button
          key={p.id}
          className="flex items-center justify-between"
          onClick={() =>
            addOrUpdateParticipant({ ...p, splitShare: p.splitShare === 0n ? 1n : 0n })
          }
        >
          <UserAndAmount user={p} currency={currency} />
          {p.splitShare !== 0n ? (
            <div>
              <Check className="h-6 w-6 text-cyan-500" />
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
};

const SplitByPercentageSection: React.FC = () => {
  const participants = useAddExpenseStore((s) => s.participants);
  const { addOrUpdateParticipant } = useAddExpenseStore((s) => s.actions);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const currency = useAddExpenseStore((s) => s.currency);

  const [splitShareValue, setSplitShareValue] = useState(
    participants.reduce(
      (acc, p) => {
        acc[p.id] = p.splitShare?.toString();
        return acc;
      },
      {} as Record<string, string | undefined>,
    ),
  );

  const handleSplitShareChange = (p: Participant, value: string) => {
    setSplitShareValue({ ...splitShareValue, [p.id]: value });
    if (value === '' || isNaN(parseFloat(value))) {
      addOrUpdateParticipant({ ...p, splitShare: 0n });
      return;
    }
    addOrUpdateParticipant({ ...p, splitShare: toSafeBigInt(value) });
  };

  const remainingPercentage =
    10000n - participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div
        className={`mb-2 text-center ${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'} t`}
      >
        Remaining {toUIString(remainingPercentage)}%
      </div>
      {participants.map((p) => (
        <div key={p.id} className="flex justify-between">
          <UserAndAmount user={p} currency={currency} />

          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={splitShareValue[p.id]}
              inputMode="decimal"
              className=" w-16 text-lg"
              onChange={(e) => handleSplitShareChange(p, e.target.value)}
            />
            {'  '}%
          </div>
        </div>
      ))}
    </div>
  );
};

const SplitByAmountSection: React.FC = () => {
  const participants = useAddExpenseStore((s) => s.participants);
  const currency = useAddExpenseStore((s) => s.currency);
  const amount = useAddExpenseStore((s) => s.amount);
  const { addOrUpdateParticipant } = useAddExpenseStore((s) => s.actions);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);

  const [splitShareValue, setSplitShareValue] = useState(
    participants.reduce(
      (acc, p) => {
        acc[p.id] = p.splitShare?.toString() ?? '';
        return acc;
      },
      {} as Record<string, string | undefined>,
    ),
  );

  const handleSplitShareChange = (p: Participant, value: string) => {
    setSplitShareValue({ ...splitShareValue, [p.id]: value });
    if (value === '' || isNaN(parseFloat(value))) {
      addOrUpdateParticipant({ ...p, splitShare: 0n });
      return;
    }
    addOrUpdateParticipant({ ...p, splitShare: toSafeBigInt(value) });
  };

  const totalSplitShare = participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);

  const remainingAmount = amount - totalSplitShare;

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div
        className={`mb-2 text-center ${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'} t`}
      >
        Remaining {currency} {toUIString(remainingAmount)}
      </div>
      {participants.map((p) => (
        <div key={p.id} className="flex justify-between">
          <div className="flex items-center gap-2">
            <UserAvatar user={p} size={30} />
            {p.name ?? p.email}
          </div>
          <div className="flex items-center gap-1">
            <p className="text-xs">{currency}</p>
            <Input
              type="number"
              value={splitShareValue[p.id]}
              inputMode="decimal"
              className=" ml-2 w-16 text-lg"
              onChange={(e) => handleSplitShareChange(p, e.target.value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const SplitByShareSection: React.FC = () => {
  const participants = useAddExpenseStore((s) => s.participants);
  const { addOrUpdateParticipant } = useAddExpenseStore((s) => s.actions);
  const currency = useAddExpenseStore((s) => s.currency);

  const [splitShareValue, setSplitShareValue] = useState(
    participants.reduce(
      (acc, p) => {
        acc[p.id] = p.splitShare?.toString();
        return acc;
      },
      {} as Record<string, string | undefined>,
    ),
  );

  const handleSplitShareChange = (p: Participant, value: string) => {
    setSplitShareValue({ ...splitShareValue, [p.id]: value });
    if (value === '' || isNaN(parseFloat(value))) {
      addOrUpdateParticipant({ ...p, splitShare: 0n });
      return;
    }
    addOrUpdateParticipant({ ...p, splitShare: toSafeBigInt(value) });
  };

  const totalShare = participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div className="mb-2 text-center text-gray-300">Total shares {toUIString(totalShare)}</div>
      {participants.map((p) => (
        <div key={p.id} className="flex justify-between">
          <UserAndAmount user={p} currency={currency} />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={splitShareValue[p.id]}
              inputMode="decimal"
              className=" ml-2 w-16 text-lg"
              onChange={(e) => handleSplitShareChange(p, e.target.value)}
            />
            <p className="text-xs">Share(s)</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const SplitByAdjustmentSection: React.FC = () => {
  const participants = useAddExpenseStore((s) => s.participants);
  const currency = useAddExpenseStore((s) => s.currency);
  const amount = useAddExpenseStore((s) => s.amount);
  const { addOrUpdateParticipant } = useAddExpenseStore((s) => s.actions);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);

  const [splitShareValue, setSplitShareValue] = useState(
    participants.reduce(
      (acc, p) => {
        acc[p.id] = p.splitShare?.toString();
        return acc;
      },
      {} as Record<string, string | undefined>,
    ),
  );

  const handleSplitShareChange = (p: Participant, value: string) => {
    setSplitShareValue({ ...splitShareValue, [p.id]: value });
    if (value === '' || isNaN(parseFloat(value))) {
      addOrUpdateParticipant({ ...p, splitShare: 0n });
      return;
    }
    addOrUpdateParticipant({ ...p, splitShare: toSafeBigInt(value) });
  };

  const remainingPercentage =
    amount - participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div
        className={`mb-2 text-center ${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'} t`}
      >
        {' '}
        Remaining to split equally {currency} {toUIString(remainingPercentage)}
      </div>
      {participants.map((p) => (
        <div key={p.id} className="flex justify-between">
          <UserAndAmount user={p} currency={currency} />
          <div className="flex items-center gap-1">
            <p className="text-xs">{currency}</p>

            <Input
              type="number"
              value={splitShareValue[p.id]}
              inputMode="decimal"
              className=" ml-2 w-16 text-lg"
              onChange={(e) => handleSplitShareChange(p, e.target.value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const UserAndAmount: React.FC<{ user: Participant; currency: string }> = ({
  user,
  currency,
}) => {
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const amount = useAddExpenseStore((s) => s.amount);

  const shareAmount = paidBy?.id === user.id ? (user.amount ?? 0n) - amount : user.amount;

  return (
    <div className="flex items-center gap-2">
      <UserAvatar user={user} size={30} />
      <div className="flex flex-col items-start">
        <p>{user.name ?? user.email}</p>
        <p className={`'text-gray-400' text-sm text-gray-400`}>
          {(shareAmount ?? 0n) > 0n ? '-' : ''} {currency} {toUIString(shareAmount)}
        </p>
      </div>
    </div>
  );
};
