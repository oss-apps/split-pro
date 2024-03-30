'use client';
import { signIn } from 'next-auth/react';
import Head from 'next/head';
import { Button } from '~/components/ui/button';
import Image from 'next/image';
import { type GetServerSideProps } from 'next';
import { getServerAuthSession } from '~/server/auth';
import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { env } from '~/env';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '~/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';

const emailSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email' }),
});

const otpSchema = z.object({
  otp: z.string({ required_error: 'OTP is required' }).length(5, { message: 'Invalid OTP' }),
});

export default function Home() {
  const callbackUrl = env.NEXT_PUBLIC_URL;

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

    window.location.href = `/api/auth/callback/email?email=${encodeURIComponent(
      email.toLowerCase(),
    )}&token=${values.otp}${callbackUrl ? `&callbackUrl=${callbackUrl}/balances` : ''}`;
  }

  return (
    <>
      <Head>
        <title>SplitPro: Split Expenses with your friends for free</title>
        <meta name="description" content="SplitPro: Split Expenses with your friends for free" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-full flex-col justify-center">
        <div className="flex -translate-y-1/2 flex-col items-center">
          <div className="mb-10 flex items-center gap-4">
            <p className="text-3xl text-primary">SplitPro</p>
          </div>
          <Button
            className="mx-auto flex w-[300px] items-center gap-2 bg-white hover:bg-gray-100 focus:bg-gray-100"
            onClick={() => signIn('google')}
          >
            <Image
              alt="Google logo"
              loading="lazy"
              height="15"
              width="15"
              id="provider-logo-dark"
              src="https://authjs.dev/img/providers/google.svg"
            />
            Continue with Google
          </Button>
          <div className="mt-6 flex w-[300px]  items-center justify-between gap-2">
            <p className=" z-10 ml-[150px] -translate-x-1/2 bg-background px-4 text-sm">or</p>
            <div className="absolute h-[1px] w-[300px]  bg-gradient-to-r from-zinc-800 via-zinc-300 to-zinc-800"></div>
          </div>
          {emailStatus === 'success' ? (
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
                          <InputOTP maxLength={5} pattern={REGEXP_ONLY_DIGITS_AND_CHARS} {...field}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
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
          )}
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  if (session) {
    return {
      redirect: {
        destination: '/balances',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
