import { SplitType } from '@prisma/client';
import { type TFunction } from 'next-i18next';

import { type AddExpenseState, type Participant } from '~/store/addStore';

export function generateSplitDescription(
  splitType: SplitType,
  participants: Participant[],
  splitShares: AddExpenseState['splitShares'],
  paidBy: Participant | undefined,
  currentUser: Participant | undefined,
  t: TFunction,
): string {
  // Only enhance the description for EQUAL split type
  if (splitType !== SplitType.EQUAL) {
    return t('ui.add_expense_details.split_type_section.split_unequally');
  }

  if (!paidBy || !currentUser) {
    return t('ui.add_expense_details.split_type_section.split_equally');
  }

  // Get participants who are actually selected for the split (have non-zero shares)
  // If split shares are not initialized yet (undefined), include all participants
  const selectedParticipants = participants.filter(
    (p) => {
      const share = splitShares[p.id]?.[SplitType.EQUAL];
      return share === undefined || share !== 0n;
    }
  );

  // If no one is selected, fall back to default
  if (selectedParticipants.length === 0) {
    return t('ui.add_expense_details.split_type_section.split_equally');
  }
  
  // Case 1: Paying for exactly one person
  if (selectedParticipants.length === 1) {
    const beneficiary = selectedParticipants[0];
    const beneficiaryName = beneficiary?.name?.split(' ')[0] || beneficiary?.email || 'someone';
    return `${t('common:ui.expense.user.paid')} ${t('common:ui.expense.for')} ${beneficiaryName}`;
  }
  
  // Case 2: Splitting with multiple people
  if (selectedParticipants.length > 1) {
    return t('ui.add_expense_details.split_type_section.split_equally_count', { 
      count: selectedParticipants.length 
    });
  }

  // Fallback to default for all other cases
  return t('ui.add_expense_details.split_type_section.split_equally');
}