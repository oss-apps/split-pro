import { type GetServerSideProps } from 'next';

import { env } from '~/env';

export default function Index() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: env.DEFAULT_HOMEPAGE ?? '/home',
    permanent: true,
  },
});
