import React, { useState } from 'react';
import { AppDrawer } from '../ui/drawer';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { api } from '~/utils/api';
import { Textarea } from '../ui/textarea';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';

const feedbackSchema = z.object({
  feedback: z
    .string({ required_error: 'Feedback is required' })
    .min(10, { message: 'Feedback should be at least 10 characters' }),
});

export const SubmitFeedback: React.FC = () => {
  const submitFeedbackMutation = api.user.submitFeedback.useMutation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const feedbackForm = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
  });

  async function onGroupSubmit(values: z.infer<typeof feedbackSchema>) {
    await submitFeedbackMutation.mutateAsync({ feedback: values.feedback });
  }

  return (
    <AppDrawer
      trigger={
        <div className="flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300 hover:text-foreground/80">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            Submit feedback
          </div>
          <ChevronRight className="h-6x w-6 text-gray-500" />
        </div>
      }
      open={feedbackOpen}
      onOpenChange={setFeedbackOpen}
      onClose={() => setFeedbackOpen(false)}
      leftAction="Close"
      title="Submit a feedback"
      className="h-[70vh]"
      actionTitle="Save"
      actionOnClick={async () => {
        await feedbackForm.handleSubmit(onGroupSubmit)();
        setFeedbackOpen(false);
      }}
    >
      <div>
        <Form {...feedbackForm}>
          <form
            onSubmit={feedbackForm.handleSubmit(onGroupSubmit)}
            className="mt-4 flex w-full items-start gap-4"
          >
            <FormField
              control={feedbackForm.control}
              name="feedback"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Textarea
                      className="text-lg placeholder:text-sm"
                      rows={5}
                      placeholder="Enter your feedback"
                      {...field}
                    ></Textarea>
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
