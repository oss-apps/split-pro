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
  useCase?: 'dativus' | 'accusativus',
): string => {
  if (currentUserId === user?.id) {
    return t(`actors.you${useCase ? `_${useCase}` : ''}`);
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

  const debtor = isNegative ? paidBy : splitParticipant;
  const payer = isNegative ? splitParticipant : paidBy;
  const debtorName = displayName(t, debtor, currentUser.id);
  const payerName = displayName(t, payer, currentUser.id);

  if (payer.id === currentUser.id) {
    return t('expense_details.add_expense_details.split_type_section.direction.owes_you', {
      debtor: debtorName,
    });
  }

  if (debtor.id === currentUser.id) {
    return t('expense_details.add_expense_details.split_type_section.direction.you_owe', {
      payer: payerName,
    });
  }

  return t('expense_details.add_expense_details.split_type_section.direction.owes_payer', {
    debtor: debtorName,
    payer: payerName,
  });
}

export function getCurrencyName(t: TFunction, code: CurrencyCode, plural = false): string {
  const translationKey = `currencies:currency_list.${code}.${plural ? 'name_plural' : 'name'}`;
  const translatedName = t(translationKey);

  if (translatedName !== translationKey) {
    return translatedName;
  }

  return code;
}
