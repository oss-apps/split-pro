import { SplitType } from '@prisma/client';
import clsx from 'clsx';
import {
  BarChart2,
  Check,
  DollarSign,
  Equal,
  type LucideIcon,
  Percent,
  Plus,
  X,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { type Participant, useAddExpenseStore } from '~/store/addStore';
import { removeTrailingZeros, toSafeBigInt, toUIString } from '~/utils/numbers';

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
    <Tabs
      value={splitType}
      className="mx-auto mt-5 w-full"
      onValueChange={(v) => setSplitType(v as SplitType)}
    >
      <TabsList className="w-full justify-between">
        {splitProps.map(({ splitType, iconComponent: Icon }) => (
          <TabsTrigger key={splitType} value={splitType} className="text-xs">
            <Icon className="h-5 w-5" />
          </TabsTrigger>
        ))}
      </TabsList>
      {splitProps.map((props) => (
        <TabsContent key={props.splitType} value={props.splitType}>
          <SplitSection {...props} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

interface SplitSectionPropsBase {
  splitType: SplitType;
  iconComponent: LucideIcon;
  prefix: string;
  isBoolean?: boolean;
  fmtSummartyText: (amount: bigint, currency: string, participants: Participant[]) => string;
}

interface BooleanSplitSectionProps extends SplitSectionPropsBase {
  isBoolean: true;
  onChange: (participant: Participant, addOrUpdateParticipant: (p: Participant) => void) => void;
  fmtShareText: null;
  step: null;
}

interface NumericSplitSectionProps extends SplitSectionPropsBase {
  isBoolean: false;
  onChange: (
    participant: Participant,
    addOrUpdateParticipant: (p: Participant) => void,
    value?: string,
  ) => void;
  fmtShareText: (amount: bigint, participant: Participant) => string;
  step?: number;
}

type SplitSectionProps = BooleanSplitSectionProps | NumericSplitSectionProps;

const CURRENCY_TOKEN = '__CURRENCY__';

const splitProps: SplitSectionProps[] = [
  {
    splitType: SplitType.EQUAL,
    iconComponent: Equal,
    prefix: '',
    isBoolean: true,
    fmtSummartyText: (amount, currency, participants) => {
      const totalParticipants = participants.filter((p) => p.splitShare !== 0n).length;
      return `${currency} ${totalParticipants > 0 ? toUIString(amount / BigInt(totalParticipants)) : 0} per person`;
    },
    onChange: (participant, addOrUpdateParticipant) => {
      addOrUpdateParticipant({ ...participant, splitShare: participant.splitShare ? 0n : 1n });
    },
    fmtShareText: null,
    step: null,
  },
  {
    splitType: SplitType.PERCENTAGE,
    iconComponent: Percent,
    prefix: '%',
    isBoolean: false,
    fmtSummartyText: (amount, currency, participants) => {
      const remainingPercentage =
        10000n - participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);
      return `Remaining ${toUIString(remainingPercentage)}%`;
    },
    onChange: (participant, addOrUpdateParticipant, value) => {
      if (value === undefined || value === '') {
        addOrUpdateParticipant({ ...participant, splitShare: 0n });
      } else {
        addOrUpdateParticipant({ ...participant, splitShare: toSafeBigInt(value) });
      }
    },
    fmtShareText: (_amount, participant) => (Number(participant.splitShare) / 100).toString(),
  },
  {
    splitType: SplitType.EXACT,
    iconComponent: DollarSign,
    prefix: CURRENCY_TOKEN,
    isBoolean: false,
    fmtSummartyText: (amount, currency, participants) => {
      const totalAmount = participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);
      return `Remaining ${currency} ${toUIString(amount - totalAmount)}`;
    },
    onChange: (participant, addOrUpdateParticipant, value) => {
      if (value === undefined || value === '') {
        addOrUpdateParticipant({ ...participant, splitShare: 0n });
      } else {
        addOrUpdateParticipant({ ...participant, splitShare: toSafeBigInt(value) });
      }
    },
    fmtShareText: (amount, participant) =>
      removeTrailingZeros(toUIString(participant.splitShare ?? 0n)),
  },
  {
    splitType: SplitType.SHARE,
    iconComponent: BarChart2,
    prefix: 'Share(s)',
    isBoolean: false,
    fmtSummartyText: (_amount, _currency, participants) => {
      const totalShares = participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);
      return `Total shares ${Number(totalShares) / 100}`;
    },
    onChange: (participant, addOrUpdateParticipant, value) => {
      if (value === undefined || value === '') {
        addOrUpdateParticipant({ ...participant, splitShare: 0n });
      } else {
        addOrUpdateParticipant({ ...participant, splitShare: toSafeBigInt(value) });
      }
    },
    fmtShareText: (_amount, participant) => (Number(participant.splitShare) / 100).toString(),
    step: 1,
  },
  {
    splitType: SplitType.ADJUSTMENT,
    iconComponent: Plus,
    prefix: CURRENCY_TOKEN,
    isBoolean: false,
    fmtSummartyText: () => {
      return ``;
    },
    onChange: (participant, addOrUpdateParticipant, value) => {
      if (value === undefined || value === '') {
        addOrUpdateParticipant({ ...participant, splitShare: 0n });
      } else {
        addOrUpdateParticipant({ ...participant, splitShare: toSafeBigInt(value) });
      }
    },
    fmtShareText: (_amount, participant) => removeTrailingZeros(toUIString(participant.splitShare)),
  },
];

const SplitSection: React.FC<SplitSectionProps> = ({
  prefix,
  isBoolean,
  fmtSummartyText,
  onChange,
  fmtShareText,
  step,
}) => {
  const participants = useAddExpenseStore((s) => s.participants);
  const currency = useAddExpenseStore((s) => s.currency);
  const amount = useAddExpenseStore((s) => s.amount);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const { addOrUpdateParticipant } = useAddExpenseStore((s) => s.actions);

  const summaryText = useMemo(
    () => fmtSummartyText(amount, currency, participants),
    [amount, currency, participants, fmtSummartyText],
  );

  const selectAll = useCallback(() => {
    const allSelected = participants.every((p) => p.splitShare !== 0n);
    participants.forEach((p) => {
      addOrUpdateParticipant({ ...p, splitShare: allSelected ? 0n : 1n });
    });
  }, [participants, addOrUpdateParticipant]);

  const allSelected = useMemo(() => participants.every((p) => p.splitShare !== 0n), [participants]);

  return (
    <div className="relative mt-4 flex flex-col gap-6 px-2">
      <div className="mb-2 flex flex-grow justify-center">
        <div className={`${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'}`}>
          {summaryText}
        </div>
      </div>
      {isBoolean && (
        <div className="absolute right-0 top-0">
          <button
            className="flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5"
            onClick={selectAll}
          >
            {allSelected ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            <span className="text-sm">All</span>
          </button>
        </div>
      )}
      {participants.map((p) => (
        <div
          key={p.id}
          className={clsx('flex items-center justify-between', isBoolean && 'cursor-pointer')}
          onClick={isBoolean ? () => onChange(p, addOrUpdateParticipant) : undefined}
        >
          <UserAndAmount user={p} currency={currency} />
          {isBoolean ? (
            p.splitShare !== 0n ? (
              <Check className="h-6 w-6 text-cyan-500" />
            ) : null
          ) : (
            <div className="flex items-center gap-1">
              <p className="text-xs">{prefix.replace(CURRENCY_TOKEN, currency)}</p>
              <Input
                type="number"
                value={fmtShareText(amount, p)}
                inputMode="decimal"
                className="ml-2 w-20 text-lg"
                placeholder="0"
                min={0}
                step={step ?? 0.01}
                onChange={(e) => onChange(p, addOrUpdateParticipant, e.target.value)}
              />
            </div>
          )}
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
