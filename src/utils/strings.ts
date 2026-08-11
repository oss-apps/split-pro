import { SplitType, type User } from '@prisma/client';
import { isToday } from 'date-fns';
import { type TFunction } from 'next-i18next';
import { type CurrencyCode } from '~/lib/currency';
import { type AddExpenseState, type Participant } from '~/store/addStore';

export type ParametersExceptTranslation<F> = F extends (t: TFunction, ...rest: infer R) => any
  ? R
  : never;

export const displayName = (
  t: TFunction,
  user?: Partial<User> | null,
  currentUserId?: number,
): string => {
  if (currentUserId === user?.id) {
    return t('actors.you');
  }
  return user?.name ?? user?.email ?? '';
};

export const toUIDate = (
  t: TFunction,
  date: Date,
  { useToday = false, year = false } = {},
): string => {
  const todayTranslation = t('ui.today', { returnDetails: true });

  if (useToday && isToday(date)) {
    return todayTranslation.res;
  }

  if (year) {
    return Intl.DateTimeFormat(todayTranslation.usedLng, {
      dateStyle: 'long',
    }).format(date);
  }

  const day = new Intl.DateTimeFormat(todayTranslation.usedLng, { day: '2-digit' }).format(date);
  const monthName = new Intl.DateTimeFormat(todayTranslation.usedLng, { month: 'short' })
    .format(date)
    .replace('.', '');

  return `${monthName} ${day}`;
};

export function generateSplitDescription(
  t: TFunction,
  splitType: SplitType,
  participants: Participant[],
  splitShares: AddExpenseState['splitShares'],
  paidBy?: Participant,
  currentUser?: Participant,
  isNegative = false,
): string {
  if (SplitType.EQUAL !== splitType) {
    return t('expense_details.add_expense_details.split_type_section.split_unequally');
  }

  const splitEquallyText = t(
    'expense_details.add_expense_details.split_type_section.split_equally',
  );
  if (!paidBy || !currentUser) {
    return splitEquallyText;
  }

  const selectedParticipants = participants.filter((p) => {
    const share = splitShares[p.id]?.[SplitType.EQUAL];
    return share === undefined || 0n !== share;
  });

  const splitParticipant = selectedParticipants[0];
  if (!splitParticipant) {
    return splitEquallyText;
  }

  if (1 !== selectedParticipants.length) {
    return `${splitEquallyText} (${selectedParticipants.length})`;
  }

  if (splitParticipant.id === paidBy.id) {
    return t('expense_details.add_expense_details.split_type_section.direction.no_money_flow');
  }

  // Case 1: Paying for exactly one person
  if (selectedParticipants.length === 1) {
    const beneficiary = selectedParticipants[0];
    return t('ui.expense.statements.paid_for_beneficiary', {
      beneficiaryRole: beneficiary?.id === currentUser.id ? 'you' : 'other',
      beneficiary: displayName(t, beneficiary as User),
    });
  }

  // Case 2: Splitting with multiple people
  if (selectedParticipants.length > 1) {
    return t('expense_details.add_expense_details.split_type_section.split_equally_with_count', {
      count: selectedParticipants.length,
    });
  }

  // Fallback to default for all other cases
  return t('expense_details.add_expense_details.split_type_section.split_equally');
}

export function getCurrencyName(t: TFunction, code: CurrencyCode, plural = false): string {
  const translationKey = `currencies:currency_list.${code}.${plural ? 'name_plural' : 'name'}`;
  const translatedName = t(translationKey);

  if (translatedName !== translationKey) {
    return translatedName;
  }

  return code;
}
