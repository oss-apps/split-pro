import React, { useCallback, useState } from 'react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import type { TransactionAddInputModel } from '~/types';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cn } from '~/lib/utils';
import type { TransactionWithPendingStatus } from './BankingTransactionList';
import { AnimatePresence, motion } from 'motion/react';

const checkboxAnimationInitial = { opacity: 0, x: -8 };
const checkboxAnimationAnimate = { opacity: 1, x: 0 };
const checkboxAnimationExit = { opacity: 0, x: -8 };
const checkboxAnimationTransition = { duration: 0.2, ease: 'easeOut' as const };
const contentLayoutTransition = { duration: 0.2, ease: 'easeOut' as const };

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

  const createCheckboxHandler = useCallback(
    (item: TransactionWithPendingStatus) => () => {
      onTransactionRowClick(item, true);
    },
    [onTransactionRowClick],
  );

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
            onCheckedChange={createCheckboxHandler(item)}
            className="h-6 w-6 md:h-4 md:w-4"
          />
        </div>

        <div className="hidden lg:block">
          <AnimatePresence>
            {shouldShowCheckbox && (
              <motion.div
                key="checkbox"
                initial={checkboxAnimationInitial}
                animate={checkboxAnimationAnimate}
                exit={checkboxAnimationExit}
                transition={checkboxAnimationTransition}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={alreadyAdded}
                  onCheckedChange={createCheckboxHandler(item)}
                  className="h-6 w-6 md:h-4 md:w-4"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        className="flex grow items-center gap-4"
        layout
        transition={contentLayoutTransition}
      >
        <Button className="flex items-center gap-4" variant="ghost" disabled={alreadyAdded}>
          <div className="text-xs text-gray-500">
            {toUIDate(new Date(item.bookingDate), { useToday: true })
              .split(' ')
              .map((d) => (
                <div className="text-center" key={d}>
                  {d}
                </div>
              ))}
          </div>
          <div onClick={hasMultiple ? createCheckboxHandler(item) : createClickHandler}>
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
      </motion.div>

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
