'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import { type ClientSafeProvider, getProviders, signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '~/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';
import { env } from '~/env';
import { getServerAuthSession } from '~/server/auth';

const emailSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email' }),
});

const otpSchema = z.object({
  otp: z.string({ required_error: 'OTP is required' }).length(5, { message: 'Invalid OTP' }),
});

const providerSvgs = {
  github: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 496 512"
      className="h-4 w-4  fill-primary-foreground "
    >
      <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
    </svg>
  ),
  google: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 488 512"
      className="h-4 w-4  fill-primary-foreground"
    >
      <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  ),
  authentik: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 25"
      className="h-4 w-4  fill-primary-foreground"
    >
      <path d="M13.96 9.01h-0.84V7.492h-1.234v3.663H5.722c0.34 0.517 0.538 0.982 0.538 1.152 0 0.46 -1.445 3.059 -3.197 3.059C0.8 15.427 -0.745 12.8 0.372 10.855a3.062 3.062 0 0 1 2.691 -1.606c1.04 0 1.971 0.915 2.557 1.755V6.577a3.773 3.773 0 0 1 3.77 -3.769h10.84C22.31 2.808 24 4.5 24 6.577v10.845a3.773 3.773 0 0 1 -3.77 3.769h-1.6V17.5h-7.64v3.692h-1.6a3.773 3.773 0 0 1 -3.77 -3.769v-3.41h12.114v-6.52h-1.59v0.893h-0.84v-0.893H13.96v1.516Zm-9.956 1.845c-0.662 -0.703 -1.578 -0.544 -2.209 0 -2.105 2.054 1.338 5.553 3.302 1.447a5.395 5.395 0 0 0 -1.093 -1.447Z" />
    </svg>
  ),
};

const Home: NextPage<{ feedbackEmail: string; providers: ClientSafeProvider[] }> = ({
  providers,
  feedbackEmail,
}) => {
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
  });

  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    setEmailStatus('sending');
    await signIn('email', { email: values.email.toLowerCase(), redirect: false });
    setEmailStatus('success');
  }

  async function onOTPSubmit(values: z.infer<typeof otpSchema>) {
    const email = emailForm.getValues().email;
    console.log('email', email);

    const callbackUrl = window.location.origin;

    window.location.href = `/api/auth/callback/email?email=${encodeURIComponent(
      email.toLowerCase(),
    )}&token=${values.otp.toLowerCase()}${callbackUrl ? `&callbackUrl=${callbackUrl}/balances` : ''}`;
  }

  return (
    <>
      <Head>
        <title>SplitPro: Split Expenses with your friends for free</title>
        <meta name="description" content="SplitPro: Split Expenses with your friends for free" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-full flex-col justify-center lg:justify-normal">
        <div className="flex  flex-col items-center lg:mt-20 ">
          <div className="mb-10 flex items-center gap-4">
            <p className="text-3xl text-primary">SplitPro</p>
          </div>
          {providers
            .filter((provider) => provider.id !== 'email')
            .map((provider) => (
              <Button
                className="mx-auto flex w-[300px] items-center gap-3 bg-white hover:bg-gray-100 focus:bg-gray-100"
                onClick={() => signIn(provider.id)}
                key={provider.id}
              >
                {providerSvgs[provider.id as keyof typeof providerSvgs]}
                Continue with {provider.name}
              </Button>
            ))}
          {providers && providers.length === 2 && (
            <div className="mt-6 flex w-[300px]  items-center justify-between gap-2">
              <p className=" z-10 ml-[150px] -translate-x-1/2 bg-background px-4 text-sm">or</p>
              <div className="absolute h-[1px] w-[300px]  bg-gradient-to-r from-zinc-800 via-zinc-300 to-zinc-800"></div>
            </div>
          )}
          {providers.find((provider) => provider.id === 'email') ? (
            emailStatus === 'success' ? (
              <>
                <p className="mt-6 w-[300px] text-center text-sm">
                  We have sent an email with the OTP. Please check your inbox
                </p>
                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="mt-6 space-y-8">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
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
                      )}
                    />

                    <Button className="mt-6 w-[300px] bg-white hover:bg-gray-100 focus:bg-gray-100">
                      Submit
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="mt-6 space-y-8">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Enter your email"
                              className=" w-[300px] text-lg"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      className="mt-6 w-[300px] bg-white hover:bg-gray-100 focus:bg-gray-100"
                      type="submit"
                      disabled={emailStatus === 'sending'}
                    >
                      {emailStatus === 'sending' ? 'Sending...' : 'Send magic link'}
                    </Button>
                  </form>
                </Form>
              </>
            )
          ) : null}
          <p className="mt-6 w-[300px] text-center text-sm text-muted-foreground">
            Trouble logging in? contact
            <br />
            <a className="underline" href={'mailto:' + feedbackEmail}>
              {feedbackEmail ?? ''}
            </a>
          </p>
        </div>
      </main>
    </>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);
  const providers = await getProviders();

  if (session) {
    return {
      redirect: {
        destination: '/balances',
        permanent: false,
      },
    };
  }

  return {
    props: {
      feedbackEmail: env.FEEDBACK_EMAIL ?? '',
      providers: Object.values(providers ?? {}),
    },
  };
};
