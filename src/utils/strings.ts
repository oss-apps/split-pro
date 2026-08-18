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

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };

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

  return new Intl.DateTimeFormat(todayTranslation.usedLng, SHORT_DATE_OPTIONS).format(date);
};

/**
 * The month and the day of `toUIDate`'s short form as separate values, ordered the way the
 * locale orders them, for renderings that put them on their own lines.
 */
export const toUIDateParts = (t: TFunction, date: Date, { useToday = false } = {}): string[] => {
  const todayTranslation = t('ui.today', { returnDetails: true });

  if (useToday && isToday(date)) {
    return [todayTranslation.res];
  }

  const locale = todayTranslation.usedLng;
  const fields = {
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
    day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date),
  };

  // The combined format only says which field comes first, each field is formatted alone
  return new Intl.DateTimeFormat(locale, SHORT_DATE_OPTIONS)
    .formatToParts(date)
    .flatMap((part) => ('month' === part.type || 'day' === part.type ? [fields[part.type]] : []));
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
