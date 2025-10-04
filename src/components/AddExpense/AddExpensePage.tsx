import { HeartHandshakeIcon, Landmark, Trash } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo } from 'react';

import { type CurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { currencyConversion, toSafeBigInt, toUIString } from '~/utils/numbers';

import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CategoryPicker } from './CategoryPicker';
import { CurrencyPicker } from './CurrencyPicker';
import { DateSelector } from './DateSelector';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { SplitTypeSection } from './SplitTypeSection';
import { UploadFile } from './UploadFile';
import { UserInput } from './UserInput';
import { CurrencyConversion } from '../Friend/CurrencyConversion';
import { CURRENCY_CONVERSION_ICON } from '../ui/categoryIcons';
import AddBankTransactions from './AddBankTransactions';
import { cn } from '~/lib/utils';

export const AddOrEditExpensePage: React.FC<{
  isStorageConfigured: boolean;
  enableSendingInvites: boolean;
  expenseId?: string;
  bankConnectionEnabled: boolean;
}> = ({ isStorageConfigured, enableSendingInvites, expenseId, bankConnectionEnabled }) => {
  const { t } = useTranslationWithUtils();
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
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const transactionId = useAddExpenseStore((s) => s.transactionId);

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
    (newCurrency: CurrencyCode) => {
      updateProfile.mutate({ currency: newCurrency });

      previousCurrencyRef.current = currency;
      setCurrency(newCurrency);
    },
    [currency, setCurrency, updateProfile],
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

  const addExpense = useCallback(async () => {
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
      previousCurrencyRef.current = null;
    },
    [onUpdateAmount],
  );

  const clearFields = useCallback(() => {
    setAmount(0n);
    setDescription('');
    setAmountStr('');
    setTransactionId('');
    setExpenseDate(new Date());
  }, [setAmount, setDescription, setAmountStr, setTransactionId, setExpenseDate]);

  const canBeCleared = useMemo(
    () => amount !== 0n || description !== '' || transactionId !== '',
    [amount, description, transactionId],
  );

  const previousCurrencyRef = React.useRef<CurrencyCode | null>(null);

  const onConvertAmount: React.ComponentProps<typeof CurrencyConversion>['onSubmit'] = useCallback(
    ({ amount: absAmount, rate }) => {
      const targetAmount = (absAmount >= 0n ? 1n : -1n) * currencyConversion(absAmount, rate);
      onUpdateAmount(toUIString(targetAmount));
      previousCurrencyRef.current = null;
    },
    [onUpdateAmount],
  );

  const currencyConversionComponent = useMemo(() => {
    if (
      currency === previousCurrencyRef.current ||
      previousCurrencyRef.current === null ||
      !amount ||
      0n === amount
    ) {
      return null;
    }

    return (
      <CurrencyConversion
        onSubmit={onConvertAmount}
        amount={amount}
        currency={previousCurrencyRef.current}
        editingTargetCurrency={currency}
      >
        <Button size="icon" variant="secondary" className="size-8">
          <CURRENCY_CONVERSION_ICON className="size-4" />
        </Button>
      </CurrencyConversion>
    );
  }, [amount, currency, onConvertAmount]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-primary px-0" onClick={router.back}>
          {t('actions.cancel')}
        </Button>
        <div className="text-center">
          {expenseId ? t('actions.edit_expense') : t('actions.add_expense')}
        </div>
        <Button
          variant="ghost"
          className="text-primary px-0"
          disabled={
            addExpenseMutation.isPending || !amount || '' === description || isFileUploading
          }
          onClick={addExpense}
        >
          {t('actions.save')}
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
              placeholder={t('expense_details.add_expense_details.description_placeholder')}
              value={description}
              onChange={handleDescriptionChange}
              className="text-lg placeholder:text-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <CurrencyPicker currentCurrency={currency} onCurrencyPick={onCurrencyPick} />
            <Input
              placeholder={t('expense_details.add_expense_details.amount_placeholder')}
              className="text-lg placeholder:text-sm"
              type="number"
              inputMode="decimal"
              value={amtStr}
              onChange={onAmountChange}
              rightIcon={currencyConversionComponent}
            />
          </div>
          <div className="h-auto">
            {amount && '' !== description ? (
              <>
                <SplitTypeSection />

                <div className="mt-4 flex items-center justify-between sm:mt-10">
                  <DateSelector
                    mode="single"
                    required
                    selected={expenseDate}
                    onSelect={setExpenseDate}
                  />
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
                      {t('actions.submit')}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <div className="flex items-center justify-around gap-4 px-4 lg:px-0">
            <Button
              variant="ghost"
              className={cn('text-primary px-2', canBeCleared && 'text-emerald-500')}
              disabled={!canBeCleared}
              onClick={clearFields}
            >
              <Trash className="h-6 w-6" />
            </Button>
            <SponsorUs />
            <div className="flex gap-2">
              <AddBankTransactions
                // clearFields={clearFields}
                onUpdateAmount={onUpdateAmount}
                bankConnectionEnabled={bankConnectionEnabled}
              >
                <Button
                  variant="ghost"
                  className="hover:text-foreground/80 items-center justify-between px-2"
                >
                  <Landmark className="text-white-500 h-6 w-6" />
                </Button>
              </AddBankTransactions>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SponsorUs = () => {
  const { t } = useTranslation();
  return (
    <div className="flex w-full justify-center">
      <Link href="https://github.com/sponsors/krokosik" target="_blank" className="mx-auto">
        <Button
          variant="outline"
          className="text-md hover:text-foreground/80 justify-between rounded-full border-pink-500"
        >
          <div className="flex items-center gap-4">
            <HeartHandshakeIcon className="h-5 w-5 text-pink-500" />
            {t('expense_details.add_expense_details.sponsor_us')}
          </div>
        </Button>
      </Link>
    </div>
  );
};
