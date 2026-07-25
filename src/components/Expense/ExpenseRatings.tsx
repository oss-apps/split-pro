import { type inferRouterOutputs } from '@trpc/server';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type ExpenseRouter } from '~/server/api/routers/expense';
import { api } from '~/utils/api';

import { EntityAvatar } from '../ui/avatar';
import { StarRating } from '../ui/star-rating';

type ExpenseDetailsOutput = NonNullable<inferRouterOutputs<ExpenseRouter>['getExpenseDetails']>;

/**
 * Ratings live in a per-participant join model, so each person's rating is independent
 * and nobody overwrites anyone else. The current user gets an interactive control (tap a
 * star to set, tap it again to clear); everyone else who has rated shows as their own
 * row. People who haven't rated get no row — there is no zero-star placeholder.
 */
export const ExpenseRatings: React.FC<{ expense: ExpenseDetailsOutput; userId: number }> = ({
  expense,
  userId,
}) => {
  const { t, displayName } = useTranslationWithUtils();
  const apiUtils = api.useUtils();

  const setRating = api.expense.setMyRating.useMutation({
    onSuccess: () => {
      apiUtils.expense.getExpenseDetails.invalidate({ expenseId: expense.id }).catch(console.error);
    },
    onError: () => toast.error(t('expense_details.ratings.save_error')),
  });

  const myRating = expense.expenseRatings.find((r) => r.userId === userId)?.rating ?? null;
  const otherRatings = expense.expenseRatings.filter((r) => r.userId !== userId);

  // Any participant (or the adder) may rate, reusing the app's existing expense-edit rule.
  const canRate =
    expense.addedBy === userId || expense.expenseParticipants.some((p) => p.userId === userId);

  const onChange = useCallback(
    (value: number | null) => {
      setRating.mutate({ expenseId: expense.id, rating: value });
    },
    [expense.id, setRating],
  );

  if (!canRate && otherRatings.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">
        {t('expense_details.ratings.title')}
      </h3>

      {canRate ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm text-gray-400">{t('expense_details.ratings.your_rating')}</span>
          <StarRating value={myRating} onChange={onChange} size={26} />
        </div>
      ) : null}

      {otherRatings.length > 0 ? (
        <div className="flex flex-col gap-2">
          {otherRatings.map((r) => (
            <div key={r.userId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <EntityAvatar entity={r.user} size={22} />
                <span>{displayName(r.user, userId)}</span>
              </div>
              <StarRating value={r.rating} readOnly size={18} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
