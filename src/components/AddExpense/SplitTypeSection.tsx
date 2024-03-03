import { type Participant, useAddExpenseStore } from '~/store/addStore';
import { Button } from '../ui/button';
import { AppDrawer, Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '../ui/drawer';
import { UserAvatar } from '../ui/avatar';
import { BarChart2, Check, Diff, DollarSign, Equal, Percent } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { useState } from 'react';
import { SplitType } from '@prisma/client';

export const SplitTypeSection: React.FC = () => {
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const participants = useAddExpenseStore((s) => s.participants);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitType = useAddExpenseStore((s) => s.splitType);

  const { setPaidBy } = useAddExpenseStore((s) => s.actions);

  return (
    <div className="mt-4 flex items-center justify-center text-gray-400">
      <p>Paid by</p>
      <AppDrawer
        trigger={
          <div className="max-w-28 overflow-hidden text-ellipsis text-nowrap px-1.5 text-[16px] text-cyan-500 lg:max-w-48">
            {currentUser?.id === paidBy?.id ? 'you' : paidBy?.name ?? paidBy?.email}
          </div>
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
          <div className=" max-w-32 overflow-hidden text-ellipsis text-nowrap px-1.5 text-[16px] text-cyan-500 lg:max-w-48">
            {splitType === SplitType.EQUAL ? 'split equally' : `split unequally`}
          </div>
        }
        title={splitType.toLowerCase()}
        className="h-[85vh] lg:h-[70vh]"
        shouldCloseOnAction
        dismissible={false}
        actionTitle="Save"
        actionDisabled={!canSplitScreenClosed}
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
        <TabsContent value="password">Change your password here.</TabsContent>
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

  const totalParticipants = participants.filter((p) => p.splitShare !== 0).length;

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div
        className={`mb-2 text-center ${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'} t`}
      >
        {currency} {(amount / totalParticipants).toFixed(2)} per person
      </div>
      {participants.map((p) => (
        <button
          key={p.id}
          className=" mt-2.5 flex justify-between"
          onClick={() => addOrUpdateParticipant({ ...p, splitShare: p.splitShare === 0 ? 1 : 0 })}
        >
          <div className="flex items-center gap-2">
            <UserAvatar user={p} size={30} />
            {p.name ?? p.email}
          </div>
          {p.splitShare !== 0 ? (
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
      addOrUpdateParticipant({ ...p, splitShare: 0 });
      return;
    }
    addOrUpdateParticipant({ ...p, splitShare: parseFloat(value) });
  };

  const remainingPercentage = 100 - participants.reduce((acc, p) => acc + (p.splitShare ?? 0), 0);

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div
        className={`mb-2 text-center ${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'} t`}
      >
        Remaining {remainingPercentage}%
      </div>
      {participants.map((p) => (
        <div key={p.id} className="flex justify-between">
          <div className="flex items-center gap-2">
            <UserAvatar user={p} size={30} />
            {p.name ?? p.email}
          </div>
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
        acc[p.id] = p.splitShare?.toString();
        return acc;
      },
      {} as Record<string, string | undefined>,
    ),
  );

  const handleSplitShareChange = (p: Participant, value: string) => {
    setSplitShareValue({ ...splitShareValue, [p.id]: value });
    if (value === '' || isNaN(parseFloat(value))) {
      addOrUpdateParticipant({ ...p, splitShare: 0 });
      return;
    }
    addOrUpdateParticipant({ ...p, splitShare: parseFloat(value) });
  };

  const remainingPercentage =
    amount - participants.reduce((acc, p) => acc + (p.splitShare ?? 0), 0);

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div
        className={`mb-2 text-center ${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'} t`}
      >
        {' '}
        Remaining {currency} {remainingPercentage}
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
      addOrUpdateParticipant({ ...p, splitShare: 0 });
      return;
    }
    addOrUpdateParticipant({ ...p, splitShare: parseFloat(value) });
  };

  const totalShare = participants.reduce((acc, p) => acc + (p.splitShare ?? 0), 0);

  return (
    <div className="mt-4 flex flex-col gap-6 px-2">
      <div className="mb-2 text-center text-gray-300">Total shares {totalShare}</div>
      {participants.map((p) => (
        <div key={p.id} className="flex justify-between">
          <div className="flex items-center gap-2">
            <UserAvatar user={p} size={30} />
            {p.name ?? p.email}
          </div>
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
