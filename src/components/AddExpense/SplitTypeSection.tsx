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
import { type TFunction, useTranslation } from 'next-i18next';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { type AddExpenseState, type Participant, useAddExpenseStore } from '~/store/addStore';
import {
  calculateExactRemainderDistribution,
  removeTrailingZeros,
  toSafeBigInt,
  toUIString,
} from '~/utils/numbers';

import { UserAvatar } from '../ui/avatar';
import { AppDrawer, DrawerClose } from '../ui/drawer';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export const SplitTypeSection: React.FC = () => {
  const { t } = useTranslation('expense_details');
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const participants = useAddExpenseStore((s) => s.participants);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const splitScreenOpen = useAddExpenseStore((s) => s.splitScreenOpen);

  const { setPaidBy, setSplitScreenOpen } = useAddExpenseStore((s) => s.actions);

  return (
    <div className="flex items-center justify-center text-[16px] text-gray-400 sm:mt-4">
      <p className="text-[16px]">{t('ui.add_expense_details.split_type_section.paid_by')} </p>
      <AppDrawer
        trigger={
          <p className="overflow-hidden px-1.5 text-[16.5px] text-nowrap text-ellipsis text-cyan-500 lg:max-w-48">
            {
              (currentUser?.id === paidBy?.id
                ? t('ui.add_expense_details.split_type_section.you')
                : (paidBy?.name ?? paidBy?.email)
              )?.split(' ')[0]
            }
          </p>
        }
        title={t('ui.add_expense_details.split_type_section.paid_by')}
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

      <p>{t('ui.add_expense_details.split_type_section.and')} </p>
      <AppDrawer
        trigger={
          <div className="max-w-32 overflow-hidden px-1.5 text-[16.5px] text-nowrap text-ellipsis text-cyan-500 lg:max-w-48">
            {splitType === SplitType.EQUAL
              ? t('ui.add_expense_details.split_type_section.split_equally')
              : t('ui.add_expense_details.split_type_section.split_unequally')}
          </div>
        }
        title={t(
          `ui.add_expense_details.split_type_section.types.${splitType.toLowerCase()}.title`,
        )}
        className="h-[85vh] lg:h-[70vh]"
        shouldCloseOnAction
        dismissible={false}
        actionTitle={t('ui.add_expense_details.split_type_section.save')}
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
  const { t } = useTranslation('expense_details');
  const splitType = useAddExpenseStore((s) => s.splitType);
  const { setSplitType } = useAddExpenseStore((s) => s.actions);

  const onTabChange = useCallback(
    (value: string) => {
      setSplitType(value as SplitType);
    },
    [setSplitType],
  );

  const splitProps = useMemo(() => getSplitProps(t), [t]);

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

const getSplitProps = (t: TFunction): SplitSectionProps[] => [
  {
    splitType: SplitType.EQUAL,
    iconComponent: Equal,
    prefix: '',
    isBoolean: true,
    fmtSummartyText: (amount, currency, participants, splitShares) => {
      const totalParticipants = participants.filter(
        (p) => 0n !== splitShares[p.id]?.[SplitType.EQUAL],
      ).length;
      return `${currency} ${0 < totalParticipants ? toUIString(amount / BigInt(totalParticipants)) : 0} ${t('ui.add_expense_details.split_type_section.types.equal.per_person')}`;
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
      return `${t('ui.add_expense_details.split_type_section.types.percentage.remaining')} ${toUIString(remainingPercentage, true)}%`;
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
      return `${t('ui.add_expense_details.split_type_section.types.exact.remaining')} ${currency} ${toUIString(amount - totalAmount, true)}`;
    },
    fmtShareText: (share) => removeTrailingZeros(toUIString(share)),
  },
  {
    splitType: SplitType.SHARE,
    iconComponent: BarChart2,
    prefix: t('ui.add_expense_details.split_type_section.types.share.shares'),
    isBoolean: false,
    fmtSummartyText: (_amount, _currency, participants, splitShares) => {
      const totalShares = participants.reduce(
        (acc, p) => acc + (splitShares[p.id]?.[SplitType.SHARE] ?? 0n),
        0n,
      );
      return `${t('ui.add_expense_details.split_type_section.types.share.total_shares')} ${Number(totalShares) / 100}`;
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
  const { t } = useTranslation('expense_details');
  const participants = useAddExpenseStore((s) => s.participants);
  const currency = useAddExpenseStore((s) => s.currency);
  const amount = useAddExpenseStore((s) => s.amount);
  const canSplitScreenClosed = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const selectedParticipantsForDistribution = useAddExpenseStore(
    (s) => s.selectedParticipantsForDistribution,
  );
  const {
    setSplitShare,
    distributeExactRemainderEqually,
    toggleParticipantForDistribution,
    setAllParticipantsForDistribution,
  } = useAddExpenseStore((s) => s.actions);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const summaryText = useMemo(
    () => fmtSummartyText(amount, currency, participants, splitShares),
    [amount, currency, participants, fmtSummartyText, splitShares],
  );
  const allSelected = useMemo(
    () => participants.every((p) => 0n !== splitShares[p.id]?.[splitType]),
    [participants, splitShares, splitType],
  );

  const exactRemaining = useMemo(() => {
    if (splitType !== SplitType.EXACT) return 0n;
    const total = participants.reduce(
      (acc, p) => acc + (splitShares[p.id]?.[SplitType.EXACT] ?? 0n),
      0n,
    );
    return amount - total;
  }, [splitType, participants, splitShares, amount]);

  const previewDistribution = useMemo(() => {
    if (splitType !== SplitType.EXACT || exactRemaining <= 0n) {
      return [];
    }

    const participantsToDistribute =
      selectedParticipantsForDistribution.size > 0
        ? participants.filter((p) => selectedParticipantsForDistribution.has(p.id))
        : participants;

    const rawDistributions = calculateExactRemainderDistribution(
      participantsToDistribute,
      splitShares,
      exactRemaining,
    );

    return rawDistributions.map((dist) => ({
      participant: participants.find((p) => p.id === dist.participantId)!,
      currentAmount: dist.currentAmount,
      addedAmount: dist.addedAmount,
      finalAmount: dist.finalAmount,
    }));
  }, [splitType, exactRemaining, participants, splitShares, selectedParticipantsForDistribution]);

  const selectAll = useCallback(() => {
    participants.forEach((p) => {
      setSplitShare(splitType, p.id, allSelected ? 0n : 1n);
    });
  }, [participants, setSplitShare, splitType, allSelected]);

  const onToggleBoolean = useCallback(
    (userId: number) => {
      setSplitShare(splitType, userId, 0n === splitShares[userId]?.[splitType] ? 1n : 0n);
    },
    [setSplitShare, splitType, splitShares],
  );

  const onChangeInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>, userId: number) => {
      const value = e.target.value;
      setSplitShare(
        splitType,
        userId,
        value === undefined || '' === value ? 0n : toSafeBigInt(value),
      );
    },
    [setSplitShare, splitType],
  );

  const handleDistributeClick = () => {
    if (selectedParticipantsForDistribution.size === 0) {
      setAllParticipantsForDistribution(true);
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDistribution = () => {
    distributeExactRemainderEqually(selectedParticipantsForDistribution);
    setShowConfirmModal(false);
  };

  const allParticipantsSelected = useMemo(
    () =>
      participants.length > 0 &&
      participants.every((p) => selectedParticipantsForDistribution.has(p.id)),
    [participants, selectedParticipantsForDistribution],
  );

  const handleToggleAllParticipants = () => {
    setAllParticipantsForDistribution(!allParticipantsSelected);
  };

  return (
    <div className="relative mt-4 flex flex-col gap-6 px-2">
      <div className="mb-2 flex flex-col items-center justify-center gap-3">
        <div className={`${canSplitScreenClosed ? 'text-gray-300' : 'text-red-500'}`}>
          {summaryText}
        </div>
        {splitType === SplitType.EXACT && exactRemaining > 0n ? (
          <button
            className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap"
            onClick={handleDistributeClick}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>
              {t('ui.add_expense_details.split_type_section.types.exact.split_remaining_equally')}
            </span>
          </button>
        ) : null}
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('ui.add_expense_details.split_type_section.types.exact.confirm_distribution')}
            </DialogTitle>
            <DialogDescription>
              {t('ui.add_expense_details.split_type_section.types.exact.remaining')} {currency}{' '}
              {toUIString(exactRemaining, true)}{' '}
              {t('ui.add_expense_details.split_type_section.types.exact.will_be_distributed')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-secondary/30 flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Select All Participants</span>
              <button onClick={handleToggleAllParticipants} className="flex items-center gap-2">
                {allParticipantsSelected ? (
                  <Check className="h-5 w-5 text-cyan-500" />
                ) : (
                  <div className="h-5 w-5 rounded border border-gray-400" />
                )}
              </button>
            </div>

            <div className="max-h-60 space-y-3 overflow-y-auto">
              {participants.map((participant) => {
                const isSelected = selectedParticipantsForDistribution.has(participant.id);
                const distribution = previewDistribution.find(
                  (d) => d.participant.id === participant.id,
                );

                return (
                  <div
                    key={participant.id}
                    className="bg-secondary/50 flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleParticipantForDistribution(participant.id)}
                        className="flex items-center gap-2"
                      >
                        {isSelected ? (
                          <Check className="h-5 w-5 text-cyan-500" />
                        ) : (
                          <div className="h-5 w-5 rounded border border-gray-400" />
                        )}
                      </button>
                      <UserAvatar user={participant} size={32} />
                      <span className="text-sm font-medium">
                        {participant.name ?? participant.email}
                      </span>
                    </div>
                    {distribution && isSelected && (
                      <div className="text-right">
                        <div className="text-muted-foreground text-xs">
                          {currency} {removeTrailingZeros(toUIString(distribution.currentAmount))} +{' '}
                          {removeTrailingZeros(toUIString(distribution.addedAmount))}
                        </div>
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                          = {currency} {removeTrailingZeros(toUIString(distribution.finalAmount))}
                        </div>
                      </div>
                    )}
                    {!isSelected && (
                      <div className="text-muted-foreground text-xs">Not selected</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              {t('ui.add_expense_details.split_type_section.cancel')}
            </Button>
            <Button
              onClick={handleConfirmDistribution}
              disabled={selectedParticipantsForDistribution.size === 0}
            >
              {t('ui.add_expense_details.split_type_section.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isBoolean && (
        <div className="absolute top-0 right-0">
          <button
            className="flex items-center gap-1 rounded-md border px-2 py-0.5 whitespace-nowrap"
            onClick={selectAll}
          >
            {allSelected ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            <span className="text-sm">{t('ui.add_expense_details.split_type_section.all')}</span>
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
              0n !== share ? (
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
          {0n < (shareAmount ?? 0n) ? '-' : ''} {currency} {toUIString(shareAmount)}
        </p>
      </div>
    </div>
  );
};
