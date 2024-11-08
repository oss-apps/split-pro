import React, { useState } from 'react';
import { AppDrawer } from '../ui/drawer';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { api } from '~/utils/api';
import { Textarea } from '../ui/textarea';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { toast } from 'sonner';
import { Button } from '../ui/button';

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
    try {
      await submitFeedbackMutation.mutateAsync({ feedback: values.feedback });
      feedbackForm.reset();
      toast.success('Feedback submitted', { duration: 1500 });
    } catch (e) {
      toast.error('Failed to submit feedback');
    }
    setFeedbackOpen(false);
  }

  return (
    <AppDrawer
      trigger={
        <Button
          variant="ghost"
          className="text-md w-full justify-between px-0 hover:text-foreground/80"
        >
          <div className="flex items-center gap-4 text-[16px]">
            <MessageSquare className="h-5 w-5 text-green-500" />
            Submit feedback
          </div>
          <ChevronRight className="h-6x w-6 text-gray-500" />
        </Button>
      }
      open={feedbackOpen}
      onOpenChange={setFeedbackOpen}
      onClose={() => setFeedbackOpen(false)}
      leftAction="Close"
      title="Submit a feedback"
      className="h-[70vh]"
      shouldCloseOnAction={false}
      actionTitle="Submit"
      actionOnClick={async () => {
        await feedbackForm.handleSubmit(onGroupSubmit)();
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
