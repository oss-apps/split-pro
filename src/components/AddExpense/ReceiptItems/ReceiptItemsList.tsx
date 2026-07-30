import { Camera, Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';

import { parseCurrencyCode } from '~/lib/currency';
import { calculateParticipantSplit, useAddExpenseStore } from '~/store/addStore';
import { useAppStore } from '~/store/appStore';
import type { ReceiptItemInputModel } from '~/types';
import type { CreateExpense } from '~/types/expense.types';
import { api } from '~/utils/api';
import { prepareImageForUpload, uploadImage, validateUploadSize } from '~/utils/imageUpload';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { PayerSelectionForm, SplitExpenseForm } from '../SplitTypeSection';
import { ReceiptItemRow } from './ReceiptItemRow';

export const ReceiptItemsList: React.FC = () => {
  const { t } = useTranslation();
  const { getCurrencyHelpersCached, displayName, generateSplitDescription } =
    useTranslationWithUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const maxUploadFileSizeMB = useAppStore((s) => s.maxUploadFileSizeMB);
  const router = useRouter();

  const receiptItems = useAddExpenseStore((s) => s.receiptItems);
  const isScanning = useAddExpenseStore((s) => s.isReceiptItemsScanning);
  const currency = useAddExpenseStore((s) => s.currency);
  const group = useAddExpenseStore((s) => s.group);
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const isNegative = useAddExpenseStore((s) => s.isNegative);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const participants = useAddExpenseStore((s) => s.participants);
  const isExpenseSettled = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const fileKey = useAddExpenseStore((s) => s.fileKey);

  const {
    setAmount,
    setReceiptItems,
    setIsReceiptItemsScanning,
    setFileUploading,
    setFileKey,
    setCurrency,
    setExpenseDate,
    resetState,
    setSplitScreenOpen,
  } = useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();

  const isProcessing = isUploading || isScanning;

  const handleCapture = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      let file = event.target.files?.[0];
      if (!file) {
        return;
      }

      // Upload
      setIsUploading(true);
      setFileUploading(true);
      let key: string | null = null;
      try {
        try {
          file = await prepareImageForUpload(file, maxUploadFileSizeMB);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error(t('errors.image_compression_failed'));
        }
        if (!validateUploadSize(file, maxUploadFileSizeMB)) {
          toast.error(t('errors.less_than', { size: maxUploadFileSizeMB }));
        } else {
          key = await uploadImage(file);
          setFileKey(key);
        }
      } catch {
        toast.error(t('errors.uploading_error'));
      } finally {
        setIsUploading(false);
        setFileUploading(false);
      }

      if (!key) {
        return;
      }

      // Scan items
      setIsReceiptItemsScanning(true);
      try {
        const response = await fetch('/api/scan-receipt-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey: key }),
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const data = await response.json();

        const currencyCode = parseCurrencyCode(data.currency);
        setCurrency(currencyCode);

        if (data.date) {
          setExpenseDate(new Date(data.date));
        }

        const helpers = getCurrencyHelpersCached(currencyCode);
        const items: ReceiptItemInputModel[] = data.items.map(
          (item: { amount: string; description: string; category: string }) => {
            const bigIntValue = helpers.toSafeBigInt(item.amount);
            return {
              description: item.description,
              amountStr: helpers.toUIString(bigIntValue, false, true),
              amount: bigIntValue,
              category: item.category,
              currency: currencyCode,
              selected: true,
            };
          },
        );

        setReceiptItems(items);
        if (0 === items.length) {
          toast.error(t('expense_details.add_expense_details.receipt_items.messages.scan_error'));
        } else {
          toast.success(
            t('expense_details.add_expense_details.receipt_items.messages.scan_success'),
          );
        }
      } catch {
        toast.error(t('expense_details.add_expense_details.receipt_items.messages.scan_error'));
      } finally {
        setIsReceiptItemsScanning(false);
      }

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [
      t,
      maxUploadFileSizeMB,
      setFileUploading,
      setFileKey,
      setIsReceiptItemsScanning,
      setCurrency,
      setExpenseDate,
      setReceiptItems,
      getCurrencyHelpersCached,
    ],
  );

  const selectedItems = receiptItems.filter((item) => item.selected);
  const allSelected = receiptItems.length > 0 && selectedItems.length === receiptItems.length;

  const toggleSelectAll = useCallback(() => {
    const newSelected = !allSelected;
    setReceiptItems(receiptItems.map((item) => ({ ...item, selected: newSelected })));
  }, [allSelected, receiptItems, setReceiptItems]);

  const selectedTotal = selectedItems.reduce((acc, item) => acc + item.amount, 0n);
  const helpers = getCurrencyHelpersCached(currency);

  useEffect(() => {
    if (receiptItems.length > 0) {
      setAmount(selectedTotal);
    }
  }, [selectedTotal, receiptItems.length, setAmount]);

  const addSelectedExpenses = useCallback(async () => {
    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    const expenses = selectedItems
      .filter((item) => 0n !== item.amount && '' !== item.description)
      .map((item) => {
        const expense: CreateExpense = {
          name: item.description,
          currency: item.currency,
          amount: item.amount,
          groupId: group?.id ?? null,
          splitType,
          paidBy: paidBy.id,
          participants: participants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0n,
          })),
          category: item.category,
          fileKey,
          expenseDate: useAddExpenseStore.getState().expenseDate,
        };

        const { participants: splitParticipants } = calculateParticipantSplit({
          amount: expense.amount,
          expenseDate: expense.expenseDate as Date,
          participants,
          splitType: expense.splitType,
          splitShares,
          paidBy,
          isNegative: false,
        });

        return {
          ...expense,
          participants: splitParticipants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0n,
          })),
        };
      }) as CreateExpense[];

    if (0 === expenses.length) {
      return;
    }

    try {
      await addExpenseMutation.mutateAsync(expenses, {
        onSuccess: () => {
          resetState();
          router.back();
        },
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('errors.saving_expense'));
      }
    }
  }, [
    paidBy,
    isExpenseSettled,
    setSplitScreenOpen,
    selectedItems,
    group,
    splitType,
    participants,
    fileKey,
    splitShares,
    addExpenseMutation,
    resetState,
    router,
    t,
  ]);

  return (
    <div className="flex flex-col gap-3">
      {(0 === receiptItems.length || isProcessing) && (
        <Button
          variant="outline"
          className="mt-10 h-20 w-full gap-2 text-2xl"
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          {isScanning
            ? t('expense_details.add_expense_details.receipt_items.scanning')
            : isUploading
              ? t('expense_details.add_expense_details.receipt_items.uploading')
              : t('expense_details.add_expense_details.receipt_items.scan_receipt')}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCapture}
          />
        </Button>
      )}

      {0 === receiptItems.length && !isProcessing && (
        <p className="text-center text-sm text-gray-400">
          {t('expense_details.add_expense_details.receipt_items.no_items')}
        </p>
      )}

      {receiptItems.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              {allSelected
                ? t('expense_details.add_expense_details.receipt_items.deselect_all')
                : t('expense_details.add_expense_details.receipt_items.select_all')}
            </label>
            <span className="text-sm text-gray-400">
              {t('expense_details.add_expense_details.receipt_items.total')}:{' '}
              {helpers.toUIString(selectedTotal)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-max flex-col">
              {receiptItems.map((item, index) => (
                <ReceiptItemRow key={index} item={item} index={index} />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-sm text-gray-400 sm:flex-row">
            <p>{t(`ui.expense.${isNegative ? 'received_by' : 'paid_by'}`)}</p>
            <PayerSelectionForm>
              <Button variant="ghost" className="text-primary h-8 px-1.5 py-0 text-base">
                {displayName(paidBy, currentUser?.id, 'dativus')}
              </Button>
            </PayerSelectionForm>
            <p>{t('ui.and')} </p>
            <SplitExpenseForm>
              <Button variant="ghost" className="text-primary h-8 px-1.5 py-0 text-base">
                {generateSplitDescription(
                  splitType,
                  participants,
                  splitShares,
                  paidBy,
                  currentUser,
                )}
              </Button>
            </SplitExpenseForm>
          </div>

          {0 === selectedItems.length ? (
            <Button variant="outline" className="w-full" onClick={() => setReceiptItems([])}>
              {t('actions.cancel')}
            </Button>
          ) : (
            <Button
              className="w-full"
              loading={addExpenseMutation.isPending}
              disabled={addExpenseMutation.isPending}
              onClick={addSelectedExpenses}
            >
              {t('expense_details.add_expense_details.receipt_items.add_selected')} (
              {selectedItems.length})
            </Button>
          )}
        </>
      )}
    </div>
  );
};
