import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type TFunction, useTranslation } from 'next-i18next';
import { z } from 'zod';
import { AppDrawer } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

const detailsSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({ required_error: t('ui.errors.name_required', { ns: 'common' }) })
      .min(1, { message: t('ui.errors.name_required', { ns: 'common' }) }),
  });

type UpdateDetailsFormValues = z.infer<ReturnType<typeof detailsSchema>>;

export const UpdateName: React.FC<{
  className?: string;
  defaultName: string;
  onNameSubmit: (values: { name: string }) => void;
}> = ({ className, defaultName, onNameSubmit }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { t } = useTranslation('account_page');

  const detailForm = useForm<UpdateDetailsFormValues>({
    resolver: zodResolver(detailsSchema(t)),
    defaultValues: {
      name: defaultName,
    },
  });

  const trigger = useMemo(() => <Pencil className={className} />, [className]);

  const handleOpenChange = useCallback(
    (openVal: boolean) => {
      if (openVal !== drawerOpen) {
        setDrawerOpen(openVal);
      }
    },
    [drawerOpen],
  );

  const handleOnActionClick = useCallback(async () => {
    const isValid = await detailForm.trigger();
    if (isValid) {
      await detailForm.handleSubmit(onNameSubmit)();
      setDrawerOpen(false);
    }
  }, [detailForm, onNameSubmit]);

  const field = useCallback(
    ({ field }: any) => (
      <FormItem className="w-full">
        <FormControl>
          <Input className="text-lg" placeholder={t('ui.edit_name.placeholder')} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    ),
    [t],
  );

  return (
    <AppDrawer
      trigger={trigger}
      open={drawerOpen}
      onOpenChange={handleOpenChange}
      leftAction={t('ui.actions.close', { ns: 'common' })}
      title={t('ui.edit_name.title')}
      shouldCloseOnAction={false}
      className="h-[80vh]"
      actionTitle={t('ui.actions.save', { ns: 'common' })}
      actionOnClick={handleOnActionClick}
    >
      <Form {...detailForm}>
        <form className="mt-4 flex w-full items-start gap-4">
          <FormField control={detailForm.control} name="name" render={field} />
        </form>
      </Form>
    </AppDrawer>
  );
};
