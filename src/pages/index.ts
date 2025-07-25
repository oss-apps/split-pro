import { type GetServerSideProps } from 'next';

import { env } from '~/env';

export default function Home() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: env.DEFAULT_HOMEPAGE,
      permanent: true,
    },
  };
};
