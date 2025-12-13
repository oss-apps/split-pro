import React, { useCallback, useState } from 'react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import type { TransactionAddInputModel } from '~/types';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cn } from '~/lib/utils';
import type { TransactionWithPendingStatus } from './BankingTransactionList';

export const BankTransactionItem: React.FC<{
  index: number;
  alreadyAdded: boolean;
  item: TransactionWithPendingStatus;
  onTransactionRowClick: (item: TransactionWithPendingStatus, multiple: boolean) => void;
  groupName: string;
  multipleTransactions: TransactionAddInputModel[];
}> = ({ index, alreadyAdded, item, onTransactionRowClick, groupName, multipleTransactions }) => {
  const { t, toUIDate } = useTranslationWithUtils();
  const [isHovered, setIsHovered] = useState(false);

  const createCheckboxHandler = useCallback(() => {
    onTransactionRowClick(item, true);
  }, [onTransactionRowClick, item]);

  const createClickHandler = useCallback(
    () => onTransactionRowClick(item, false),
    [onTransactionRowClick, item],
  );

  const isNegative = item?.transactionAmount?.amount
    ? Number(item.transactionAmount.amount) < 0
    : false;

  const hasMultiple = multipleTransactions.length > 0;

  const isChecked = multipleTransactions?.some(
    (cItem) => cItem.transactionId === item.transactionId,
  );

  const shouldShowCheckbox = (hasMultiple || isHovered) && (!alreadyAdded || hasMultiple);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div
      className="group flex items-center justify-between px-2 py-2"
      key={index}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex items-center">
        <div className="lg:hidden">
          <Checkbox
            checked={isChecked}
            disabled={alreadyAdded}
            onCheckedChange={createCheckboxHandler}
            className="h-6 w-6 md:h-4 md:w-4"
          />
        </div>

        <div className="hidden lg:block">
          <div
            className={cn(
              'transition-all duration-200 ease-out',
              shouldShowCheckbox
                ? 'translate-x-0 opacity-100'
                : 'pointer-events-none hidden -translate-x-2',
            )}
          >
            <Checkbox
              checked={isChecked}
              disabled={alreadyAdded}
              onCheckedChange={createCheckboxHandler}
              className="h-6 w-6 md:h-4 md:w-4"
            />
          </div>
        </div>
      </div>

      <Button
        className="flex grow items-center justify-start gap-4"
        variant="ghost"
        disabled={alreadyAdded}
        onClick={hasMultiple ? createCheckboxHandler : createClickHandler}
      >
        <div className="text-xs text-gray-500">
          {toUIDate(new Date(item.bookingDate), { useToday: true })
            .split(' ')
            .map((d) => (
              <div className="text-center" key={d}>
                {d}
              </div>
            ))}
        </div>
        <div>
          <p
            className={cn(
              'line-clamp-2 text-left text-sm whitespace-break-spaces lg:text-base',
              alreadyAdded && 'line-through',
            )}
          >
            {item.description}
          </p>
          <p className="line-clamp-1 flex text-left text-xs whitespace-break-spaces text-gray-500">
            {item.pending && t('expense_details.pending')}{' '}
            {alreadyAdded && `(${t('expense_details.already_added')}${groupName})`}
          </p>
        </div>
      </Button>

      <div className="min-w-10 shrink-0">
        <div
          className={cn(
            'text-right text-emerald-600',
            alreadyAdded && 'text-gray-500',
            isNegative && 'text-red-500',
          )}
        >
          <span className="font-light">{item.transactionAmount.currency}</span>{' '}
          {item.transactionAmount.amount}
        </div>
      </div>
    </div>
  );
};
