import { CalendarIcon, HeartHandshakeIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

import { type CurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { toSafeBigInt } from '~/utils/numbers';

import { toUIDate } from '~/utils/strings';
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

export const AddOrEditExpensePage: React.FC<{
  isStorageConfigured: boolean;
  enableSendingInvites: boolean;
  expenseId?: string;
}> = ({ isStorageConfigured, enableSendingInvites, expenseId }) => {
  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
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

  const {
    setCurrency,
    setCategory,
    setDescription,
    setAmount,
    setAmountStr,
    resetState,
    setSplitScreenOpen,
    setExpenseDate,
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

  const addExpense = useCallback(() => {
    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    addExpenseMutation.mutate(
      {
        name: description,
        currency,
        amount,
        groupId: group?.id ?? null,
        splitType,
        participants: participants.map((p) => ({
          userId: p.id,
          amount: p.amount ?? 0n,
        })),
        paidBy: paidBy.id,
        category,
        fileKey,
        expenseDate,
        expenseId,
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
  }, [
    setSplitScreenOpen,
    description,
    currency,
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
  ]);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(e.target.value.toString() ?? '');
    },
    [setDescription],
  );

  const onCancel = useCallback(() => {
    if (expenseId) {
      router
        .push((group ? '/groups/' + group.id : '') + '/expenses/' + expenseId)
        .catch(console.error);
    } else if (1 === participants.length) {
      router.push('/balances').catch(console.error);
    } else {
      resetState();
    }
  }, [expenseId, group, participants.length, resetState, router]);

  const onAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onUpdateAmount(value);
    },
    [onUpdateAmount],
  );

  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-primary px-0" onClick={onCancel}>
            Cancel
          </Button>
          <div className="text-center">Add new expense</div>
          <Button
            variant="ghost"
            className="text-primary px-0"
            disabled={
              addExpenseMutation.isPending || !amount || '' === description || isFileUploading
            }
            onClick={addExpense}
          >
            Save
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
                placeholder="Enter description"
                value={description}
                onChange={handleDescriptionChange}
                className="text-lg placeholder:text-sm"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <CurrencyPicker currentCurrency={currency} onCurrencyPick={onCurrencyPick} />
              <Input
                placeholder="Enter amount"
                className="text-lg placeholder:text-sm"
                type="number"
                inputMode="decimal"
                value={amtStr}
                min="0"
                onChange={onAmountChange}
              />
            </div>
            <div className="h-[180px]">
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
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={expenseDate}
                            onSelect={setExpenseDate}
                          />
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
                        Submit
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex w-full justify-center">
              <Link
                href="https://github.com/sponsors/KMKoushik"
                target="_blank"
                className="mx-auto"
              >
                <Button
                  variant="outline"
                  className="text-md hover:text-foreground/80 justify-between rounded-full border-pink-500"
                >
                  <div className="flex items-center gap-4">
                    <HeartHandshakeIcon className="h-5 w-5 text-pink-500" />
                    Sponsor us
                  </div>
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
};
