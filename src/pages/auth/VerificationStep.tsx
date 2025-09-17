// oxlint-disable no-html-link-for-pages
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { type TFunction, useTranslation } from 'next-i18next';
import { type FC, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';

const otpSchema = (t: TFunction) =>
  z.object({
    otp: z
      .string({ required_error: t('errors.otp_required') })
      .length(5, { message: t('errors.otp_invalid') }),
  });

type OTPFormValues = z.infer<ReturnType<typeof otpSchema>>;

interface VerificationStepProps {
  feedbackEmail?: string;
  email: string;
  callbackUrl?: string;
}

const VerificationStep: FC<VerificationStepProps> = ({ feedbackEmail, email, callbackUrl }) => {
  const { t } = useTranslation('signin');

  const otpForm = useForm<OTPFormValues>({
    resolver: zodResolver(otpSchema(t)),
  });

  const onOTPSubmit = useCallback(() => {
    if (!email) {
      toast.error(t('errors.email_invalid'));
      return;
    }

    window.location.href = `/api/auth/callback/email?email=${encodeURIComponent(
      email,
    )}&token=${otpForm.getValues().otp}${callbackUrl ? `&callbackUrl=${callbackUrl}` : ''}`;
  }, [email, otpForm, callbackUrl, t]);

  const feedbackEmailLink = useMemo(() => `mailto:${feedbackEmail}`, [feedbackEmail]);

  return (
    <>
      <main className="flex h-full flex-col justify-center lg:justify-normal">
        <div className="flex flex-col items-center lg:mt-20">
          <div className="mb-10 flex items-center gap-4">
            <p className="text-primary text-3xl">SplitPro</p>
          </div>
          <p className="mt-6 w-[300px] text-center text-sm">{t('auth.otp_sent')}</p>
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="mt-6 space-y-8">
              <FormField control={otpForm.control} name="otp" render={OTPInput} />

              <Button className="mt-6 w-[300px] bg-white hover:bg-gray-100 focus:bg-gray-100">
                {t('actions.submit', { ns: 'common' })}
              </Button>
            </form>
          </Form>

          {feedbackEmail && (
            <p className="text-muted-foreground mt-6 w-[300px] text-center text-sm">
              {t('auth.trouble_logging_in')}
              <br />
              {/* oxlint-disable-next-line next/no-html-link-for-pages */}
              <a className="underline" href={feedbackEmailLink}>
                {feedbackEmail ?? ''}
              </a>
            </p>
          )}
        </div>
      </main>
    </>
  );
};

// @ts-expect-error form types are not very handy
const OTPInput = ({ field }) => (
  <FormItem>
    <FormControl>
      <InputOTP
        className="w-[300px]"
        maxLength={5}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        inputMode="text"
        {...field}
      >
        <InputOTPGroup>
          <InputOTPSlot className="w-[60px]" index={0} />
          <InputOTPSlot className="w-[60px]" index={1} />
          <InputOTPSlot className="w-[60px]" index={2} />
          <InputOTPSlot className="w-[60px]" index={3} />
          <InputOTPSlot className="w-[60px]" index={4} />
        </InputOTPGroup>
      </InputOTP>
    </FormControl>

    <FormMessage />
  </FormItem>
);

export default VerificationStep;
