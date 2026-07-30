import { X } from 'lucide-react';
import React, { useCallback } from 'react';

import { type CurrencyCode } from '~/lib/currency';
import type { ReceiptItemInputModel } from '~/types';
import { useAddExpenseStore } from '~/store/addStore';

import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { CurrencyInput } from '../../ui/currency-input';
import { Input } from '../../ui/input';
import { CategoryPicker } from '../CategoryPicker';
import { CurrencyPicker } from '../CurrencyPicker';

export const ReceiptItemRow: React.FC<{
  item: ReceiptItemInputModel;
  index: number;
}> = ({ item, index }) => {
  const { updateReceiptItem, removeReceiptItem, toggleReceiptItemSelected } = useAddExpenseStore(
    (s) => s.actions,
  );

  const onCheckedChange = useCallback(() => {
    toggleReceiptItemSelected(index);
  }, [toggleReceiptItemSelected, index]);

  const onDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateReceiptItem(index, { description: e.target.value });
    },
    [updateReceiptItem, index],
  );

  const onAmountChange = useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      const updates: Partial<ReceiptItemInputModel> = {};
      if (strValue !== undefined) {
        updates.amountStr = strValue;
      }
      if (bigIntValue !== undefined) {
        updates.amount = bigIntValue;
      }
      updateReceiptItem(index, updates);
    },
    [updateReceiptItem, index],
  );

  const onCategoryPick = useCallback(
    (category: string) => {
      updateReceiptItem(index, { category });
    },
    [updateReceiptItem, index],
  );

  const onCurrencyPick = useCallback(
    (currency: CurrencyCode | null) => {
      if (!currency) {
        return;
      }
      updateReceiptItem(index, { currency });
    },
    [updateReceiptItem, index],
  );

  const onRemove = useCallback(() => {
    removeReceiptItem(index);
  }, [removeReceiptItem, index]);

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex shrink-0 items-center gap-2">
        <Checkbox checked={item.selected} onCheckedChange={onCheckedChange} />
        <CategoryPicker category={item.category} onCategoryPick={onCategoryPick} compact />
      </div>
      <Input
        value={item.description}
        onChange={onDescriptionChange}
        className="min-w-0 flex-1 text-sm"
        placeholder="Item"
      />
      <div className="w-20 shrink-0">
        <CurrencyInput
          currency={item.currency}
          strValue={item.amountStr}
          onValueChange={onAmountChange}
          hideSymbol
          className="text-sm"
          placeholder="0.00"
        />
      </div>
      <CurrencyPicker currentCurrency={item.currency} onCurrencyPick={onCurrencyPick} />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 p-0" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
