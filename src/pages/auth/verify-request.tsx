import { type GetServerSideProps, type NextPage } from 'next';
import { getProviders } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { env } from '~/env';
import { customServerSideTranslations } from '~/utils/i18n/server';

const Home: NextPage<{ feedbackEmail: string }> = ({ feedbackEmail }) => {
  const { t } = useTranslation('signin');

  return (
    <>
      <main className="flex h-full flex-col justify-center lg:justify-normal">
        <div className="flex flex-col items-center lg:mt-20">
          <div className="mb-10 flex items-center gap-4">
            <p className="text-primary text-3xl">SplitPro</p>
          </div>
          <p className="mt-6 w-[300px] text-center text-sm">{t('auth.otp_sent')}</p>
          {feedbackEmail && (
            <p className="text-muted-foreground mt-6 w-[300px] text-center text-sm">
              {t('auth.trouble_logging_in')}
              <br />
              <a className="underline" href={'mailto:' + feedbackEmail}>
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
