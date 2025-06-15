import { zodResolver } from '@hookform/resolvers/zod';
import Avatar from 'boring-avatars';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { api } from '~/utils/api';

import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';

const groupSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, { message: 'Name is required' }),
});

export const CreateGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const createGroup = api.group.create.useMutation(undefined);
  const utils = api.useUtils();

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
          if (openVal !== drawerOpen) {setDrawerOpen(openVal);}
        }}
        trigger={children}
        leftAction="Cancel"
        leftActionOnClick={() => setDrawerOpen(false)}
        title="Create a group"
        className="h-[70vh]"
        actionTitle="Submit"
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
                      <Input placeholder="Group name" className="w-full py-2 text-lg" {...field} />
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
