import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { type GetServerSideProps, type NextPage } from 'next';
import { getProviders } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';

import { env } from '~/env';
import { useSession } from '~/hooks/useSession';

const otpSchema = z.object({
  otp: z.string({ required_error: 'OTP is required' }).length(5, { message: 'Invalid OTP' }),
});

const Home: NextPage<{ feedbackEmail: string }> = ({ feedbackEmail }) => {
  const {
    query: { callbackUrl },
    push,
  } = useRouter();

  const [email] = useSession('splitpro-email');

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
  });

  const onOTPSubmit = useCallback(async () => {
    if (!email) {
      toast.error('Email is invalid, please try the signin flow again.');
      return;
    }

    await push(
      `/api/auth/callback/email?email=${encodeURIComponent(
        email.toLowerCase(),
      )}&token=${otpForm.getValues().otp}${typeof callbackUrl === 'string' ? `&callbackUrl=${callbackUrl}/balances` : ''}`,
    );
  }, [email, otpForm, push, callbackUrl]);

  return (
    <>
      <Head>
        <title>SplitPro: Split Expenses with your friends for free</title>
        <meta name="description" content="SplitPro: Split Expenses with your friends for free" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-full flex-col justify-center lg:justify-normal">
        <div className="flex flex-col items-center lg:mt-20">
          <div className="mb-10 flex items-center gap-4">
            <p className="text-primary text-3xl">SplitPro</p>
          </div>
          <p className="mt-6 w-[300px] text-center text-sm">
            We have sent an email with the OTP to <b>{email}</b>. Please check your inbox.
          </p>
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="mt-6 space-y-8">
              <FormField control={otpForm.control} name="otp" render={OTPInput} />

              <Button className="mt-6 w-[300px] bg-white hover:bg-gray-100 focus:bg-gray-100">
                Submit
              </Button>
            </form>
          </Form>

          <p className="text-muted-foreground mt-6 w-[300px] text-center text-sm">
            Trouble logging in? contact
            <br />
            {/* oxlint-disable-next-line next/no-html-link-for-pages */}
            <a className="underline" href={'mailto:' + feedbackEmail}>
              {feedbackEmail ?? ''}
            </a>
          </p>
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

export const getServerSideProps: GetServerSideProps = async () => {
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
      feedbackEmail: env.FEEDBACK_EMAIL ?? '',
    },
  };
};
