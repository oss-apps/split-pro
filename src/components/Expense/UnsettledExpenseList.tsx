import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { CategoryIcon } from '~/components/ui/categoryIcons';
import { api } from '~/utils/api';

type UnsettledExpense = NonNullable<
  ReturnType<typeof api.expense.getUnsettledExpenses.useQuery>['data']
>[number];

const UnsettledExpenseRow: React.FC<{
  expense: UnsettledExpense;
  currentUserId: number;
  onSettled: () => void;
}> = ({ expense, currentUserId, onSettled }) => {
  const { t, getCurrencyHelpersCached, toUIDate } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(expense.currency);
  const settleMutation = api.expense.settleExpenseForUser.useMutation();

  const isPayer = expense.paidBy === currentUserId;

  const unsettledDebtors = expense.expenseParticipants.filter(
    (p) => p.userId !== expense.paidBy && 0n > p.amount && null === p.settledAt,
  );

  const handleSelfSettle = () => {
    settleMutation.mutate(
      { expenseId: expense.id, userId: currentUserId },
      {
        onSuccess: onSettled,
        onError: () => toast.error(t('errors.setting_update_failed')),
      },
    );
  };

  const handleMarkSettled = (userId: number) => {
    settleMutation.mutate(
      { expenseId: expense.id, userId },
      {
        onSuccess: onSettled,
        onError: () => toast.error(t('errors.setting_update_failed')),
      },
    );
  };

  const myParticipant = !isPayer
    ? expense.expenseParticipants.find((p) => p.userId === currentUserId)
    : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/expenses/${expense.id}`} className="flex items-center gap-2 min-w-0">
          <CategoryIcon category={expense.category} className="size-5 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="truncate font-medium">{expense.name}</p>
            <p className="text-sm text-gray-500">{toUIDate(expense.expenseDate)}</p>
          </div>
        </Link>
        <div className="text-right shrink-0">
          <p className="font-semibold">{toUIString(expense.amount)}</p>
          <p className="text-sm text-gray-500">
            {isPayer ? t('ui.expense.you.paid') : expense.paidByUser.name ?? expense.paidByUser.email}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 ml-7">
        {isPayer
          ? unsettledDebtors.map((p) => (
              <div key={p.userId} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <EntityAvatar entity={p.user} size={20} />
                  <span className="text-gray-400">
                    {p.user.name ?? p.user.email} — {toUIString(-p.amount)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={settleMutation.isPending}
                  onClick={() => handleMarkSettled(p.userId)}
                >
                  <CheckCircle2 className="mr-1 size-3" />
                  {t('actions.mark_settled')}
                </Button>
              </div>
            ))
          : myParticipant && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-orange-500">
                  {t('actors.you')} {t('ui.expense.you.owe')} {toUIString(-myParticipant.amount)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={settleMutation.isPending}
                  onClick={handleSelfSettle}
                >
                  <CheckCircle2 className="mr-1 size-3" />
                  {t('actions.settle_for_me')}
                </Button>
              </div>
            )}
      </div>
    </div>
  );
};

export const UnsettledExpenseList: React.FC<{
  currentUserId: number;
  groupId?: number;
}> = ({ currentUserId, groupId }) => {
  const { t } = useTranslationWithUtils();
  const apiUtils = api.useUtils();

  const query = api.expense.getUnsettledExpenses.useQuery(
    groupId !== undefined ? { groupId } : undefined,
  );

  const onSettled = () => {
    void query.refetch();
    void apiUtils.expense.getUnsettledExpenses.invalidate();
  };

  if (query.isPending) return null;

  if (!query.data?.length) {
    return (
      <div className="mt-8 text-center text-gray-400">{t('ui.no_unsettled_expenses')}</div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {query.data.map((expense) => (
        <UnsettledExpenseRow
          key={expense.id}
          expense={expense}
          currentUserId={currentUserId}
          onSettled={onSettled}
        />
      ))}
    </div>
  );
};
