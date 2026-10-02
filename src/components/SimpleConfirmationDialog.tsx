import { type VariantProps } from 'class-variance-authority';
import { type FormEvent, useCallback, useState } from 'react';
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

type SimpleConfirmationDialogProps = {
  title: string;
  onCancel?: () => void;
  description: React.ReactNode;
  hasPermission: boolean;
  onConfirm: () => void | Promise<void>;
  loading: boolean;
  children?: React.ReactNode;
} & VariantProps<typeof buttonVariants>;

type ControlledSimpleConfirmationDialogProps = SimpleConfirmationDialogProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type UncontrolledSimpleConfirmationDialogProps = SimpleConfirmationDialogProps & {
  open?: never;
  onOpenChange?: never;
};

export const SimpleConfirmationDialog: React.FC<
  ControlledSimpleConfirmationDialogProps | UncontrolledSimpleConfirmationDialogProps
> = (props) => {
  const { onCancel, title, description, hasPermission, onConfirm, loading, variant, children } =
    props;
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlledOpen = 'open' in props ? props.open : undefined;
  const controlledOnOpenChange = 'onOpenChange' in props ? props.onOpenChange : undefined;
  const isControlled = 'boolean' === typeof controlledOpen;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        if ('function' !== typeof controlledOnOpenChange) {
          return;
        }

        controlledOnOpenChange(nextOpen);
        return;
      }

      setInternalOpen(nextOpen);
    },
    [controlledOnOpenChange, isControlled],
  );
  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onConfirm();
      setOpen(false);
    },
    [onConfirm, setOpen],
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-xs rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('actions.cancel')}</AlertDialogCancel>
          {hasPermission && (
            <form onSubmit={handleSubmit}>
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
