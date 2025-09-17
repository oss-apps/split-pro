import { zodResolver } from '@hookform/resolvers/zod';
import Avatar from 'boring-avatars';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type TFunction, useTranslation } from 'next-i18next';
import { z } from 'zod';

import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { api } from '~/utils/api';

import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';

const groupSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({ required_error: t('errors.name_required', { ns: 'common' }) })
      .min(1, { message: t('errors.name_required', { ns: 'common' }) }),
  });

type CreateGroupFormValues = z.infer<ReturnType<typeof groupSchema>>;

export const CreateGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation('groups_details');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const createGroup = api.group.create.useMutation(undefined);
  const utils = api.useUtils();

  const groupForm = useForm<CreateGroupFormValues>({
    resolver: zodResolver(groupSchema(t)),
  });

  const router = useRouter();

  const onGroupSubmit = useCallback(
    async (values: CreateGroupFormValues) => {
      await createGroup.mutateAsync(
        { name: values.name },
        {
          onSuccess: (data) => {
            utils.group.getAllGroupsWithBalances.refetch().catch(console.error);
            router
              .push(`/groups/${data.id}`)
              .then(() => setDrawerOpen(false))
              .catch(console.error);
          },
        },
      );
    },
    [router, createGroup, utils.group.getAllGroupsWithBalances],
  );

  const handleOpenChange = useCallback(
    (openVal: boolean) => {
      if (openVal !== drawerOpen) {
        setDrawerOpen(openVal);
      }
    },
    [drawerOpen],
  );

  const handleLeftActionClick = useCallback(() => setDrawerOpen(false), []);

  const handleActionClick = useCallback(async () => {
    await groupForm.handleSubmit(onGroupSubmit)();
  }, [groupForm, onGroupSubmit]);

  const field = useCallback(
    ({ field }: any) => (
      <FormItem className="w-full">
        <FormControl>
          <Input
            placeholder={t('ui.create_group.group_name_placeholder')}
            className="w-full py-2 text-lg"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    ),
    [t],
  );

  const avatarColors = React.useMemo(
    () => ['#80C7B7', '#D9C27E', '#F4B088', '#FFA5AA', '#9D9DD3'],
    [],
  );

  return (
    <>
      <AppDrawer
        open={drawerOpen}
        onOpenChange={handleOpenChange}
        trigger={children}
        leftAction={t('actions.cancel', { ns: 'common' })}
        leftActionOnClick={handleLeftActionClick}
        title={t('ui.create_group.title')}
        className="h-[70vh]"
        actionTitle={t('actions.submit', { ns: 'common' })}
        actionOnClick={handleActionClick}
      >
        <div className="w-full">
          <Form {...groupForm}>
            <form
              onSubmit={groupForm.handleSubmit(onGroupSubmit)}
              className="mt-4 flex w-full items-start gap-4"
            >
              <Avatar
                size={50}
                name={groupForm.watch('name')}
                variant="bauhaus"
                colors={avatarColors}
              />
              <FormField control={groupForm.control} name="name" render={field} />
            </form>
          </Form>
        </div>
      </AppDrawer>
    </>
  );
};
