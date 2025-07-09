import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { z } from 'zod';
import { AppDrawer } from './drawer';
import { Form, FormControl, FormField, FormItem, FormMessage } from './form';
import { Input } from './input';

export const UpdateName: React.FC<{
  className?: string;
  defaultName: string;
  onNameSubmit: (values: { name: string }) => void;
}> = ({ className, defaultName, onNameSubmit }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { t } = useTranslation('common');

  const detailsSchema = useMemo(
    () =>
      z.object({
        name: z
          .string({ required_error: t('ui.edit_name.errors.name_required') })
          .min(1, { message: t('ui.edit_name.errors.name_required') }),
      }),
    [t],
  );

  const detailForm = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: defaultName,
    },
  });

  return (
    <AppDrawer
      trigger={<Pencil className={className} />}
      open={drawerOpen}
      onOpenChange={(openVal) => {
        if (openVal !== drawerOpen) {
          setDrawerOpen(openVal);
        }
      }}
      leftAction={t('ui.edit_name.close')}
      title={t('ui.edit_name.title')}
      shouldCloseOnAction={false}
      className="h-[80vh]"
      actionTitle={t('ui.edit_name.save')}
      actionOnClick={async () => {
        const isValid = await detailForm.trigger();
        if (isValid) {
          await detailForm.handleSubmit(onNameSubmit)();
          setDrawerOpen(false);
        }
      }}
    >
      <Form {...detailForm}>
        <form className="mt-4 flex w-full items-start gap-4">
          <FormField
            control={detailForm.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <Input
                    className="text-lg"
                    placeholder={t('ui.edit_name.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppDrawer>
  );
};
