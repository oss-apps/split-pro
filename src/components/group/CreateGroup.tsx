import Avatar from 'boring-avatars';
import React, { useState } from 'react';
import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Button } from '../ui/button';
import {useTranslation} from "react-i18next";

export const CreateGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useTranslation('groups_page');

  const createGroup = api.group.create.useMutation(undefined);
  const utils = api.useUtils();

  const groupSchema = z.object({
      name: z.string({ required_error: t('errors/required') }).min(1, { message: t('errors/required') }),
  });

  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
  });

  const router = useRouter();

  async function onGroupSubmit(values: z.infer<typeof groupSchema>) {
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
  }

  return (
    <>
      <AppDrawer
        open={drawerOpen}
        onOpenChange={(openVal) => {
          if (openVal !== drawerOpen) setDrawerOpen(openVal);
        }}
        trigger={children}
        leftAction={t('ui/group_create/cancel')}
        leftActionOnClick={() => setDrawerOpen(false)}
        title={t('ui/group_create/title')}
        className="h-[70vh]"
        actionTitle={t('ui/group_create/submit')}
        actionOnClick={async () => {
          await groupForm.handleSubmit(onGroupSubmit)();
        }}
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
                colors={['#80C7B7', '#D9C27E', '#F4B088', '#FFA5AA', '#9D9DD3']}
              />
              <FormField
                control={groupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input placeholder={t('ui/group_create/placeholder')} className="w-full py-2 text-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
      </AppDrawer>
    </>
  );
};
