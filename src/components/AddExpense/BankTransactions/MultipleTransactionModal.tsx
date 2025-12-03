import { useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

export const MultipleTransactionModal = ({
  modalOpen,
  setModalOpen,
  onAddAll,
  onAddOneByOne,
}: {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  onAddAll: () => void;
  onAddOneByOne: () => void;
}) => {
  const { t } = useTranslationWithUtils();

  const handleOnAddAll = useCallback(() => {
    setModalOpen(false);
    onAddAll();
  }, [setModalOpen, onAddAll]);

  const handleOnAddOneByOne = useCallback(() => {
    setModalOpen(false);
    onAddOneByOne();
  }, [setModalOpen, onAddOneByOne]);

  return (
    <AlertDialog open={modalOpen}>
      <AlertDialogContent className="rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('expense_details.multiple_transactions.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('expense_details.multiple_transactions.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleOnAddAll}>
            {t('expense_details.multiple_transactions.add_all')}
          </AlertDialogAction>
          <AlertDialogAction onClick={handleOnAddOneByOne}>
            {t('expense_details.multiple_transactions.add_one_by_one')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
