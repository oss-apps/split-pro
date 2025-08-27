import { CalendarIcon, HeartHandshakeIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { calculateParticipantSplit, useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { toSafeBigInt } from '~/utils/numbers';

import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CategoryPicker } from './CategoryPicker';
import { CurrencyPicker } from './CurrencyPicker';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { SplitTypeSection } from './SplitTypeSection';
import { UploadFile } from './UploadFile';
import { UserInput } from './UserInput';
import { toast } from 'sonner';
import { BankingTransactions } from './BankingTransactions';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import type { TransactionAddInputModel } from '~/types';
import { useTranslation } from 'next-i18next';

export const AddOrEditExpensePage: React.FC<{
  isStorageConfigured: boolean;
  enableSendingInvites: boolean;
  expenseId?: string;
}> = ({ isStorageConfigured, enableSendingInvites, expenseId }) => {
  const { t, toUIDate } = useTranslationWithUtils(['expense_details']);
  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
  const isNegative = useAddExpenseStore((s) => s.isNegative);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const currency = useAddExpenseStore((s) => s.currency);
  const category = useAddExpenseStore((s) => s.category);
  const description = useAddExpenseStore((s) => s.description);
  const isFileUploading = useAddExpenseStore((s) => s.isFileUploading);
  const amtStr = useAddExpenseStore((s) => s.amountStr);
  const expenseDate = useAddExpenseStore((s) => s.expenseDate);
  const isExpenseSettled = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const transactionId = useAddExpenseStore((s) => s.transactionId);
  const multipleTransactions = useAddExpenseStore((s) => s.multipleTransactions);
  const isTransactionLoading = useAddExpenseStore((s) => s.isTransactionLoading);

  const {
    setCurrency,
    setCategory,
    setDescription,
    setAmount,
    setAmountStr,
    resetState,
    setSplitScreenOpen,
    setExpenseDate,
    setTransactionId,
    setMultipleTransactions,
    setIsTransactionLoading,
  } = useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const updateProfile = api.user.updateUserDetail.useMutation();

  const onCurrencyPick = useCallback(
    (currency: CurrencyCode) => {
      updateProfile.mutate({ currency });

      setCurrency(currency);
    },
    [setCurrency, updateProfile],
  );

  const router = useRouter();

  const onUpdateAmount = useCallback(
    (amt: string) => {
      const _amt = amt.replace(',', '.');
      setAmountStr(_amt);
      setAmount(toSafeBigInt(_amt));
    },
    [setAmount, setAmountStr],
  );

  const addMultipleExpenses = useCallback(async () => {
    setIsTransactionLoading(true);

    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    const seen = new Set();
    const deduplicated = multipleTransactions.filter((item) => {
      if (seen.has(item.transactionId)) {
        return false;
      }
      seen.add(item.transactionId);
      return true;
    });

    const expensePromises = deduplicated.map(async (tempItem) => {
      if (tempItem) {
        const normalizedAmount = tempItem.amount.replace(',', '.');
        const _amtBigInt = BigInt(Math.round(Number(normalizedAmount) * 100));

        const { participants: tempParticipants } = calculateParticipantSplit(
          _amtBigInt,
          participants,
          splitType,
          splitShares,
          paidBy,
        );

        return addExpenseMutation.mutateAsync({
          name: tempItem.description,
          currency: tempItem.currency,
          amount: _amtBigInt,
          groupId: group?.id ?? null,
          splitType,
          participants: tempParticipants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0n,
          })),
          paidBy: paidBy.id,
          category,
          fileKey,
          expenseDate: tempItem.date,
          expenseId: tempItem.expenseId,
          transactionId: tempItem.transactionId,
        });
      }
      return Promise.resolve();
    });

    await Promise.all(expensePromises);

    setMultipleTransactions([]);
    setIsTransactionLoading(false);
    router
      .push(group?.id ? `/groups/${group?.id}` : '/balances')
      .then(() => resetState())
      .catch(console.error);
  }, [
    setSplitScreenOpen,
    router,
    resetState,
    addExpenseMutation,
    group,
    paidBy,
    splitType,
    fileKey,
    isExpenseSettled,
    multipleTransactions,
    participants,
    category,
    setIsTransactionLoading,
    splitShares,
    setMultipleTransactions,
  ]);

  const addExpense = useCallback(async () => {
    const { group, paidBy } = useAddExpenseStore.getState();
    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    setMultipleTransactions([]);
    setIsTransactionLoading(false);

    const sign = isNegative ? -1n : 1n;

    try {
      await addExpenseMutation.mutateAsync(
        {
          name: description,
          currency,
          amount: amount * sign,
          groupId: group?.id ?? null,
          splitType,
          participants: participants.map((p) => ({
            userId: p.id,
            amount: (p.amount ?? 0n) * sign,
          })),
          paidBy: paidBy.id,
          category,
          fileKey,
          expenseDate,
          expenseId,
          transactionId,
        },
        {
          onSuccess: (d) => {
            if (d) {
              const id = d?.id ?? expenseId;
              router
                .push(group?.id ? `/groups/${group.id}/expenses/${id}` : `/expenses/${id}`)
                .then(() => resetState())
                .catch(console.error);
            }
          },
        },
      );
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred while submitting the expense.');
      }
    }
  }, [
    setSplitScreenOpen,
    description,
    currency,
    isNegative,
    amount,
    participants,
    category,
    expenseDate,
    expenseId,
    router,
    resetState,
    addExpenseMutation,
    group,
    paidBy,
    splitType,
    fileKey,
    isExpenseSettled,
    setMultipleTransactions,
    transactionId,
    setIsTransactionLoading,
  ]);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(e.target.value.toString() ?? '');
    },
    [setDescription],
  );

  const onAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      onUpdateAmount(value);
    },
    [onUpdateAmount],
  );

  const addViaBankTransaction = useCallback(
    (obj: TransactionAddInputModel) => {
      setExpenseDate(obj.date);
      setDescription(obj.description);
      if (isCurrencyCode(obj.currency)) {
        setCurrency(obj.currency);
      } else {
        console.warn(`Invalid currency code: ${obj.currency}`);
      }
      onUpdateAmount(obj.amount);
      setTransactionId(obj.transactionId ?? '');
    },
    [setExpenseDate, setDescription, setCurrency, onUpdateAmount, setTransactionId],
  );

  const clearFields = useCallback(() => {
    setAmount(0n);
    setDescription('');
    setAmountStr('');
    setTransactionId('');
    setExpenseDate(new Date());
  }, [setAmount, setDescription, setAmountStr, setTransactionId, setExpenseDate]);

  const handleSetMultipleTransactions = useCallback(
    (a: TransactionAddInputModel[]) => {
      clearFields();
      setMultipleTransactions(a);
    },
    [clearFields, setMultipleTransactions],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-primary px-0" onClick={router.back}>
          {t('ui.actions.cancel', { ns: 'common' })}
        </Button>
        <div className="text-center">
          {expenseId
            ? t('ui.actions.edit_expense', { ns: 'common' })
            : t('ui.actions.add_expense', { ns: 'common' })}
        </div>
        <Button
          variant="ghost"
          className="text-primary px-0"
          disabled={
            addExpenseMutation.isPending || !amount || '' === description || isFileUploading
          }
          onClick={addExpense}
        >
          {t('ui.actions.save', { ns: 'common' })}
        </Button>{' '}
      </div>
      <UserInput isEditing={!!expenseId} />
      {showFriends || (1 === participants.length && !group) ? (
        <SelectUserOrGroup enableSendingInvites={enableSendingInvites} />
      ) : (
        <>
          <div className="mt-4 flex gap-2 sm:mt-10">
            <CategoryPicker category={category} onCategoryPick={setCategory} />
            <Input
              placeholder={t('ui.add_expense_details.description_placeholder')}
              value={description}
              onChange={handleDescriptionChange}
              className="text-lg placeholder:text-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <CurrencyPicker currentCurrency={currency} onCurrencyPick={onCurrencyPick} />
            <Input
              placeholder={t('ui.add_expense_details.amount_placeholder')}
              className="text-lg placeholder:text-sm"
              type="number"
              inputMode="decimal"
              value={amtStr}
              onChange={onAmountChange}
            />
          </div>
          <div className="h-auto">
            {amount && '' !== description ? (
              <>
                <SplitTypeSection />

                <div className="mt-4 flex items-center justify-between sm:mt-10">
                  <div className="flex flex-wrap items-center gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            'justify-start px-0 text-left font-normal',
                            !expenseDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="text-primary mr-2 h-6 w-6" />
                          {expenseDate ? (
                            toUIDate(expenseDate, { useToday: true })
                          ) : (
                            <span>{t('ui.add_expense_details.pick_a_date')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={expenseDate} onSelect={setExpenseDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-4">
                    {isStorageConfigured ? <UploadFile /> : null}
                    <Button
                      className="min-w-[100px]"
                      size="sm"
                      loading={addExpenseMutation.isPending || isFileUploading}
                      disabled={
                        addExpenseMutation.isPending ||
                        !amount ||
                        '' === description ||
                        isFileUploading ||
                        !isExpenseSettled
                      }
                      onClick={addExpense}
                    >
                      {t('ui.actions.submit', { ns: 'common' })}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
            <div className="flex items-center justify-end gap-4">
              <Button variant="ghost" className="text-primary px-0" onClick={clearFields}>
                {t('ui.clear')}
              </Button>
            </div>
          </div>
          <BankingTransactions
            add={addViaBankTransaction}
            addMultipleExpenses={addMultipleExpenses}
            multipleTransactions={multipleTransactions}
            setMultipleTransactions={handleSetMultipleTransactions}
            isTransactionLoading={isTransactionLoading}
          />
          <SponsorUs />
        </>
      )}
    </div>
  );
};

const SponsorUs = () => {
  const { t } = useTranslation(['expense_details']);
  return (
    <div className="flex w-full justify-center">
      <Link href="https://github.com/sponsors/krokosik" target="_blank" className="mx-auto">
        <Button
          variant="outline"
          className="text-md hover:text-foreground/80 justify-between rounded-full border-pink-500"
        >
          <div className="flex items-center gap-4">
            <HeartHandshakeIcon className="h-5 w-5 text-pink-500" />
            {t('ui.add_expense_details.sponsor_us')}
          </div>
        </Button>
      </Link>
    </div>
  );
};
