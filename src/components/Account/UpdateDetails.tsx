import React, { useState } from 'react';
import { AppDrawer } from '../ui/drawer';
import { ChevronRight, MessageSquare, Pencil } from 'lucide-react';
import { api } from '~/utils/api';
import { Textarea } from '../ui/textarea';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const UpdateDetails: React.FC<{ defaultName: string }> = ({ defaultName }) => {
  const updateDetailsMutation = api.user.updateUserDetail.useMutation();
  const [updateDetailsOpen, setUpdateDetailsOpen] = useState(false);
  const { t } = useTranslation('account_details');

  const detailsSchema = z.object({
    name: z.string({ required_error: t('errors/name_required') }).min(1, { message: t('errors/name_required') }),
  });

  const detailForm = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: defaultName,
    },
  });

  const utils = api.useUtils();

  async function onGroupSubmit(values: z.infer<typeof detailsSchema>) {
    try {
      await updateDetailsMutation.mutateAsync({ name: values.name });
      toast.success(t('messages/update_success'), { duration: 1500 });
      utils.user.me.refetch().catch(console.error);
    } catch (error) {
      toast.error(t('messages/update_error'));

      console.error(error);
    }
    setUpdateDetailsOpen(false);
  }

  return (
    <AppDrawer
      trigger={<Pencil className="h-5 w-5" />}
      onTriggerClick={() => setUpdateDetailsOpen(true)}
      open={updateDetailsOpen}
      onClose={() => setUpdateDetailsOpen(false)}
      onOpenChange={(open) => setUpdateDetailsOpen(open)}
      leftAction={t('ui/close')}
      title={t('ui/title')}
      className="h-[80vh]"
      actionTitle={t('ui/save')}
      actionOnClick={async () => {
        await detailForm.handleSubmit(onGroupSubmit)();
      }}
    >
      <div>
        <Form {...detailForm}>
          <form
            onSubmit={detailForm.handleSubmit(onGroupSubmit)}
            className="mt-4 flex w-full items-start gap-4"
          >
            <FormField
              control={detailForm.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input className="text-lg" placeholder={t('ui/placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </AppDrawer>
  );
};
