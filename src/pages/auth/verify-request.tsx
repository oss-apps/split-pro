// oxlint-disable no-html-link-for-pages
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { type GetServerSideProps, type NextPage } from 'next';
import { getProviders } from 'next-auth/react';
import { type TFunction, useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';
import { env } from '~/env';
import { useSession } from '~/hooks/useSession';
import { customServerSideTranslations } from '~/utils/i18n/server';

const otpSchema = (t: TFunction) =>
  z.object({
    otp: z
      .string({ required_error: t('ui.otp_required') })
      .length(5, { message: t('ui.otp_invalid') }),
  });

type OTPFormValues = z.infer<ReturnType<typeof otpSchema>>;

const Home: NextPage<{ feedbackEmail: string }> = ({ feedbackEmail }) => {
  const { t } = useTranslation('signin');
  const router = useRouter();

  const [email, setEmail] = useSession('splitpro-email');
  const [locale, setLocale] = useSession('splitpro-signin-locale');
  const otpForm = useForm<OTPFormValues>({
    resolver: zodResolver(otpSchema(t)),
  });

  useEffect(() => {
    if (!locale) {
      return;
    }

    router
      .push(router.asPath, router.asPath, {
        locale,
        scroll: false,
      })
      .catch(console.error);

    return () => {
      setLocale('');
    };
  }, [locale, router, setLocale]);

  const onOTPSubmit = useCallback(async () => {
    if (!email) {
      toast.error(t('errors.email_invalid'));
      return;
    }

    const { callbackUrl } = router.query;

    await router
      .push(
        `/api/auth/callback/email?email=${encodeURIComponent(
          email.toLowerCase(),
        )}&token=${otpForm.getValues().otp}${typeof callbackUrl === 'string' ? `&callbackUrl=${callbackUrl}/balances` : ''}`,
      )
      .finally(() => setEmail(''));
  }, [email, otpForm, router, t, setEmail]);

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
                {t('ui.actions.submit', { ns: 'common' })}
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

export default Home;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const providers = await getProviders();

  if (!Object.values(providers ?? {}).find((provider) => 'email' === provider.id)) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(await customServerSideTranslations(context.locale, ['common', 'signin'])),
      feedbackEmail: env.FEEDBACK_EMAIL ?? '',
    },
  };
};
