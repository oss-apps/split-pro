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
import { type ChangeEvent, useCallback, useMemo } from 'react';

import { SplitType } from '~/prisma/client';
import { type AddExpenseState, type Participant, useAddExpenseStore } from '~/store/addStore';
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
    <div className="flex items-center justify-center text-[16px] text-gray-400 sm:mt-4">
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

  const onTabChange = useCallback(
    (value: string) => {
      setSplitType(value as SplitType);
    },
    [setSplitType],
  );

  return (
    <Tabs value={splitType} className="mx-auto mt-5 w-full" onValueChange={onTabChange}>
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
  fmtSummartyText: (
    amount: bigint,
    currency: string,
    participants: AddExpenseState['participants'],
    splitShares: AddExpenseState['splitShares'],
  ) => string;
}

interface BooleanSplitSectionProps extends SplitSectionPropsBase {
  isBoolean: true;
  fmtShareText: null;
  step: null;
}

interface NumericSplitSectionProps extends SplitSectionPropsBase {
  isBoolean: false;
  fmtShareText: (share: bigint) => string;
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
    fmtSummartyText: (amount, currency, participants, splitShares) => {
      const totalParticipants = participants.filter(
        (p) => splitShares[p.id]?.[SplitType.EQUAL] !== 0n,
      ).length;
      return `${currency} ${totalParticipants > 0 ? toUIString(amount / BigInt(totalParticipants)) : 0} per person`;
    },
    fmtShareText: null,
    step: null,
  },
  {
    splitType: SplitType.PERCENTAGE,
    iconComponent: Percent,
    prefix: '%',
    isBoolean: false,
    fmtSummartyText: (amount, currency, participants, splitShares) => {
      const remainingPercentage =
        10000n -
        participants.reduce(
          (acc, p) => acc + (splitShares[p.id]?.[SplitType.PERCENTAGE] ?? 0n),
          0n,
        );
      return `Remaining ${toUIString(remainingPercentage, true)}%`;
    },
    fmtShareText: (share) => (Number(share) / 100).toString(),
  },
  {
    splitType: SplitType.EXACT,
    iconComponent: DollarSign,
    prefix: CURRENCY_TOKEN,
    isBoolean: false,
    fmtSummartyText: (amount, currency, participants, splitShares) => {
      const totalAmount = participants.reduce(
        (acc, p) => acc + (splitShares[p.id]?.[SplitType.EXACT] ?? 0n),
        0n,
      );
      return `Remaining ${currency} ${toUIString(amount - totalAmount, true)}`;
    },
    fmtShareText: (share) => removeTrailingZeros(toUIString(share)),
  },
  {
    splitType: SplitType.SHARE,
    iconComponent: BarChart2,
    prefix: 'Share(s)',
    isBoolean: false,
    fmtSummartyText: (_amount, _currency, participants, splitShares) => {
      const totalShares = participants.reduce(
        (acc, p) => acc + (splitShares[p.id]?.[SplitType.SHARE] ?? 0n),
        0n,
      );
      return `Total shares ${Number(totalShares) / 100}`;
    },
    fmtShareText: (share) => (Number(share) / 100).toString(),
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
    fmtShareText: (share) => removeTrailingZeros(toUIString(share)),
  },
];

const SplitSection: React.FC<SplitSectionProps> = ({
  splitType,
  prefix,
  isBoolean,
  fmtSummartyText,
  fmtShareText,
  step,
}) => {
  const participants = useAddExpenseStore((s) => s.participants);
  const currency = useAddExpenseStore((s) => s.currency);
  const amount = useAddExpenseStore((s) => s.amount);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const { setSplitShare } = useAddExpenseStore((s) => s.actions);

  const summaryText = useMemo(
    () => fmtSummartyText(amount, currency, participants, splitShares),
    [amount, currency, participants, fmtSummartyText, splitShares],
  );
  const allSelected = useMemo(
    () => participants.every((p) => splitShares[p.id]?.[splitType] !== 0n),
    [participants, splitShares, splitType],
  );

  const selectAll = useCallback(() => {
    participants.forEach((p) => {
      setSplitShare(splitType, p.id, allSelected ? 0n : 1n);
    });
  }, [participants, setSplitShare, splitType, allSelected]);

  const onToggleBoolean = useCallback(
    (userId: number) => {
      setSplitShare(splitType, userId, splitShares[userId]?.[splitType] === 0n ? 1n : 0n);
    },
    [setSplitShare, splitType, splitShares],
  );

  const onChangeInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>, userId: number) => {
      const value = e.target.value;
      setSplitShare(
        splitType,
        userId,
        value === undefined || value === '' ? 0n : toSafeBigInt(value),
      );
    },
    [setSplitShare, splitType],
  );

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
      {participants.map((p) => {
        const share = splitShares[p.id]?.[splitType];
        return (
          <div
            key={p.id}
            className={clsx('flex items-center justify-between', isBoolean && 'cursor-pointer')}
            onClick={isBoolean ? () => onToggleBoolean(p.id) : undefined}
          >
            <UserAndAmount user={p} currency={currency} />
            {isBoolean ? (
              share !== 0n ? (
                <Check className="h-6 w-6 text-cyan-500" />
              ) : null
            ) : (
              <div className="flex items-center gap-1">
                <p className="text-xs">{prefix.replace(CURRENCY_TOKEN, currency)}</p>
                <Input
                  type="number"
                  value={share ? fmtShareText(share) : ''}
                  inputMode="decimal"
                  className="ml-2 w-20 text-lg"
                  placeholder="0"
                  min={0}
                  step={step ?? 0.01}
                  onChange={(e) => onChangeInput(e, p.id)}
                />
              </div>
            )}
          </div>
        );
      })}
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
