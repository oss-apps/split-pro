import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppDrawer } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

const detailsSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, { message: 'Name is required' }),
});

export const UpdateName: React.FC<{
  className?: string;
  defaultName: string;
  onNameSubmit: (values: z.infer<typeof detailsSchema>) => void;
}> = ({ className, defaultName, onNameSubmit }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      leftAction="Close"
      title="Edit name"
      shouldCloseOnAction={false}
      className="h-[80vh]"
      actionTitle="Save"
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
                  <Input className="text-lg" placeholder="Enter name" {...field} />
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
