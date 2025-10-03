import { zodResolver } from '@hookform/resolvers/zod';
import {
  SiAuth0,
  SiAuthelia,
  SiAuthentik,
  SiGithub,
  SiGoogle,
  SiKeycloak,
} from '@icons-pack/react-simple-icons';
import { type GetServerSideProps, type NextPage } from 'next';
import { type ClientSafeProvider, getProviders, signIn } from 'next-auth/react';
import { type TFunction, useTranslation } from 'next-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { LanguageSelector } from '~/components/LanguageSelector';
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
import { env } from '~/env';
import { getServerAuthSession } from '~/server/auth';
import { customServerSideTranslations } from '~/utils/i18n/server';
import VerificationStep from './VerificationStep';

const providerSvgs = {
  github: <SiGithub />,
  google: <SiGoogle />,
  authentik: <SiAuthentik />,
  authelia: <SiAuthelia />,
  auth0: <SiAuth0 />,
  keycloak: <SiKeycloak />,
};

const providerTypeGuard = (providerId: string): providerId is keyof typeof providerSvgs =>
  providerId in providerSvgs;

const emailSchema = (t: TFunction) =>
  z.object({
    email: z
      .string({ required_error: t('errors.email_required') })
      .email({ message: t('errors.email_invalid') }),
  });

type EmailFormValues = z.infer<ReturnType<typeof emailSchema>>;

const Home: NextPage<{
  error: string;
  feedbackEmail: string;
  providers: ClientSafeProvider[];
  callbackUrl?: string;
}> = ({ error, providers, feedbackEmail, callbackUrl }) => {
  const { t } = useTranslation();
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [showVerificationStep, setShowVerificationStep] = useState(false);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema(t)),
    defaultValues: {
      email: '',
    },
  });

  useEffect(() => {
    if (error) {
      if ('SignupDisabled' === error) {
        toast.error(t('errors.signup_disabled'), { duration: 5000 });
      } else if ('SessionRequired' === error) {
        return;
      } else {
        toast.error(t('errors.signin_error') + error);
        console.error('Error during sign-in:', error);
      }
    }
  }, [error, t]);

  const onEmailSubmit = useCallback(async () => {
    setEmailStatus('sending');
    const email = emailForm.getValues().email.toLowerCase();
    setShowVerificationStep(true);
    await signIn('email', { email, callbackUrl, redirect: false });
    setEmailStatus('success');
  }, [emailForm, setShowVerificationStep, callbackUrl]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (showVerificationStep) {
        e.preventDefault();
        setShowVerificationStep(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, [showVerificationStep]);

  const handleProviderSignIn = useCallback(
    (providerId: string) => () => signIn(providerId, { callbackUrl }),
    [callbackUrl],
  );

  const field = useCallback(
    ({ field }: any) => (
      <FormItem>
        <FormControl>
          <Input
            placeholder={t('auth.email_placeholder')}
            className="w-[300px] text-lg"
            type="email"
            {...field}
          />
        </FormControl>
        <FormDescription />
        <FormMessage />
      </FormItem>
    ),
    [t],
  );

  const feedbackEmailLink = useMemo(() => `mailto:${feedbackEmail}`, [feedbackEmail]);

  if (showVerificationStep) {
    return (
      <VerificationStep
        feedbackEmail={feedbackEmail}
        email={emailForm.getValues().email}
        callbackUrl={callbackUrl}
      />
    );
  }

  return (
    <>
      <main className="flex h-full flex-col justify-center lg:justify-normal">
        <div className="flex flex-col items-center lg:mt-20">
          <div className="mb-5 flex items-center gap-4">
            <p className="text-primary text-3xl">{t('meta.application_name')}</p>
          </div>
          <div className="mb-10 flex items-center gap-4">
            <LanguageSelector />
          </div>

          {providers.length === 0 ? (
            <div className="text-muted-foreground flex w-[300px] flex-col items-center gap-4 text-center">
              <p className="text-lg font-semibold">{t('auth.no_providers_configured')}</p>
              <p className="text-sm">
                {t('auth.no_providers_instructions')}{' '}
                <a
                  className="text-primary underline"
                  href="https://github.com/oss-apps/split-pro/blob/main/docker/README.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('auth.setup_instructions')}
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              {providers
                .filter((provider) => 'email' !== provider.id)
                .map((provider) => (
                  <Button
                    className="mx-auto flex w-[300px] items-center gap-3 bg-white hover:bg-gray-100 focus:bg-gray-100"
                    onClick={handleProviderSignIn(provider.id)}
                    key={provider.id}
                  >
                    {providerTypeGuard(provider.id) && providerSvgs[provider.id]}
                    {t('auth.continue_with', { provider: provider.name })}
                  </Button>
                ))}
              {providers && 2 === providers.length && (
                <div className="mt-6 flex w-[300px] items-center justify-between gap-2">
                  <p className="bg-background z-10 ml-[150px] -translate-x-1/2 px-4 text-sm">
                    {t('ui.or')}
                  </p>
                  <div className="absolute h-px w-[300px] bg-linear-to-r from-zinc-800 via-zinc-300 to-zinc-800" />
                </div>
              )}
              {providers.find((provider) => 'email' === provider.id) ? (
                <>
                  <Form {...emailForm}>
                    <form
                      onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                      className="mt-6 space-y-8"
                    >
                      <FormField control={emailForm.control} name="email" render={field} />
                      <Button
                        className="mt-6 w-[300px] bg-white hover:bg-gray-100 focus:bg-gray-100"
                        type="submit"
                        disabled={'sending' === emailStatus}
                      >
                        {'sending' === emailStatus ? t('auth.sending') : t('auth.send_magic_link')}
                      </Button>
                    </form>
                  </Form>
                </>
              ) : null}
            </>
          )}
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

export default Home;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);
  const providers = await getProviders();
  const { callbackUrl, error } = context.query;

  if (session) {
    const redirectUrl = env.DEFAULT_HOMEPAGE == '/home' ? '/balances' : env.DEFAULT_HOMEPAGE;
    const destination = callbackUrl && !Array.isArray(callbackUrl) ? callbackUrl : redirectUrl;

    return {
      redirect: {
        destination: destination ?? '/balances',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(await customServerSideTranslations(context.locale, ['common'])),
      error: typeof error === 'string' ? error : '',
      feedbackEmail: env.FEEDBACK_EMAIL ?? '',
      providers: Object.values(providers ?? {}),
      callbackUrl: callbackUrl && !Array.isArray(callbackUrl) ? callbackUrl : '',
    },
  };
};
