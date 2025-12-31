import { type VariantProps } from 'class-variance-authority';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Button, type buttonVariants } from './ui/button';

export const SimpleConfirmationDialog: React.FC<
  {
    title: string;
    description: React.ReactNode;
    hasPermission: boolean;
    onConfirm: () => void | Promise<void>;
    loading: boolean;
    children: React.ReactNode;
  } & VariantProps<typeof buttonVariants>
> = ({ title, description, hasPermission, onConfirm, loading, variant, children }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-xs rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
          {hasPermission && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onConfirm();
                setOpen(false);
              }}
            >
              <Button
                type="submit"
                size="sm"
                variant={variant}
                disabled={loading}
                loading={loading}
              >
                {t('actions.confirm')}
              </Button>
            </form>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
