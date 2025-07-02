import { type GetServerSideProps, type NextPage } from 'next';
import { getProviders } from 'next-auth/react';
import Head from 'next/head';

import { env } from '~/env';

const Home: NextPage<{ feedbackEmail: string }> = ({ feedbackEmail }) => (
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
          We have sent an email with the OTP. Please check your inbox and click the link in the
          email to sign in.
        </p>

        <p className="text-muted-foreground mt-6 w-[300px] text-center text-sm">
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
