import { type GetServerSideProps } from 'next';

import { env } from '~/env';

const Index = () => null;
export default Index;

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: env.DEFAULT_HOMEPAGE ?? '/home',
    permanent: true,
  },
});
